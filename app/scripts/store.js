const state = {
  initialized: false,
  lookups: {},
  project: null,
  designBasis: null,
  validation: {
    designBasis: { valid: false, errors: ["Design basis has not been validated yet."] }
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
