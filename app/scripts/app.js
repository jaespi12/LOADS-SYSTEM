import { APP_CONFIG } from "./config.js";
import { getState, setState, subscribe } from "./store.js";
import { validateAgainstSchema, validateRequiredLoadFamilies, validateGroupedCaseReadiness } from "./utils/validation.js";
import { renderHomeView, buildPackageSummary } from "./views/home-view.js";
import { renderDesignBasisView } from "./views/design-basis-view.js";
import { renderTrainView } from "./views/train-view.js";
import { renderGeometryView } from "./views/geometry-view.js";
import { renderKinematicsView } from "./views/kinematics-view.js";
import { renderLoadFamilyView } from "./views/load-generator-view.js";
import { renderTrainPositionView } from "./views/case-grouping-view.js";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function bootstrap() {
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

function render() {
  const root = document.querySelector("#app-root");
  const version = document.querySelector("#app-version");
  const state = getState();
  const { initialized, project, designBasis, geometry, train, kinematics, loadFamilies, trainPositions, validation, lookups } = state;

  version.textContent = `v${APP_CONFIG.version}`;

  if (!initialized) {
    root.innerHTML = `<section class="card"><h2>Loading…</h2><p class="muted">Loading lookups, schemas, and example data.</p></section>`;
    return;
  }

  const packageSummary = buildPackageSummary(state);

  root.innerHTML = `
    ${renderHomeView({ packageSummary })}
    <section class="card">
      <div class="panel-header-row">
        <h2>Project</h2>
        <span class="muted">${project.projectId ?? "Unknown ID"}</span>
      </div>
      <p><strong>Name:</strong> ${project.name ?? "Unnamed project"}</p>
    </section>
    ${renderDesignBasisView({ designBasis, validation: validation.designBasis, lookups })}
    ${renderGeometryView({ geometry, validation: validation.geometry })}
    ${renderTrainView({ train, validation: validation.train })}
    ${renderKinematicsView({ kinematics, validation: validation.kinematics })}
    ${renderLoadFamilyView({ loadFamilies, validation: validation.loadFamilies, lookups })}
    ${renderTrainPositionView({ trainPositions, validation: validation.trainPositions, readiness: validation.groupedCaseReadiness })}
  `;
}

subscribe(render);
render();
bootstrap().catch((error) => {
  const root = document.querySelector("#app-root");
  root.innerHTML = `<section class="card error"><h2>Startup Error</h2><pre>${error.message}</pre></section>`;
});
