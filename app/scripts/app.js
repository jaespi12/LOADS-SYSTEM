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

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
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

    case "mutate-train-section": {
      const sIdx = Number(target.dataset.sectionIdx);
      const field = target.dataset.field;
      const raw = target.value.trim();
      const value = field === "length" ? (raw === "" ? null : Number(raw)) : raw;
      const newSections = (state.train.sections ?? []).map((s, i) => i === sIdx ? { ...s, [field]: value } : s);
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
      const raw = target.value.trim();
      const value = raw === "" ? null : Number(raw);
      const newSections = (state.train.sections ?? []).map((s, si) => {
        if (si !== sIdx) return s;
        const newAxles = (s.axles ?? []).map((a, ai) => ai === aIdx ? { ...a, [field]: value } : a);
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

    case "add-axle": {
      const sIdx = Number(target.dataset.sectionIdx);
      const newSections = (state.train.sections ?? []).map((s, si) => {
        if (si !== sIdx) return s;
        return { ...s, axles: [...(s.axles ?? []), { offset: 0, load: 0 }] };
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
  }
}

// ── Event delegation ─────────────────────────────────────────────────────────

function setupEventHandlers() {
  const root = document.querySelector("#app-root");

  // blur fires on number/text inputs after edit is committed
  root.addEventListener("blur", (e) => {
    const action = e.target.dataset?.action;
    if (!action) return;
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") handleAction(action, e.target);
  }, true);

  // change fires immediately on selects and checkboxes
  root.addEventListener("change", (e) => {
    const action = e.target.dataset?.action;
    if (!action) return;
    const tag = e.target.tagName;
    if (tag === "SELECT" || (tag === "INPUT" && e.target.type === "checkbox")) {
      handleAction(action, e.target);
    }
  });

  // click for buttons
  root.addEventListener("click", (e) => {
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
  const requiredFamilyIds = (loadFamilyTypes.families ?? []).filter((f) => f.required).map((f) => f.id);

  const partial = {
    schemas,
    train,
    geometry,
    trainPositions,
    loadFamilies
  };

  const groupedCaseReadiness = validateGroupedCaseReadiness({ train, geometry, trainPositions });
  const groupingResult = buildGroupedCases({ trainPositions, train, readiness: groupedCaseReadiness });
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
    lookups: { codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions },
    project,
    designBasis,
    geometry,
    train,
    kinematics,
    loadFamilies,
    trainPositions,
    groupedCases: groupingResult.groupedCases,
    groupingResult,
    groupedCaseValidation,
    validation: {
      designBasis: validateAgainstSchema(designBasisSchema, designBasis),
      geometry: validateAgainstSchema(geometrySchema, geometry),
      train: validateAgainstSchema(trainSchema, train),
      kinematics: validateAgainstSchema(kinematicsSchema, kinematics),
      loadFamilies: validateAgainstSchema(loadFamilySchema, loadFamilies),
      requiredLoadFamilies: validateRequiredLoadFamilies(loadFamilies, requiredFamilyIds),
      trainPositions: validateAgainstSchema(trainPositionSchema, trainPositions),
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
  const state = getState();
  const { initialized, project, navRegistry, route } = state;

  version.textContent = `v${APP_CONFIG.version}`;

  if (!initialized) {
    root.innerHTML = `
      <aside class="app-sidebar"></aside>
      <div class="app-content">
        <section class="card"><h2>Loading…</h2><p class="muted">Loading nav, lookups, schemas, and example data.</p></section>
      </div>
    `;
    return;
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
render();
bootstrap().catch((error) => {
  const root = document.querySelector("#app-root");
  root.innerHTML = `<aside class="app-sidebar"></aside><div class="app-content"><section class="card error"><h2>Startup Error</h2><pre>${error.message}</pre></section></div>`;
});
