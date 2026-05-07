/*
 * Wheel-load engine — controlled pre-math stub.
 *
 * Reads the validated input contracts (grouped cases, train, geometry,
 * kinematics, load families, design basis, code-set formula scopes) and
 * emits schema-conformant wheel-load-result objects with all numeric
 * forces, moments, and contributions set to null.
 *
 * Hard rule (per AGENTS.md and docs/design-basis.md):
 *   No engine module may emit a non-null numeric value for a producesField
 *   whose owning formulaId is not in approvedFormulaIds for its scope.
 *
 * This stub enforces that rule by refusing to emit numerics regardless of
 * input. It will be replaced — or its emit branches selectively unlocked —
 * once a formulaId is promoted to APPROVED per docs/load-methodology.md.
 */

const DEFAULT_FORMULA_SCOPE_ID = "WHEEL_LOAD_V0";

const DEFAULT_LOCAL_AXES = Object.freeze({
  longitudinal: "X",
  lateral: "Y",
  vertical: "Z"
});

const NULL_FORCES = Object.freeze({ vertical: null, lateral: null, longitudinal: null });
const NULL_MOMENTS = Object.freeze({ rolling: null, pitching: null, yawing: null });

function lookupScope(codeSets, scopeId) {
  return (codeSets?.formulaScopes ?? []).find((s) => s.id === scopeId) ?? null;
}

function lookupPosition(trainPositions, positionId) {
  return (trainPositions?.positions ?? []).find((p) => p?.positionId === positionId) ?? null;
}

function buildAxleResults(groupedCase, trainPositions, train, loadFamilies) {
  const sections = train?.sections ?? [];
  if (sections.length === 0) return [];

  // Cumulative section start offsets along the train (data layout, not engineering math).
  const sectionStartOffsets = [];
  let cumulative = 0;
  for (const section of sections) {
    sectionStartOffsets.push(cumulative);
    cumulative += section?.length ?? 0;
  }

  const familyIds = (loadFamilies?.families ?? []).map((f) => f?.familyId).filter(Boolean);
  const positionIds = groupedCase?.sourcePositionIds ?? [];

  const axleResults = [];

  for (const positionId of positionIds) {
    const position = lookupPosition(trainPositions, positionId);
    if (!position) continue;
    const headStation = typeof position.headStation === "number" ? position.headStation : 0;

    sections.forEach((section, sectionIndex) => {
      const sectionId = section?.id ?? `SECTION-${sectionIndex}`;
      const axles = section?.axles ?? [];
      const sectionStart = sectionStartOffsets[sectionIndex];

      axles.forEach((axle, axleIndex) => {
        const axleOffset = typeof axle?.offset === "number" ? axle.offset : 0;
        const stationAtAxle = headStation + sectionStart + axleOffset;

        axleResults.push({
          axleResultId: `WL-${groupedCase.groupedCaseId}-${sectionId}-A${axleIndex}-${positionId}`,
          sourceSectionId: sectionId,
          axleIndex,
          sourcePositionId: positionId,
          stationAtAxle,
          localAxes: { ...DEFAULT_LOCAL_AXES },
          forces: { ...NULL_FORCES },
          moments: { ...NULL_MOMENTS },
          contributions: familyIds.map((loadFamilyId) => ({
            loadFamilyId,
            vertical: null,
            lateral: null,
            longitudinal: null
          }))
        });
      });
    });
  }

  return axleResults;
}

function buildReadiness(groupedCase, scopeStatus) {
  const blockingIssues = [...(groupedCase?.readiness?.blockingIssues ?? [])];
  const warnings = [...(groupedCase?.readiness?.warnings ?? [])];

  if (scopeStatus !== "APPROVED") {
    warnings.push(`Formula scope is ${scopeStatus}; numeric outputs are null by contract.`);
    return {
      status: blockingIssues.length === 0 ? "PENDING_APPROVAL" : "BLOCKED",
      blockingIssues,
      warnings
    };
  }

  return {
    status: blockingIssues.length === 0 ? "READY" : "BLOCKED",
    blockingIssues,
    warnings
  };
}

function buildComputationContext(scope, scopeStatus, designBasis, formulaScopeId) {
  return {
    codeSetId: designBasis?.codeSet ?? "UNSPECIFIED",
    designBasisId: designBasis?.id ?? "UNSPECIFIED",
    formulaScopeId: scope?.id ?? formulaScopeId,
    formulaRevision: scopeStatus === "APPROVED" ? (scope?.formulaRevision ?? "R0") : "PENDING",
    unitSystemId: designBasis?.unitSystem ?? "UNSPECIFIED",
    computationStatus: scopeStatus === "APPROVED" ? "APPROVED" : "PENDING_APPROVAL",
    computationNotes: scopeStatus === "APPROVED"
      ? "Wheel-load engine — APPROVED scope. Numeric values populated by approved formulas."
      : "Wheel-load-engine stub. All forces, moments, and contributions are null until WHEEL_LOAD_V0 is APPROVED per docs/design-basis.md."
  };
}

export function buildWheelLoadResults({
  groupedCases = [],
  trainPositions,
  train,
  // Documented inputs reserved for approved-scope evaluation; intentionally
  // unread by the stub so it cannot accidentally produce numerics.
  geometry,
  kinematics,
  loadFamilies,
  designBasis,
  codeSets,
  formulaScopeId = DEFAULT_FORMULA_SCOPE_ID
} = {}) {
  void geometry;
  void kinematics;

  const scope = lookupScope(codeSets, formulaScopeId);
  const scopeStatus = scope?.status ?? "PENDING_APPROVAL";
  const approvedFormulaIds = scope?.approvedFormulaIds ?? [];

  // Hard guard: engine must remain a stub until approvedFormulaIds is populated.
  // Even if a future caller passes a scope marked APPROVED, the engine stays in
  // stub mode unless the approval list is non-empty.
  const stubMode = scopeStatus !== "APPROVED" || approvedFormulaIds.length === 0;
  const effectiveStatus = stubMode ? "PENDING_APPROVAL" : "APPROVED";

  const wheelLoadResults = [];
  const skipped = [];

  for (const groupedCase of groupedCases) {
    const axleResults = buildAxleResults(groupedCase, trainPositions, train, loadFamilies);
    if (axleResults.length === 0) {
      skipped.push({
        groupedCaseId: groupedCase?.groupedCaseId,
        reason: "No source axles available for this grouped case (empty train sections or unmatched positions)."
      });
      continue;
    }

    wheelLoadResults.push({
      resultId: `WL-${groupedCase.groupedCaseId}`,
      groupedCaseId: groupedCase.groupedCaseId,
      trainId: groupedCase.trainId,
      positionProfileId: groupedCase.positionProfileId,
      computationContext: buildComputationContext(scope, effectiveStatus, designBasis, formulaScopeId),
      axleResults,
      envelopeRefs: [],
      readiness: buildReadiness(groupedCase, effectiveStatus)
    });
  }

  return {
    formulaScopeId: scope?.id ?? formulaScopeId,
    formulaScopeStatus: scopeStatus,
    computationStatus: effectiveStatus,
    stubMode,
    approvedFormulaIds,
    wheelLoadResults,
    skipped,
    summary: {
      groupedCaseCount: groupedCases.length,
      resultCount: wheelLoadResults.length,
      skippedCount: skipped.length,
      pendingApproval: stubMode
    }
  };
}
