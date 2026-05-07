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
import { renderAuditView } from "./views/audit-view.js";
import { renderEnvelopesView } from "./views/envelopes-view.js";
import { renderExportView } from "./views/export-view.js";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function bootstrap() {
  const navRegistry = await loadNavRegistry();

  const [codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions, designBasisSchema, geometrySchema, trainSchema, kinematicsSchema, loadFamilySchema, trainPositionSchema, project, geometry, train, kinematics, loadFamilies, trainPositions] = await Promise.all([
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
    loadJson("app/data/example-project.json"),
    loadJson("app/data/example-geometry.json"),
    loadJson("app/data/example-train.json"),
    loadJson("app/data/example-kinematics.json"),
    loadJson("app/data/example-load-families.json"),
    loadJson("app/data/example-train-positions.json")
  ]);

  const designBasis = project.designBasis ?? null;
  const requiredFamilyIds = (loadFamilyTypes.families ?? []).filter((f) => f.required).map((f) => f.id);

  setState({
    initialized: true,
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
    validation: {
      designBasis: validateAgainstSchema(designBasisSchema, designBasis),
      geometry: validateAgainstSchema(geometrySchema, geometry),
      train: validateAgainstSchema(trainSchema, train),
      kinematics: validateAgainstSchema(kinematicsSchema, kinematics),
      loadFamilies: validateAgainstSchema(loadFamilySchema, loadFamilies),
      requiredLoadFamilies: validateRequiredLoadFamilies(loadFamilies, requiredFamilyIds),
      trainPositions: validateAgainstSchema(trainPositionSchema, trainPositions),
      groupedCaseReadiness: validateGroupedCaseReadiness({ train, geometry, trainPositions })
    }
  });
}

function resolveRoute(route, registry) {
  if (registry && isKnownRoute(route)) return route;
  return registry ? getDefaultRoute() : route;
}

function renderActiveView(state) {
  const { route, designBasis, geometry, train, kinematics, loadFamilies, trainPositions, validation, lookups } = state;

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
      return renderTrainPositionView({ trainPositions, validation: validation.trainPositions, readiness: validation.groupedCaseReadiness });
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
render();
bootstrap().catch((error) => {
  const root = document.querySelector("#app-root");
  root.innerHTML = `<aside class="app-sidebar"></aside><div class="app-content"><section class="card error"><h2>Startup Error</h2><pre>${error.message}</pre></section></div>`;
});
