const state = {
  initialized: false,
  lookups: {},
  project: null,
  designBasis: null,
  train: null,
  kinematics: null,
  validation: {
    designBasis: { valid: false, errors: ["Design basis has not been validated yet."] },
    train: { valid: false, errors: ["Train has not been validated yet."] },
    kinematics: { valid: false, errors: ["Kinematics has not been validated yet."] }
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
