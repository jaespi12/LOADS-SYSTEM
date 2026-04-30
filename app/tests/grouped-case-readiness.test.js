import assert from "node:assert/strict";
import { validateGroupedCaseReadiness } from "../scripts/utils/validation.js";

const baseTrain = {
  sections: [
    { length: 40 },
    { length: 42 }
  ]
};

const baseGeometry = {
  stations: [{ station: 0 }, { station: 50 }]
};

const baseTrainPositions = {
  startStation: 0,
  endStation: 50,
  repeatLength: 82,
  positions: [{ headStation: 0 }, { headStation: 10 }, { headStation: 50 }]
};

{
  const result = validateGroupedCaseReadiness({ train: null, geometry: baseGeometry, trainPositions: baseTrainPositions });
  assert.equal(result.valid, false);
  assert(result.blockingIssues.some((e) => e.includes("Train data")));
}

{
  const result = validateGroupedCaseReadiness({ train: baseTrain, geometry: baseGeometry, trainPositions: { ...baseTrainPositions, startStation: -5 } });
  assert.equal(result.valid, false);
  assert(result.blockingIssues.some((e) => e.includes("startStation")));
}

{
  const result = validateGroupedCaseReadiness({ train: baseTrain, geometry: baseGeometry, trainPositions: { ...baseTrainPositions, repeatLength: 90 } });
  assert.equal(result.valid, true);
  assert(result.warnings.some((w) => w.includes("repeatLength")));
}

console.log("grouped-case-readiness.test.js passed");
