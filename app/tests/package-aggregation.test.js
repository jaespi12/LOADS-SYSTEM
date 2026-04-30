import assert from "node:assert/strict";
import { buildPackageSummary } from "../scripts/views/home-view.js";

function baseState() {
  return {
    designBasis: {},
    geometry: {},
    train: {},
    kinematics: {},
    loadFamilies: { families: [{ familyId: "DEAD" }, { familyId: "LIVE" }, { familyId: "SEISMIC" }] },
    validation: {
      designBasis: { valid: true, errors: [] },
      geometry: { valid: true, errors: [] },
      train: { valid: true, errors: [] },
      kinematics: { valid: true, errors: [] },
      loadFamilies: { valid: true, errors: [] },
      requiredLoadFamilies: { valid: true, errors: [] }
    }
  };
}

{
  const state = baseState();
  state.geometry = null;
  const summary = buildPackageSummary(state);
  assert.equal(summary.complete, false);
  assert(summary.missingOrInvalid.some((item) => item.includes("Geometry")));
}

{
  const state = baseState();
  state.validation.train = { valid: false, errors: ["train invalid"] };
  const summary = buildPackageSummary(state);
  assert.equal(summary.complete, false);
  assert(summary.missingOrInvalid.some((item) => item.includes("Train")));
}

{
  const state = baseState();
  state.validation.requiredLoadFamilies = { valid: false, errors: ["Missing required load family: SEISMIC"] };
  const summary = buildPackageSummary(state);
  assert.equal(summary.complete, false);
  assert(summary.missingOrInvalid.some((item) => item.includes("SEISMIC")));
}

console.log("package-aggregation.test.js passed");
