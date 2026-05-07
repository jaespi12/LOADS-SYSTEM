import { APP_CONFIG } from "./config.js";
import { getState, setState, subscribe } from "./store.js";
import { validateAgainstSchema, validateRequiredLoadFamilies, validateGroupedCaseReadiness } from "./utils/validation.js";
import { loadNavRegistry, getCurrentRoute, onRouteChange, isKnownRoute, getDefaultRoute } from "../../shared/nav/nav.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderHomeView, buildPackageSummary } from "./views/home-view.js";
import { renderDesignBasisView } from "./views/design-basis-view.js";
import { renderTrainView } from "./views/train-view.js";
import { renderGeometryView } from "./views/geometry-view.js";
import { renderKinematicsView } from "./views/kinematics-view.js";
import { renderLoadFamilyView } from "./views/load-generator-view.js";
import { renderTrainPositionView } from "./views/case-grouping-view.js";
import { buildGroupedCases } from "./engines/grouping-engine.js";
import { generateTrainPositions } from "./utils/position-generator.js";
import { renderAuditView } from "./views/audit-view.js";
import { renderEnvelopesView } from "./views/envelopes-view.js";
import { renderExportView } from "./views/export-view.js";
import { renderProjectControls } from "./components/project-controls.js";
import {
  buildProjectPackage,
  applyProjectPackage,
  generateProjectId,
  loadProjectsIndex,
  saveProjectsIndex,
  saveProjectToSlot,
  loadProjectFromSlot,
  deleteProjectSlot,
  addToIndex,
  updateIndexEntry,
  removeFromIndex,
  migrateFromLegacySlot,
  downloadAsJson,
  readJsonFile
} from "./utils/persistence.js";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

// ── Field helpers (deep paths + type-aware input reading) ────────────────────

function setDeep(obj, path, value) {
  const parts = String(path).split(".");
  if (parts.length === 1) return { ...obj, [parts[0]]: value };
  const [head, ...rest] = parts;
  const child = obj?.[head] && typeof obj[head] === "object" && !Array.isArray(obj[head]) ? obj[head] : {};
  return { ...obj, [head]: setDeep(child, rest.join("."), value) };
}

function readInputValue(target) {
  if (target.type === "checkbox") return Boolean(target.checked);
  if (target.type === "number") {
    const raw = target.value.trim();
    return raw === "" ? null : Number(raw);
  }
  // text, textarea, select
  return target.value;
}

// ── Fixture snapshots (kept for Reset action) ────────────────────────────────

const fixtureSnapshots = {};

// ── Autosave (debounced) ─────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 1500;
const MUTATION_ACTIONS = new Set([
  "mutate-design-basis",
  "mutate-geometry-station",
  "add-geometry-station",
  "remove-geometry-station",
  "mutate-train",
  "mutate-train-section",
  "mutate-axle",
  "add-train-section",
  "remove-train-section",
  "add-axle",
  "remove-axle",
  "mutate-kinematics-entry",
  "add-kinematics-entry",
  "remove-kinematics-entry",
  "toggle-load-family",
  "mutate-train-position",
  "regen-train-positions"
]);

let autosaveTimer = null;
function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    const st = getState();
    if (!st.dirty || !st.currentProjectId) return;
    const pkg = buildProjectPackage(st);
    const slotResult = saveProjectToSlot(st.currentProjectId, pkg);
    if (!slotResult.ok) {
      setState({ persistenceMessage: { kind: "error", text: `Autosave failed: ${slotResult.error}` } });
      return;
    }
    const updatedIndex = updateIndexEntry(
      { projects: st.projectsIndex, activeProjectId: st.currentProjectId },
      st.currentProjectId,
      { savedAt: pkg.savedAt }
    );
    saveProjectsIndex(updatedIndex);
    setState({
      dirty: false,
      lastSavedAt: pkg.savedAt,
      projectsIndex: updatedIndex.projects,
      persistenceMessage: { kind: "info", text: "Autosaved." }
    });
    setTimeout(() => {
      if (getState().persistenceMessage?.text === "Autosaved.") setState({ persistenceMessage: null });
    }, 2000);
  }, AUTOSAVE_DELAY_MS);
}

// ── Grouped-case recompute helper ────────────────────────────────────────────

function recomputeGroupedCases(st) {
  const schemas = st.schemas;
  const readiness = validateGroupedCaseReadiness({ train: st.train, geometry: st.geometry, trainPositions: st.trainPositions });
  const result = buildGroupedCases({ trainPositions: st.trainPositions, train: st.train, readiness });
  const perCaseVal = result.groupedCases.map((gc) => validateAgainstSchema(schemas.groupedCase, gc));
  const groupedCaseValidation = {
    valid: perCaseVal.every((r) => r.valid),
    errors: perCaseVal.flatMap((r, i) => r.errors.map((e) => `[${result.groupedCases[i].groupedCaseId}] ${e}`))
  };
  return { groupingResult: result, groupedCases: result.groupedCases, groupedCaseValidation, groupedCaseReadiness: readiness };
}

