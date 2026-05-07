const state = {
  initialized: false,
  schemas: {},
  lookups: {},
  project: null,
  designBasis: null,
  train: null,
  kinematics: null,
  loadFamilies: null,
  geometry: null,
  trainPositions: null,
  groupedCases: [],
  groupingResult: null,
  groupedCaseValidation: { valid: false, errors: ["Grouped cases have not been generated yet."] },
  validation: {
    designBasis: { valid: false, errors: ["Design basis has not been validated yet."] },
    train: { valid: false, errors: ["Train has not been validated yet."] },
    kinematics: { valid: false, errors: ["Kinematics has not been validated yet."] },
    loadFamilies: { valid: false, errors: ["Load families have not been validated yet."] },
    geometry: { valid: false, errors: ["Geometry has not been validated yet."] },
    requiredLoadFamilies: { valid: false, errors: ["Required load-family check has not run yet."] },
    trainPositions: { valid: false, errors: ["Train-position profile has not been validated yet."] },
    groupedCaseReadiness: {
      valid: false,
      blockingIssues: ["Grouped-case readiness has not been evaluated yet."],
      warnings: []
    }
  }
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
