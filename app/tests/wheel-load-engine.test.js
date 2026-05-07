import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateAgainstSchema } from "../scripts/utils/validation.js";
import { buildWheelLoadResults } from "../scripts/engines/wheel-load-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const j = (rel) => JSON.parse(readFileSync(resolve(repoRoot, rel), "utf8"));

const wheelLoadSchema = j("shared/schemas/wheel-load-result.schema.json");
const codeSets = j("shared/data/code-sets.json");
const train = j("app/data/example-train.json");
const geometry = j("app/data/example-geometry.json");
const kinematics = j("app/data/example-kinematics.json");
const trainPositions = j("app/data/example-train-positions.json");
const loadFamilies = j("app/data/example-load-families.json");
const project = j("app/data/example-project.json");
const designBasis = project.designBasis;

const groupedCases = [
  {
    groupedCaseId: "GC-TP-ARC-001-STEP_WINDOW-001",
    groupingRuleId: "STEP_WINDOW",
    trainId: "TRN-001",
    positionProfileId: "TP-ARC-001",
    sourcePositionIds: ["P-000", "P-005"],
    positionCount: 2,
    stationCoverage: { minHeadStation: 0, maxHeadStation: 5, spanLength: 5 },
    repeatLengthReference: { repeatLength: 164, trainSectionLengthSum: 164, consistent: true },
    readiness: { status: "READY", blockingIssues: [], warnings: [] }
  },
  {
    groupedCaseId: "GC-TP-ARC-001-STEP_WINDOW-002",
    groupingRuleId: "STEP_WINDOW",
    trainId: "TRN-001",
    positionProfileId: "TP-ARC-001",
    sourcePositionIds: ["P-010", "P-015"],
    positionCount: 2,
    stationCoverage: { minHeadStation: 10, maxHeadStation: 15, spanLength: 5 },
    repeatLengthReference: { repeatLength: 164, trainSectionLengthSum: 164, consistent: true },
    readiness: { status: "READY", blockingIssues: [], warnings: [] }
  }
];

// One wheel-load result per grouped case; each conforms to the schema.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  assert.equal(out.wheelLoadResults.length, 2);
  for (const result of out.wheelLoadResults) {
    const v = validateAgainstSchema(wheelLoadSchema, result);
    assert.equal(v.valid, true, `wheel-load result failed schema: ${v.errors.join("; ")}`);
  }
}

// Stub mode: scope is PENDING_APPROVAL with empty approvedFormulaIds.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  assert.equal(out.stubMode, true);
  assert.equal(out.computationStatus, "PENDING_APPROVAL");
  assert.deepEqual(out.approvedFormulaIds, []);
  for (const result of out.wheelLoadResults) {
    assert.equal(result.computationContext.computationStatus, "PENDING_APPROVAL");
    assert.equal(result.computationContext.formulaScopeId, "WHEEL_LOAD_V0");
    assert.equal(result.computationContext.formulaRevision, "PENDING");
  }
}

// All numeric forces, moments, and contributions are null.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  for (const result of out.wheelLoadResults) {
    for (const axle of result.axleResults) {
      assert.equal(axle.forces.vertical, null);
      assert.equal(axle.forces.lateral, null);
      assert.equal(axle.forces.longitudinal, null);
      assert.equal(axle.moments.rolling, null);
      assert.equal(axle.moments.pitching, null);
      assert.equal(axle.moments.yawing, null);
      for (const c of axle.contributions ?? []) {
        assert.equal(c.vertical, null);
        assert.equal(c.lateral, null);
        assert.equal(c.longitudinal, null);
      }
    }
  }
}

// Axle-result count = (positions per grouped case) × (axles across all sections).
// Train fixture has 2 sections × 4 axles = 8 axles. Each grouped case above has 2 positions.
// Expect 16 axle results per grouped case.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  for (const result of out.wheelLoadResults) {
    assert.equal(result.axleResults.length, 16);
  }
}

// Default localAxes are right-handed X/Y/Z and per-axle.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  for (const axle of out.wheelLoadResults[0].axleResults) {
    assert.equal(axle.localAxes.longitudinal, "X");
    assert.equal(axle.localAxes.lateral, "Y");
    assert.equal(axle.localAxes.vertical, "Z");
  }
}

