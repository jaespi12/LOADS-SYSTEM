/*
 * Persistence module — multi-project browser-storage adapter for LOADS-SYSTEM.
 *
 * Storage layout (window.localStorage):
 *   LOADS_SYSTEM_PROJECTS_INDEX_v1   → projects index (lightweight metadata list)
 *   LOADS_SYSTEM_PROJECT_{id}_v1     → full project package per project
 *
 * The legacy single-slot key LOADS_SYSTEM_PROJECT_v1 is migrated automatically
 * on first boot via migrateFromLegacySlot().
 *
 * Persisted slice ("project package") contains only user-editable input
 * artifacts. Computed state (groupedCases, validation, schemas, lookups,
 * navRegistry, route) is intentionally NOT persisted — it is recomputed on
 * every load.
 */

const INDEX_KEY = "LOADS_SYSTEM_PROJECTS_INDEX_v1";
const LEGACY_KEY = "LOADS_SYSTEM_PROJECT_v1";
const SLOT_PREFIX = "LOADS_SYSTEM_PROJECT_";
const SLOT_SUFFIX = "_v1";
const SCHEMA_VERSION = 1;

export const PERSISTED_FIELDS = [
  "project",
  "designBasis",
  "geometry",
  "train",
  "kinematics",
  "loadFamilies",
  "trainPositions"
];

// ── ID generation ────────────────────────────────────────────────────────────

export function generateProjectId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function projectSlotKey(id) {
  return `${SLOT_PREFIX}${id}${SLOT_SUFFIX}`;
}

// ── Project package build / apply ────────────────────────────────────────────

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
  if (patch.project && patch.designBasis && !patch.project.designBasis) {
    patch.project = { ...patch.project, designBasis: patch.designBasis };
  }
  return patch;
}

// ── Projects index ────────────────────────────────────────────────────────────

export function loadProjectsIndex() {
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return { ok: true, present: false, index: { projects: [], activeProjectId: null } };
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      present: true,
      index: {
        projects: parsed.projects ?? [],
        activeProjectId: parsed.activeProjectId ?? null
      }
    };
  } catch (err) {
    return { ok: false, present: false, error: err.message, index: { projects: [], activeProjectId: null } };
  }
}

export function saveProjectsIndex(index) {
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Per-project slot ─────────────────────────────────────────────────────────

export function saveProjectToSlot(id, pkg) {
  try {
    window.localStorage.setItem(projectSlotKey(id), JSON.stringify(pkg));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function loadProjectFromSlot(id) {
  try {
    const raw = window.localStorage.getItem(projectSlotKey(id));
    if (!raw) return { ok: true, present: false };
    return { ok: true, present: true, package: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, present: false, error: err.message };
  }
}

export function deleteProjectSlot(id) {
  try {
    window.localStorage.removeItem(projectSlotKey(id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Index helpers ─────────────────────────────────────────────────────────────

export function addToIndex(index, entry) {
  return { ...index, projects: [...index.projects, entry] };
}

export function updateIndexEntry(index, id, updates) {
  return {
    ...index,
    projects: index.projects.map((p) => p.id === id ? { ...p, ...updates } : p)
  };
}

export function removeFromIndex(index, id) {
  return {
    ...index,
    projects: index.projects.filter((p) => p.id !== id),
    activeProjectId: index.activeProjectId === id ? (index.projects.find((p) => p.id !== id)?.id ?? null) : index.activeProjectId
  };
}

// ── Migration: single-slot → multi-project ────────────────────────────────────

export function migrateFromLegacySlot() {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return { migrated: false };
    const pkg = JSON.parse(raw);
    const id = generateProjectId();
    const projectName = pkg.project?.name ?? pkg.designBasis?.name ?? "Imported Project";
    const entry = {
      id,
      name: projectName,
      createdAt: pkg.savedAt ?? new Date().toISOString(),
      savedAt: pkg.savedAt ?? new Date().toISOString()
    };
    const slotResult = saveProjectToSlot(id, pkg);
    if (!slotResult.ok) return { migrated: false, error: slotResult.error };
    const indexResult = saveProjectsIndex({ projects: [entry], activeProjectId: id });
    if (!indexResult.ok) return { migrated: false, error: indexResult.error };
    window.localStorage.removeItem(LEGACY_KEY);
    return { migrated: true, id, name: projectName };
  } catch (err) {
    return { migrated: false, error: err.message };
  }
}

// ── File I/O ─────────────────────────────────────────────────────────────────

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
      try { resolve(JSON.parse(reader.result)); }
      catch (err) { reject(new Error(`Invalid JSON: ${err.message}`)); }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

// Kept for backward compatibility references; no longer the primary save path.
export const PERSISTENCE_KEYS = {
  INDEX_KEY,
  LEGACY_KEY,
  SCHEMA_VERSION,
  PERSISTED_FIELDS
};