// ── Full recompute (used after Load / Import / Reset) ────────────────────────

function recomputeAllValidation(st) {
  const { schemas, lookups } = st;
  const requiredFamilyIds = (lookups?.loadFamilyTypes?.families ?? []).filter((f) => f.required).map((f) => f.id);
  const gc = recomputeGroupedCases(st);
  return {
    groupingResult: gc.groupingResult,
    groupedCases: gc.groupedCases,
    groupedCaseValidation: gc.groupedCaseValidation,
    validation: {
      designBasis: validateAgainstSchema(schemas.designBasis, st.designBasis),
      geometry: validateAgainstSchema(schemas.geometry, st.geometry),
      train: validateAgainstSchema(schemas.train, st.train),
      kinematics: validateAgainstSchema(schemas.kinematics, st.kinematics),
      loadFamilies: validateAgainstSchema(schemas.loadFamilies, st.loadFamilies),
      requiredLoadFamilies: validateRequiredLoadFamilies(st.loadFamilies, requiredFamilyIds),
      trainPositions: validateAgainstSchema(schemas.trainPositions, st.trainPositions),
      groupedCaseReadiness: gc.groupedCaseReadiness
    }
  };
}

// ── Mutation handlers ─────────────────────────────────────────────────────────

function handleAction(action, target) {
  const state = getState();
  const { schemas, validation } = state;

  switch (action) {

    case "mutate-design-basis": {
      const field = target.dataset.field;
      const value = target.value;
      const newDB = { ...state.designBasis, [field]: value };
      setState({
        designBasis: newDB,
        validation: { ...validation, designBasis: validateAgainstSchema(schemas.designBasis, newDB) }
      });
      break;
    }

    case "mutate-geometry-station": {
      const idx = Number(target.dataset.index);
      const field = target.dataset.field;
      const raw = target.value.trim();
      const value = raw === "" ? null : Number(raw);
      const newStations = (state.geometry.stations ?? []).map((s, i) => i === idx ? { ...s, [field]: value } : s);
      const newGeom = { ...state.geometry, stations: newStations };
      const gc = recomputeGroupedCases({ ...state, geometry: newGeom });
      setState({
        geometry: newGeom,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, geometry: validateAgainstSchema(schemas.geometry, newGeom), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "add-geometry-station": {
      const stations = state.geometry.stations ?? [];
      const lastSt = stations.length ? stations[stations.length - 1].station : 0;
      const newSt = { station: Math.round((lastSt + 25) * 1e6) / 1e6, x: 0, y: 0, z: 0 };
      const newGeom = { ...state.geometry, stations: [...stations, newSt] };
      const gc = recomputeGroupedCases({ ...state, geometry: newGeom });
      setState({
        geometry: newGeom,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, geometry: validateAgainstSchema(schemas.geometry, newGeom), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "remove-geometry-station": {
      const idx = Number(target.dataset.index);
      const newStations = (state.geometry.stations ?? []).filter((_, i) => i !== idx);
      const newGeom = { ...state.geometry, stations: newStations };
      const gc = recomputeGroupedCases({ ...state, geometry: newGeom });
      setState({
        geometry: newGeom,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, geometry: validateAgainstSchema(schemas.geometry, newGeom), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "mutate-train": {
      const field = target.dataset.field;
      const value = readInputValue(target);
      const newTrain = setDeep(state.train ?? {}, field, value);
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "mutate-train-section": {
      const sIdx = Number(target.dataset.sectionIdx);
      const field = target.dataset.field;
      const value = readInputValue(target);
      const newSections = (state.train.sections ?? []).map((s, i) => i === sIdx ? setDeep(s, field, value) : s);
      const newTrain = { ...state.train, sections: newSections };
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "mutate-axle": {
      const sIdx = Number(target.dataset.sectionIdx);
      const aIdx = Number(target.dataset.axleIdx);
      const field = target.dataset.field;
      const value = readInputValue(target);
      const newSections = (state.train.sections ?? []).map((s, si) => {
        if (si !== sIdx) return s;
        const newAxles = (s.axles ?? []).map((a, ai) => ai === aIdx ? setDeep(a, field, value) : a);
        return { ...s, axles: newAxles };
      });
      const newTrain = { ...state.train, sections: newSections };
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "add-train-section": {
      const sections = state.train?.sections ?? [];
      const newId = `SEC-${sections.length + 1}`;
      const newSection = {
        id: newId,
        name: `Section ${sections.length + 1}`,
        type: sections.length === 0 ? "LEAD" : "MIDDLE",
        length: 20,
        gapToNext: 0,
        mass: null,
        centerOfMass: { x: null, y: null, z: null },
        inertia: { Ixx: null, Iyy: null, Izz: null },
        participatesInLoadGen: true,
        dataSource: "MANUAL",
        axles: [{ axleId: `A-${newId}-1`, wheelPairId: `WP-${newId}-1`, offset: 5, load: 0 }]
      };
      const newTrain = { ...state.train, sections: [...sections, newSection] };
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "remove-train-section": {
      const sIdx = Number(target.dataset.sectionIdx);
      const newSections = (state.train?.sections ?? []).filter((_, i) => i !== sIdx);
      const newTrain = { ...state.train, sections: newSections };
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "add-axle": {
      const sIdx = Number(target.dataset.sectionIdx);
      const newSections = (state.train.sections ?? []).map((s, si) => {
        if (si !== sIdx) return s;
        const nextN = (s.axles?.length ?? 0) + 1;
        const newAxle = { axleId: `A-${s.id ?? `SEC-${sIdx}`}-${nextN}`, wheelPairId: null, offset: 0, load: 0 };
        return { ...s, axles: [...(s.axles ?? []), newAxle] };
      });
      const newTrain = { ...state.train, sections: newSections };
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "remove-axle": {
      const sIdx = Number(target.dataset.sectionIdx);
      const aIdx = Number(target.dataset.axleIdx);
      const newSections = (state.train.sections ?? []).map((s, si) => {
        if (si !== sIdx) return s;
        return { ...s, axles: (s.axles ?? []).filter((_, ai) => ai !== aIdx) };
      });
      const newTrain = { ...state.train, sections: newSections };
      const gc = recomputeGroupedCases({ ...state, train: newTrain });
      setState({
        train: newTrain,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, train: validateAgainstSchema(schemas.train, newTrain), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    case "mutate-kinematics-entry": {
      const idx = Number(target.dataset.index);
      const field = target.dataset.field;
      const raw = target.value.trim();
      const value = raw === "" ? null : Number(raw);
      const newEntries = (state.kinematics.entries ?? []).map((e, i) => i === idx ? { ...e, [field]: value } : e);
      const newKin = { ...state.kinematics, entries: newEntries };
      setState({
        kinematics: newKin,
        validation: { ...validation, kinematics: validateAgainstSchema(schemas.kinematics, newKin) }
      });
      break;
    }

    case "add-kinematics-entry": {
      const entries = state.kinematics.entries ?? [];
      const lastSt = entries.length ? entries[entries.length - 1].station : 0;
      const newEntry = { station: lastSt + 25, speed: 0, cantDeficiency: 0 };
      const newKin = { ...state.kinematics, entries: [...entries, newEntry] };
      setState({
        kinematics: newKin,
        validation: { ...validation, kinematics: validateAgainstSchema(schemas.kinematics, newKin) }
      });
      break;
    }

    case "remove-kinematics-entry": {
      const idx = Number(target.dataset.index);
      const newEntries = (state.kinematics.entries ?? []).filter((_, i) => i !== idx);
      const newKin = { ...state.kinematics, entries: newEntries };
      setState({
        kinematics: newKin,
        validation: { ...validation, kinematics: validateAgainstSchema(schemas.kinematics, newKin) }
      });
      break;
    }

    case "toggle-load-family": {
      const familyId = target.dataset.familyId;
      const families = state.loadFamilies?.families ?? [];
      let newFamilies;
      if (target.checked) {
        const already = families.some((f) => f.familyId === familyId);
        newFamilies = already ? families : [...families, { familyId, status: "DRAFT", sourceType: "MANUAL" }];
      } else {
        newFamilies = families.filter((f) => f.familyId !== familyId);
      }
      const newLF = { ...state.loadFamilies, families: newFamilies };
      const requiredFamilyIds = (state.lookups.loadFamilyTypes?.families ?? []).filter((f) => f.required).map((f) => f.id);
      setState({
        loadFamilies: newLF,
        validation: {
          ...validation,
          loadFamilies: validateAgainstSchema(schemas.loadFamilies, newLF),
          requiredLoadFamilies: validateRequiredLoadFamilies(newLF, requiredFamilyIds)
        }
      });
      break;
    }

    case "mutate-train-position": {
      const field = target.dataset.field;
      const raw = target.value.trim();
      const value = ["stepLength", "startStation", "endStation", "repeatLength"].includes(field)
        ? (raw === "" ? null : Number(raw))
        : raw;
      const newTP = { ...state.trainPositions, [field]: value };
      setState({
        trainPositions: newTP,
        validation: { ...validation, trainPositions: validateAgainstSchema(schemas.trainPositions, newTP) }
      });
      break;
    }

    case "regen-train-positions": {
      const tp = state.trainPositions;
      const newTP = generateTrainPositions({
        positionProfileId: tp.positionProfileId,
        trainId: tp.trainId,
        referenceLineType: tp.referenceLineType,
        stepLength: tp.stepLength,
        startStation: tp.startStation,
        endStation: tp.endStation,
        repeatLength: tp.repeatLength
      });
      const gc = recomputeGroupedCases({ ...state, trainPositions: newTP });
      setState({
        trainPositions: newTP,
        groupingResult: gc.groupingResult, groupedCases: gc.groupedCases, groupedCaseValidation: gc.groupedCaseValidation,
        validation: { ...validation, trainPositions: validateAgainstSchema(schemas.trainPositions, newTP), groupedCaseReadiness: gc.groupedCaseReadiness }
      });
      break;
    }

    // ── Persistence actions ──────────────────────────────────────────────

    case "save-project": {
      if (!state.currentProjectId) {
        // No slot yet — create one now
        handleAction("new-project-start", target);
        break;
      }
      const pkg = buildProjectPackage(state);
      const slotResult = saveProjectToSlot(state.currentProjectId, pkg);
      if (!slotResult.ok) {
        setState({ persistenceMessage: { kind: "error", text: `Save failed: ${slotResult.error}` } });
        break;
      }
      const updatedIdx = updateIndexEntry(
        { projects: state.projectsIndex, activeProjectId: state.currentProjectId },
        state.currentProjectId,
        { savedAt: pkg.savedAt }
      );
      saveProjectsIndex(updatedIdx);
      setState({ dirty: false, lastSavedAt: pkg.savedAt, projectsIndex: updatedIdx.projects, persistenceMessage: { kind: "info", text: "Saved." } });
      break;
    }

    case "toggle-project-picker": {
      setState({ projectPickerOpen: !state.projectPickerOpen, pendingDialog: null });
      break;
    }

    case "new-project-start": {
      setState({ pendingDialog: { type: "new-project" }, projectPickerOpen: false });
      break;
    }

    case "new-project-confirm": {
      const name = document.querySelector("#dialog-project-name")?.value?.trim() || "New Project";
      const id = generateProjectId();
      const now = new Date().toISOString();
      const newProject = {
        ...JSON.parse(JSON.stringify(fixtureSnapshots.project)),
        name,
        projectId: id
      };
      const newDesignBasis = { ...JSON.parse(JSON.stringify(fixtureSnapshots.designBasis)), name };
      const merged = {
        ...state,
        project: newProject,
        designBasis: newDesignBasis,
        geometry: JSON.parse(JSON.stringify(fixtureSnapshots.geometry)),
        train: JSON.parse(JSON.stringify(fixtureSnapshots.train)),
        kinematics: JSON.parse(JSON.stringify(fixtureSnapshots.kinematics)),
        loadFamilies: JSON.parse(JSON.stringify(fixtureSnapshots.loadFamilies)),
        trainPositions: JSON.parse(JSON.stringify(fixtureSnapshots.trainPositions))
      };
      const recomputed = recomputeAllValidation(merged);
      const pkg = buildProjectPackage(merged);
      pkg.project = newProject;
      pkg.designBasis = newDesignBasis;
      const entry = { id, name, createdAt: now, savedAt: now };
      const currentIndex = { projects: state.projectsIndex, activeProjectId: id };
      const newIndex = addToIndex(currentIndex, entry);
      newIndex.activeProjectId = id;
      saveProjectToSlot(id, pkg);
      saveProjectsIndex(newIndex);
      setState({
        project: newProject,
        designBasis: newDesignBasis,
        geometry: merged.geometry,
        train: merged.train,
        kinematics: merged.kinematics,
        loadFamilies: merged.loadFamilies,
        trainPositions: merged.trainPositions,
        ...recomputed,
        currentProjectId: id,
        projectsIndex: newIndex.projects,
        pendingDialog: null,
        dirty: false,
        loadedFromStorage: true,
        lastSavedAt: now,
        persistenceMessage: { kind: "info", text: `Created "${name}".` }
      });
      break;
    }

    case "new-project-cancel": {
      setState({ pendingDialog: null });
      break;
    }

    case "save-as-start": {
      const defaultName = `${state.project?.name ?? "Project"} Copy`;
      setState({ pendingDialog: { type: "save-as", defaultName }, projectPickerOpen: false });
      break;
    }

    case "save-as-confirm": {
      const name = document.querySelector("#dialog-project-name")?.value?.trim() || "Project Copy";
      const id = generateProjectId();
      const now = new Date().toISOString();
      const pkg = buildProjectPackage(state);
      pkg.project = { ...pkg.project, name, projectId: id };
      pkg.designBasis = pkg.designBasis ? { ...pkg.designBasis, name } : pkg.designBasis;
      const entry = { id, name, createdAt: now, savedAt: now };
      const currentIndex = { projects: state.projectsIndex, activeProjectId: id };
      const newIndex = addToIndex(currentIndex, entry);
      newIndex.activeProjectId = id;
      saveProjectToSlot(id, pkg);
      saveProjectsIndex(newIndex);
      setState({
        project: pkg.project,
        designBasis: pkg.designBasis,
        currentProjectId: id,
        projectsIndex: newIndex.projects,
        pendingDialog: null,
        dirty: false,
        loadedFromStorage: true,
        lastSavedAt: now,
        persistenceMessage: { kind: "info", text: `Saved as "${name}".` }
      });
      break;
    }

    case "save-as-cancel": {
      setState({ pendingDialog: null });
      break;
    }

    case "select-project": {
      const id = target.dataset.projectId;
      if (!id || id === state.currentProjectId) {
        setState({ projectPickerOpen: false });
        break;
      }
      if (state.dirty) {
        const ok = window.confirm("You have unsaved changes. Switch project anyway?");
        if (!ok) { setState({ projectPickerOpen: false }); break; }
      }
      const loaded = loadProjectFromSlot(id);
      if (!loaded.ok || !loaded.present) {
        setState({ persistenceMessage: { kind: "error", text: `Could not load project ${id}.` }, projectPickerOpen: false });
        break;
      }
      try {
        const patch = applyProjectPackage(loaded.package);
        const merged = { ...state, ...patch };
        const recomputed = recomputeAllValidation(merged);
        const updatedIdx = { projects: state.projectsIndex, activeProjectId: id };
        saveProjectsIndex(updatedIdx);
        setState({
          ...patch,
          ...recomputed,
          currentProjectId: id,
          projectPickerOpen: false,
          dirty: false,
          loadedFromStorage: true,
          lastSavedAt: loaded.package.savedAt ?? null,
          persistenceMessage: { kind: "info", text: `Opened "${patch.project?.name ?? id}".` }
        });
      } catch (err) {
        setState({ persistenceMessage: { kind: "error", text: `Open failed: ${err.message}` }, projectPickerOpen: false });
      }
      break;
    }

    case "duplicate-project": {
      const srcId = target.dataset.projectId;
      const srcEntry = state.projectsIndex.find((p) => p.id === srcId);
      const loaded = loadProjectFromSlot(srcId);
      if (!loaded.ok || !loaded.present) {
        setState({ persistenceMessage: { kind: "error", text: `Could not read project to duplicate.` } });
        break;
      }
      const newId = generateProjectId();
      const now = new Date().toISOString();
      const newName = `${srcEntry?.name ?? "Project"} Copy`;
      const pkg = { ...loaded.package, savedAt: now };
      if (pkg.project) pkg.project = { ...pkg.project, name: newName, projectId: newId };
      if (pkg.designBasis) pkg.designBasis = { ...pkg.designBasis, name: newName };
      const entry = { id: newId, name: newName, createdAt: now, savedAt: now };
      const currentIndex = { projects: state.projectsIndex, activeProjectId: state.currentProjectId };
      const newIndex = addToIndex(currentIndex, entry);
      saveProjectToSlot(newId, pkg);
      saveProjectsIndex(newIndex);
      setState({ projectsIndex: newIndex.projects, persistenceMessage: { kind: "info", text: `Duplicated as "${newName}".` } });
      break;
    }

    case "delete-project": {
      const delId = target.dataset.projectId;
      const delEntry = state.projectsIndex.find((p) => p.id === delId);
      const ok = window.confirm(`Delete project "${delEntry?.name ?? delId}"? This cannot be undone.`);
      if (!ok) break;
      deleteProjectSlot(delId);
      const newIndex = removeFromIndex(
        { projects: state.projectsIndex, activeProjectId: state.currentProjectId },
        delId
      );
      saveProjectsIndex(newIndex);
      const wasCurrent = delId === state.currentProjectId;
      if (wasCurrent) {
        // If there are other projects, open the first one; otherwise fall back to fixtures.
        if (newIndex.projects.length > 0) {
          const nextId = newIndex.projects[0].id;
          const nextLoaded = loadProjectFromSlot(nextId);
          if (nextLoaded.ok && nextLoaded.present) {
            try {
              const patch = applyProjectPackage(nextLoaded.package);
              const merged = { ...state, ...patch };
              const recomputed = recomputeAllValidation(merged);
              saveProjectsIndex({ ...newIndex, activeProjectId: nextId });
              setState({
                ...patch,
                ...recomputed,
                currentProjectId: nextId,
                projectsIndex: newIndex.projects,
                projectPickerOpen: false,
                dirty: false,
                loadedFromStorage: true,
                lastSavedAt: nextLoaded.package.savedAt ?? null,
                persistenceMessage: { kind: "info", text: `Deleted. Opened "${patch.project?.name ?? nextId}".` }
              });
              break;
            } catch { /* fall through to fixture reset */ }
          }
        }
        // No projects left — reset to fixtures
        const merged = {
          ...state,
          project: fixtureSnapshots.project,
          designBasis: fixtureSnapshots.designBasis,
          geometry: fixtureSnapshots.geometry,
          train: fixtureSnapshots.train,
          kinematics: fixtureSnapshots.kinematics,
          loadFamilies: fixtureSnapshots.loadFamilies,
          trainPositions: fixtureSnapshots.trainPositions
        };
        const recomputed = recomputeAllValidation(merged);
        setState({
          project: merged.project, designBasis: merged.designBasis,
          geometry: merged.geometry, train: merged.train, kinematics: merged.kinematics,
          loadFamilies: merged.loadFamilies, trainPositions: merged.trainPositions,
          ...recomputed,
          currentProjectId: null,
          projectsIndex: newIndex.projects,
          projectPickerOpen: false,
          dirty: false,
          loadedFromStorage: false,
          lastSavedAt: null,
          persistenceMessage: { kind: "info", text: "Project deleted. Showing bundled fixtures." }
        });
      } else {
        setState({ projectsIndex: newIndex.projects, persistenceMessage: { kind: "info", text: `Deleted "${delEntry?.name ?? delId}".` } });
      }
      break;
    }

    case "export-project": {
      const pkg = buildProjectPackage(state);
      const projectId = state.project?.projectId ?? "loads-project";
      downloadAsJson(pkg, `${projectId}-${pkg.savedAt.replace(/[:.]/g, "-")}.json`);
      setState({ persistenceMessage: { kind: "info", text: "Exported project package." } });
      break;
    }

    case "import-project-file": {
      const file = target.files?.[0];
      if (!file) break;
      readJsonFile(file).then((parsed) => {
        try {
          const patch = applyProjectPackage(parsed);
          const stNow = getState();
          const merged = { ...stNow, ...patch };
          const recomputed = recomputeAllValidation(merged);
          // Import lands as a new unsaved project — user must Save or Save As to keep it
          setState({
            ...patch,
            ...recomputed,
            currentProjectId: null,
            dirty: true,
            loadedFromStorage: false,
            persistenceMessage: { kind: "info", text: `Imported "${parsed.project?.name ?? "package"}". Click Save to create a new project slot.` }
          });
        } catch (err) {
          setState({ persistenceMessage: { kind: "error", text: `Import failed: ${err.message}` } });
        }
      }).catch((err) => {
        setState({ persistenceMessage: { kind: "error", text: `Import failed: ${err.message}` } });
      });
      target.value = "";
      break;
    }
  }

  if (MUTATION_ACTIONS.has(action)) {
    setState({ dirty: true, persistenceMessage: null, projectPickerOpen: false });
    scheduleAutosave();
  }
}

// ── Event delegation ─────────────────────────────────────────────────────────

function setupEventHandlers() {
  // Listen on document.body so project-controls in the header (outside #app-root) also work
  const target = document.body;

  target.addEventListener("blur", (e) => {
    const action = e.target.dataset?.action;
    if (!action) return;
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") handleAction(action, e.target);
  }, true);

  target.addEventListener("change", (e) => {
    const action = e.target.dataset?.action;
    if (!action) return;
    const tag = e.target.tagName;
    const type = e.target.type;
    if (tag === "SELECT" || (tag === "INPUT" && (type === "checkbox" || type === "file"))) {
      handleAction(action, e.target);
    }
  });

  target.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const tag = btn.tagName;
    if (tag === "BUTTON" || (tag === "INPUT" && btn.type === "button")) {
      handleAction(btn.dataset.action, btn);
    }
  });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  const navRegistry = await loadNavRegistry();

  const [
    codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions,
    designBasisSchema, geometrySchema, trainSchema, kinematicsSchema, loadFamilySchema,
    trainPositionSchema, groupedCaseSchema,
    project, geometry, train, kinematics, loadFamilies, trainPositions
  ] = await Promise.all([
    loadJson(APP_CONFIG.dataPaths.codeSets),
    loadJson(APP_CONFIG.dataPaths.unitSystems),
    loadJson(APP_CONFIG.dataPaths.loadFamilyTypes),
    loadJson(APP_CONFIG.dataPaths.rideStates),
    loadJson(APP_CONFIG.dataPaths.exportTargets),
    loadJson(APP_CONFIG.dataPaths.statusOptions),
    loadJson("shared/schemas/design-basis.schema.json"),
    loadJson("shared/schemas/geometry-station.schema.json"),
    loadJson("shared/schemas/train-section.schema.json"),
    loadJson("shared/schemas/kinematics-profile.schema.json"),
    loadJson("shared/schemas/load-family-profile.schema.json"),
    loadJson("shared/schemas/train-position-profile.schema.json"),
    loadJson("shared/schemas/grouped-case.schema.json"),
    loadJson("app/data/example-project.json"),
    loadJson("app/data/example-geometry.json"),
    loadJson("app/data/example-train.json"),
    loadJson("app/data/example-kinematics.json"),
    loadJson("app/data/example-load-families.json"),
    loadJson("app/data/example-train-positions.json")
  ]);

  const schemas = {
    designBasis: designBasisSchema,
    geometry: geometrySchema,
    train: trainSchema,
    kinematics: kinematicsSchema,
    loadFamilies: loadFamilySchema,
    trainPositions: trainPositionSchema,
    groupedCase: groupedCaseSchema
  };

  const designBasis = project.designBasis ?? null;
  const lookups = { codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions };

  // Snapshot bundled fixtures so Reset can restore them later (deep-clone via JSON)
  fixtureSnapshots.project = JSON.parse(JSON.stringify(project));
  fixtureSnapshots.designBasis = JSON.parse(JSON.stringify(designBasis));
  fixtureSnapshots.geometry = JSON.parse(JSON.stringify(geometry));
  fixtureSnapshots.train = JSON.parse(JSON.stringify(train));
  fixtureSnapshots.kinematics = JSON.parse(JSON.stringify(kinematics));
  fixtureSnapshots.loadFamilies = JSON.parse(JSON.stringify(loadFamilies));
  fixtureSnapshots.trainPositions = JSON.parse(JSON.stringify(trainPositions));

  // ── Migrate legacy single-slot if present ────────────────────────────────
  migrateFromLegacySlot();

  // ── Load project index and resolve active project ─────────────────────────
  const indexResult = loadProjectsIndex();
  const projectsIndex = indexResult.index.projects;
  let activeId = indexResult.index.activeProjectId;

  let activeProject = project;
  let activeDesignBasis = designBasis;
  let activeGeometry = geometry;
  let activeTrain = train;
  let activeKinematics = kinematics;
  let activeLoadFamilies = loadFamilies;
  let activeTrainPositions = trainPositions;
  let lastSavedAt = null;
  let loadedFromStorage = false;
  let persistenceMessage = null;
  let currentProjectId = null;

  if (activeId) {
    const slotResult = loadProjectFromSlot(activeId);
    if (slotResult.ok && slotResult.present) {
      try {
        const patch = applyProjectPackage(slotResult.package);
        activeProject = patch.project ?? activeProject;
        activeDesignBasis = patch.designBasis ?? activeDesignBasis;
        activeGeometry = patch.geometry ?? activeGeometry;
        activeTrain = patch.train ?? activeTrain;
        activeKinematics = patch.kinematics ?? activeKinematics;
        activeLoadFamilies = patch.loadFamilies ?? activeLoadFamilies;
        activeTrainPositions = patch.trainPositions ?? activeTrainPositions;
        lastSavedAt = slotResult.package.savedAt ?? null;
        loadedFromStorage = true;
        currentProjectId = activeId;
        persistenceMessage = { kind: "info", text: `Loaded "${activeProject.name ?? activeId}".` };
      } catch (err) {
        persistenceMessage = { kind: "error", text: `Saved project ignored: ${err.message}` };
        activeId = null;
      }
    } else {
      // Slot missing (deleted externally) — fall back to fixtures
      activeId = null;
      persistenceMessage = { kind: "warn", text: "Saved project slot not found. Showing bundled fixtures." };
    }
  }

  const requiredFamilyIds = (loadFamilyTypes.families ?? []).filter((f) => f.required).map((f) => f.id);
  const groupedCaseReadiness = validateGroupedCaseReadiness({ train: activeTrain, geometry: activeGeometry, trainPositions: activeTrainPositions });
  const groupingResult = buildGroupedCases({ trainPositions: activeTrainPositions, train: activeTrain, readiness: groupedCaseReadiness });
  const perCaseValidation = groupingResult.groupedCases.map((gc) => validateAgainstSchema(groupedCaseSchema, gc));
  const groupedCaseValidation = {
    valid: perCaseValidation.every((r) => r.valid),
    errors: perCaseValidation.flatMap((r, i) => r.errors.map((e) => `[${groupingResult.groupedCases[i].groupedCaseId}] ${e}`))
  };

  setState({
    initialized: true,
    schemas,
    navRegistry,
    route: resolveRoute(getCurrentRoute(), navRegistry),
    lookups,
    project: activeProject,
    designBasis: activeDesignBasis,
    geometry: activeGeometry,
    train: activeTrain,
    kinematics: activeKinematics,
    loadFamilies: activeLoadFamilies,
    trainPositions: activeTrainPositions,
    currentProjectId,
    projectsIndex,
    dirty: false,
    lastSavedAt,
    loadedFromStorage,
    persistenceMessage,
    groupedCases: groupingResult.groupedCases,
    groupingResult,
    groupedCaseValidation,
    validation: {
      designBasis: validateAgainstSchema(designBasisSchema, activeDesignBasis),
      geometry: validateAgainstSchema(geometrySchema, activeGeometry),
      train: validateAgainstSchema(trainSchema, activeTrain),
      kinematics: validateAgainstSchema(kinematicsSchema, activeKinematics),
      loadFamilies: validateAgainstSchema(loadFamilySchema, activeLoadFamilies),
      requiredLoadFamilies: validateRequiredLoadFamilies(activeLoadFamilies, requiredFamilyIds),
      trainPositions: validateAgainstSchema(trainPositionSchema, activeTrainPositions),
      groupedCaseReadiness
    }
  });
}

function resolveRoute(route, registry) {
  if (registry && isKnownRoute(route)) return route;
  return registry ? getDefaultRoute() : route;
}

function renderActiveView(state) {
  const { route, designBasis, geometry, train, kinematics, loadFamilies, trainPositions, validation, lookups, groupedCases, groupingResult, groupedCaseValidation } = state;

  switch (route) {
    case "#/home":
      return renderHomeView({ packageSummary: buildPackageSummary(state) });
    case "#/design-basis":
      return renderDesignBasisView({ designBasis, validation: validation.designBasis, lookups });
    case "#/geometry":
      return renderGeometryView({ geometry, validation: validation.geometry });
    case "#/train":
      return renderTrainView({ train, validation: validation.train });
    case "#/kinematics":
      return renderKinematicsView({ kinematics, validation: validation.kinematics });
    case "#/load-families":
      return renderLoadFamilyView({ loadFamilies, validation: validation.loadFamilies, lookups });
    case "#/train-positions":
      return renderTrainPositionView({
        trainPositions,
        validation: validation.trainPositions,
        readiness: validation.groupedCaseReadiness,
        groupedCases,
        groupingResult,
        groupedCaseValidation,
        lookups
      });
    case "#/audit":
      return renderAuditView();
    case "#/envelopes":
      return renderEnvelopesView();
    case "#/export":
      return renderExportView({ lookups });
    default:
      return renderHomeView({ packageSummary: buildPackageSummary(state) });
  }
}

function render() {
  const root = document.querySelector("#app-root");
  const version = document.querySelector("#app-version");
  const controlsSlot = document.querySelector("#project-controls-slot");
  const state = getState();
  const { initialized, project, navRegistry, route } = state;

  version.textContent = `v${APP_CONFIG.version}`;

  if (!initialized) {
    if (controlsSlot) controlsSlot.innerHTML = "";
    root.innerHTML = `
      <aside class="app-sidebar"></aside>
      <div class="app-content">
        <section class="card"><h2>Loading…</h2><p class="muted">Loading nav, lookups, schemas, and example data.</p></section>
      </div>
    `;
    return;
  }

  if (controlsSlot) {
    controlsSlot.innerHTML = renderProjectControls(state);
  }

  const sidebar = renderSidebar({
    registry: navRegistry,
    activeRoute: route,
    projectName: project?.name,
    projectId: project?.projectId
  });

  root.innerHTML = `${sidebar}<div class="app-content">${renderActiveView(state)}</div>`;
}

onRouteChange((route) => {
  const state = getState();
  setState({ route: resolveRoute(route, state.navRegistry) });
});

subscribe(render);
setupEventHandlers();

// Warn before closing when there are unsaved changes
window.addEventListener("beforeunload", (e) => {
  if (getState().dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

render();
bootstrap().catch((error) => {
  const root = document.querySelector("#app-root");
  root.innerHTML = `<aside class="app-sidebar"></aside><div class="app-content"><section class="card error"><h2>Startup Error</h2><pre>${error.message}</pre></section></div>`;
});