// stationAtAxle = headStation + cumulative section start + axle offset
// (deterministic data assembly; not a formula-bearing computation).
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  // First grouped case: P-000 (headStation=0) and P-005 (headStation=5).
  // First axle of SEC-LEAD has offset 8 → stationAtAxle for P-000 should be 0+0+8 = 8.
  const firstAxleP000 = out.wheelLoadResults[0].axleResults.find(
    (a) => a.sourcePositionId === "P-000" && a.sourceSectionId === "SEC-LEAD" && a.axleIndex === 0
  );
  assert.ok(firstAxleP000, "expected P-000 / SEC-LEAD / axleIndex 0");
  assert.equal(firstAxleP000.stationAtAxle, 8);

  // Second section starts at 82 (cumulative). First axle of SEC-TRAIL at offset 8 in P-005:
  // stationAtAxle = 5 + 82 + 8 = 95.
  const trailAxleP005 = out.wheelLoadResults[0].axleResults.find(
    (a) => a.sourcePositionId === "P-005" && a.sourceSectionId === "SEC-TRAIL" && a.axleIndex === 0
  );
  assert.ok(trailAxleP005, "expected P-005 / SEC-TRAIL / axleIndex 0");
  assert.equal(trailAxleP005.stationAtAxle, 95);
}

// resultId is deterministic from groupedCaseId.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  assert.equal(out.wheelLoadResults[0].resultId, "WL-GC-TP-ARC-001-STEP_WINDOW-001");
  assert.equal(out.wheelLoadResults[1].resultId, "WL-GC-TP-ARC-001-STEP_WINDOW-002");
}

// Per-load-family contributions match selected families from loadFamilies fixture.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  const familyIds = (loadFamilies.families ?? []).map((f) => f.familyId);
  for (const axle of out.wheelLoadResults[0].axleResults) {
    const contribFamilies = axle.contributions.map((c) => c.loadFamilyId);
    assert.deepEqual(contribFamilies, familyIds);
  }
}

// Readiness propagates BLOCKED from the grouped case.
{
  const blockedGc = {
    ...groupedCases[0],
    readiness: {
      status: "BLOCKED",
      blockingIssues: ["Geometry data is required for grouped-case readiness."],
      warnings: []
    }
  };
  const out = buildWheelLoadResults({
    groupedCases: [blockedGc], trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  assert.equal(out.wheelLoadResults[0].readiness.status, "BLOCKED");
  assert.ok(out.wheelLoadResults[0].readiness.blockingIssues.length > 0);
}

// Stub-mode warning is added even when grouped-case readiness is READY.
{
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  for (const result of out.wheelLoadResults) {
    assert.equal(result.readiness.status, "PENDING_APPROVAL");
    assert.ok(result.readiness.warnings.some((w) => w.includes("PENDING_APPROVAL")));
  }
}

// Empty groupedCases input → empty result, no skipped entries.
{
  const out = buildWheelLoadResults({
    groupedCases: [], trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  assert.equal(out.wheelLoadResults.length, 0);
  assert.equal(out.skipped.length, 0);
  assert.equal(out.summary.groupedCaseCount, 0);
}

// Train with no axles → grouped case is skipped (cannot satisfy axleResults minItems 1).
{
  const emptyTrain = { ...train, sections: [] };
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train: emptyTrain, geometry, kinematics, loadFamilies, designBasis, codeSets
  });
  assert.equal(out.wheelLoadResults.length, 0);
  assert.equal(out.skipped.length, groupedCases.length);
  assert.ok(out.skipped[0].reason.includes("No source axles"));
}

// Forced approval gate: even if a caller hand-fakes a scope marked APPROVED,
// the engine stays in stub mode while approvedFormulaIds is empty.
{
  const fakeApprovedCodeSets = JSON.parse(JSON.stringify(codeSets));
  const wlScope = fakeApprovedCodeSets.formulaScopes.find((s) => s.id === "WHEEL_LOAD_V0");
  wlScope.status = "APPROVED";          // simulate accidental flip
  wlScope.approvedFormulaIds = [];      // but no formulas approved yet
  const out = buildWheelLoadResults({
    groupedCases, trainPositions, train, geometry, kinematics, loadFamilies, designBasis, codeSets: fakeApprovedCodeSets
  });
  assert.equal(out.stubMode, true);
  assert.equal(out.computationStatus, "PENDING_APPROVAL");
  for (const result of out.wheelLoadResults) {
    assert.equal(result.computationContext.computationStatus, "PENDING_APPROVAL");
    for (const axle of result.axleResults) {
      assert.equal(axle.forces.vertical, null);
    }
  }
}

console.log("wheel-load-engine.test.js passed");
