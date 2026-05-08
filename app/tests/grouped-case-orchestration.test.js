import assert from "node:assert/strict";
import { buildGroupedCases, GROUPING_RULES, DEFAULT_RULE_ID } from "../scripts/engines/grouping-engine.js";

const okReadiness = { valid: true, blockingIssues: [], warnings: [] };
const blockedReadiness = {
  valid: false,
  blockingIssues: ["Geometry data is required for grouped-case readiness."],
  warnings: []
};

const trainPositions = {
  positionProfileId: "TP-T",
  trainId: "TRN-1",
  referenceLineType: "TRACK_CENTERLINE",
  stepLength: 5,
  startStation: 0,
  endStation: 20,
  repeatLength: 80,
  positions: [
    { positionId: "P-000", headStation: 0,  tailStation: -80 },
    { positionId: "P-005", headStation: 5,  tailStation: -75 },
    { positionId: "P-010", headStation: 10, tailStation: -70 },
    { positionId: "P-015", headStation: 15, tailStation: -65 },
    { positionId: "P-020", headStation: 20, tailStation: -60 }
  ]
};
const train = { sections: [{ length: 40 }, { length: 40 }] };

// SINGLE_PASS produces one grouped case with all positions
{
  const r = buildGroupedCases({ trainPositions, train, readiness: okReadiness, ruleId: "SINGLE_PASS" });
  assert.equal(r.groupedCases.length, 1);
  assert.equal(r.groupedCases[0].positionCount, 5);
  assert.deepEqual(r.groupedCases[0].sourcePositionIds, ["P-000", "P-005", "P-010", "P-015", "P-020"]);
  assert.equal(r.groupedCases[0].stationCoverage.minHeadStation, 0);
  assert.equal(r.groupedCases[0].stationCoverage.maxHeadStation, 20);
  assert.equal(r.groupedCases[0].stationCoverage.spanLength, 20);
  assert.equal(r.groupedCases[0].stationCoverage.minTailStation, -80);
  assert.equal(r.groupedCases[0].stationCoverage.maxTailStation, -60);
  assert.equal(r.groupedCases[0].readiness.status, "READY");
  assert.equal(r.summary.groupedCaseCount, 1);
  assert.equal(r.summary.sourcePositionCount, 5);
  assert.equal(r.summary.ruleId, "SINGLE_PASS");
}

// STEP_WINDOW with windowSize 2 produces 3 groups [2,2,1]
{
  const r = buildGroupedCases({
    trainPositions,
    train,
    readiness: okReadiness,
    ruleId: "STEP_WINDOW",
    options: { windowSize: 2 }
  });
  assert.equal(r.groupedCases.length, 3);
  assert.deepEqual(r.groupedCases.map((g) => g.positionCount), [2, 2, 1]);
  assert.deepEqual(r.groupedCases[0].sourcePositionIds, ["P-000", "P-005"]);
  assert.deepEqual(r.groupedCases[1].sourcePositionIds, ["P-010", "P-015"]);
  assert.deepEqual(r.groupedCases[2].sourcePositionIds, ["P-020"]);
  assert.equal(r.groupedCases[2].stationCoverage.spanLength, 0);
}

// Grouped case IDs are deterministic and namespaced by profile + rule
{
  const r = buildGroupedCases({
    trainPositions,
    train,
    readiness: okReadiness,
    ruleId: "STEP_WINDOW",
    options: { windowSize: 2 }
  });
  assert.equal(r.groupedCases[0].groupedCaseId, "GC-TP-T-STEP_WINDOW-001");
  assert.equal(r.groupedCases[1].groupedCaseId, "GC-TP-T-STEP_WINDOW-002");
  assert.equal(r.groupedCases[2].groupedCaseId, "GC-TP-T-STEP_WINDOW-003");
}

// repeatLengthReference flags consistency vs. summed train section length
{
  const consistent = buildGroupedCases({
    trainPositions,
    train,
    readiness: okReadiness,
    ruleId: "SINGLE_PASS"
  });
  assert.equal(consistent.groupedCases[0].repeatLengthReference.repeatLength, 80);
  assert.equal(consistent.groupedCases[0].repeatLengthReference.trainSectionLengthSum, 80);
  assert.equal(consistent.groupedCases[0].repeatLengthReference.consistent, true);

  const mismatched = buildGroupedCases({
    trainPositions: { ...trainPositions, repeatLength: 90 },
    train,
    readiness: okReadiness,
    ruleId: "SINGLE_PASS"
  });
  assert.equal(mismatched.groupedCases[0].repeatLengthReference.consistent, false);
  assert.equal(mismatched.groupedCases[0].repeatLengthReference.trainSectionLengthSum, 80);
}

// Blocked global readiness propagates BLOCKED to all grouped cases
{
  const r = buildGroupedCases({
    trainPositions,
    train,
    readiness: blockedReadiness,
    ruleId: "STEP_WINDOW",
    options: { windowSize: 2 }
  });
  for (const gc of r.groupedCases) {
    assert.equal(gc.readiness.status, "BLOCKED");
    assert.ok(gc.readiness.blockingIssues.length > 0);
    assert.ok(gc.readiness.blockingIssues[0].includes("Geometry"));
  }
}

// Empty positions produce zero grouped cases with a recorded skip reason
{
  const r = buildGroupedCases({
    trainPositions: { ...trainPositions, positions: [] },
    train,
    readiness: okReadiness
  });
  assert.equal(r.groupedCases.length, 0);
  assert.equal(r.summary.groupedCaseCount, 0);
  assert.ok(r.summary.skippedReason);
}

// Unknown rule falls back to default rule
{
  const r = buildGroupedCases({
    trainPositions,
    train,
    readiness: okReadiness,
    ruleId: "BOGUS_RULE"
  });
  assert.equal(r.groupingRuleId, DEFAULT_RULE_ID);
  assert.equal(r.summary.ruleId, DEFAULT_RULE_ID);
}

// Default rule is STEP_WINDOW with windowSize 2 over 5 positions → 3 groups
{
  const r = buildGroupedCases({ trainPositions, train, readiness: okReadiness });
  assert.equal(r.groupingRuleId, "STEP_WINDOW");
  assert.equal(r.groupedCases.length, 3);
}

// Rule registry exposes label/description for UI
{
  assert.equal(GROUPING_RULES.SINGLE_PASS.label, "Single Pass");
  assert.equal(GROUPING_RULES.STEP_WINDOW.label, "Fixed-Step Window");
}

console.log("grouped-case-orchestration.test.js passed");
