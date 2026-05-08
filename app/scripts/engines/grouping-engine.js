/*
 * Grouped-case orchestration. Formula-free: groups validated train positions
 * into deterministic grouped-case envelopes. No engineering math.
 *
 * Output conforms to shared/schemas/grouped-case.schema.json.
 */

export const GROUPING_RULES = {
  SINGLE_PASS: {
    id: "SINGLE_PASS",
    label: "Single Pass",
    description: "All positions assembled into one grouped case."
  },
  STEP_WINDOW: {
    id: "STEP_WINDOW",
    label: "Fixed-Step Window",
    description: "Non-overlapping windows of N consecutive positions."
  }
};

export const DEFAULT_RULE_ID = "STEP_WINDOW";
export const DEFAULT_WINDOW_SIZE = 2;

function pad3(n) {
  return String(n).padStart(3, "0");
}

function chunkPositions(positions, windowSize) {
  if (windowSize <= 0) return [positions];
  const out = [];
  for (let i = 0; i < positions.length; i += windowSize) {
    out.push(positions.slice(i, i + windowSize));
  }
  return out;
}

function computeStationCoverage(positions) {
  const heads = positions.map((p) => p?.headStation).filter((v) => typeof v === "number");
  const tails = positions.map((p) => p?.tailStation).filter((v) => typeof v === "number");
  const cov = {
    minHeadStation: heads.length ? Math.min(...heads) : 0,
    maxHeadStation: heads.length ? Math.max(...heads) : 0
  };
  if (tails.length) {
    cov.minTailStation = Math.min(...tails);
    cov.maxTailStation = Math.max(...tails);
  }
  cov.spanLength = cov.maxHeadStation - cov.minHeadStation;
  return cov;
}

function buildRepeatLengthReference(trainPositions, train) {
  const repeatLength = trainPositions?.repeatLength;
  const sum = (train?.sections ?? []).reduce((acc, sec) => acc + (sec?.length ?? 0), 0);
  const ref = { repeatLength: typeof repeatLength === "number" ? repeatLength : 0 };
  if (sum > 0) {
    ref.trainSectionLengthSum = sum;
    if (typeof repeatLength === "number") {
      ref.consistent = repeatLength === sum;
    }
  }
  return ref;
}

function readinessFromGlobal(globalReadiness) {
  const blockingIssues = [...(globalReadiness?.blockingIssues ?? [])];
  const warnings = [...(globalReadiness?.warnings ?? [])];
  return {
    status: blockingIssues.length === 0 ? "READY" : "BLOCKED",
    blockingIssues,
    warnings
  };
}

function makeGroupedCaseId(profileId, ruleId, index) {
  const base = profileId ? `GC-${profileId}` : "GC";
  return `${base}-${ruleId}-${pad3(index + 1)}`;
}

function resolveChunks(positions, ruleId, options) {
  if (ruleId === "SINGLE_PASS") return [positions];
  if (ruleId === "STEP_WINDOW") {
    const requested = Number(options?.windowSize);
    const windowSize = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : DEFAULT_WINDOW_SIZE;
    return chunkPositions(positions, windowSize);
  }
  return [positions];
}

export function buildGroupedCases({ trainPositions, train, readiness, ruleId = DEFAULT_RULE_ID, options = {} } = {}) {
  const ruleKnown = Object.prototype.hasOwnProperty.call(GROUPING_RULES, ruleId);
  const effectiveRuleId = ruleKnown ? ruleId : DEFAULT_RULE_ID;
  const ruleLabel = GROUPING_RULES[effectiveRuleId].label;

  const positions = Array.isArray(trainPositions?.positions) ? trainPositions.positions : [];

  if (positions.length === 0) {
    return {
      groupingRuleId: effectiveRuleId,
      groupingOptions: options,
      groupedCases: [],
      summary: {
        ruleId: effectiveRuleId,
        ruleLabel,
        groupedCaseCount: 0,
        sourcePositionCount: 0,
        skippedReason: "No positions provided to grouping engine."
      }
    };
  }

  const repeatRef = buildRepeatLengthReference(trainPositions, train);
  const chunks = resolveChunks(positions, effectiveRuleId, options);

  const groupedCases = chunks.map((chunk, index) => ({
    groupedCaseId: makeGroupedCaseId(trainPositions.positionProfileId, effectiveRuleId, index),
    groupingRuleId: effectiveRuleId,
    trainId: trainPositions.trainId,
    positionProfileId: trainPositions.positionProfileId,
    sourcePositionIds: chunk.map((p) => p?.positionId).filter(Boolean),
    positionCount: chunk.length,
    stationCoverage: computeStationCoverage(chunk),
    repeatLengthReference: repeatRef,
    readiness: readinessFromGlobal(readiness)
  }));

  return {
    groupingRuleId: effectiveRuleId,
    groupingOptions: options,
    groupedCases,
    summary: {
      ruleId: effectiveRuleId,
      ruleLabel,
      groupedCaseCount: groupedCases.length,
      sourcePositionCount: positions.length
    }
  };
}
