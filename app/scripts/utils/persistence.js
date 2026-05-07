/*
 * Persistence module — browser-storage adapter for LOADS-SYSTEM project packages.
 *
 * Storage backend: window.localStorage
 * Storage key:     LOADS_SYSTEM_PROJECT_v1
 *
 * Persisted slice (a "project package") contains only user-editable input
 * artifacts. Computed state (groupedCases, validation results, schemas,
 * lookups, navRegistry, route) is intentionally NOT persisted — it is
 * recomputed on every load to keep the persisted file engine-agnostic.
 */

const STORAGE_KEY = "LOADS_SYSTEM_PROJECT_v1";
const SCHEMA_VERSION = 1;

const PERSISTED_FIELDS = [
  "project",
  "designBasis",
  "geometry",
  "train",
  "kinematics",
  "loadFamilies",
  "trainPositions"
];

export function buildProjectPackage(state) {
  const pkg = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString()
  };
  for (const key of PERSISTED_FIELDS) {
    pkg[key] = state[key] ?? null;
  }
  return pkg;
}

export function applyProjectPackage(pkg) {
  if (!pkg || typeof pkg !== "object") {
    throw new Error("Project package is empty or not an object.");
  }
  if (pkg.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported project-package schemaVersion: ${pkg.schemaVersion}. Expected ${SCHEMA_VERSION}.`);
  }
  const patch = {};
  for (const key of PERSISTED_FIELDS) {
    if (key in pkg) patch[key] = pkg[key];
  }
  // Keep designBasis consistent with project.designBasis if both present
  if (patch.project && patch.designBasis && !patch.project.designBasis) {
    patch.project = { ...patch.project, designBasis: patch.designBasis };
  }
  return patch;
}

export function saveToStorage(pkg) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pkg));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ok: true, present: false };
    const parsed = JSON.parse(raw);
    return { ok: true, present: true, package: parsed };
  } catch (err) {
    return { ok: false, present: false, error: err.message };
  }
}

export function clearStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function downloadAsJson(pkg, filename) {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `loads-project-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (err) {
        reject(new Error(`Invalid JSON: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

export const PERSISTENCE_KEYS = {
  STORAGE_KEY,
  SCHEMA_VERSION,
  PERSISTED_FIELDS
};
