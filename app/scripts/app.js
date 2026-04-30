import { APP_CONFIG } from "./config.js";
import { getState, setState, subscribe } from "./store.js";
import { validateAgainstSchema } from "./utils/validation.js";
import { renderDesignBasisView } from "./views/design-basis-view.js";
import { renderTrainView } from "./views/train-view.js";
import { renderKinematicsView } from "./views/kinematics-view.js";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function bootstrap() {
  const [codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions, designBasisSchema, trainSchema, kinematicsSchema, project, train, kinematics] = await Promise.all([
    loadJson(APP_CONFIG.dataPaths.codeSets),
    loadJson(APP_CONFIG.dataPaths.unitSystems),
    loadJson(APP_CONFIG.dataPaths.loadFamilyTypes),
    loadJson(APP_CONFIG.dataPaths.rideStates),
    loadJson(APP_CONFIG.dataPaths.exportTargets),
    loadJson(APP_CONFIG.dataPaths.statusOptions),
    loadJson("shared/schemas/design-basis.schema.json"),
    loadJson("shared/schemas/train-section.schema.json"),
    loadJson("shared/schemas/kinematics-profile.schema.json"),
    loadJson("app/data/example-project.json"),
    loadJson("app/data/example-train.json"),
    loadJson("app/data/example-kinematics.json")
  ]);

  const designBasis = project.designBasis ?? null;

  setState({
    initialized: true,
    lookups: { codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions },
    project,
    designBasis,
    train,
    kinematics,
    validation: {
      designBasis: validateAgainstSchema(designBasisSchema, designBasis),
      train: validateAgainstSchema(trainSchema, train),
      kinematics: validateAgainstSchema(kinematicsSchema, kinematics)
    }
  });
}

function render() {
  const root = document.querySelector("#app-root");
  const version = document.querySelector("#app-version");
  const { initialized, project, designBasis, train, kinematics, validation, lookups } = getState();

  version.textContent = `v${APP_CONFIG.version}`;

  if (!initialized) {
    root.innerHTML = `<section class="card"><h2>Loading…</h2><p class="muted">Loading lookups, schemas, and example data.</p></section>`;
    return;
  }

  root.innerHTML = `
    <section class="card">
      <div class="panel-header-row">
        <h2>Project</h2>
        <span class="muted">${project.projectId ?? "Unknown ID"}</span>
      </div>
      <p><strong>Name:</strong> ${project.name ?? "Unnamed project"}</p>
    </section>
    ${renderDesignBasisView({ designBasis, validation: validation.designBasis, lookups })}
    ${renderTrainView({ train, validation: validation.train })}
    ${renderKinematicsView({ kinematics, validation: validation.kinematics })}
  `;
}

subscribe(render);
render();
bootstrap().catch((error) => {
  const root = document.querySelector("#app-root");
  root.innerHTML = `<section class="card error"><h2>Startup Error</h2><pre>${error.message}</pre></section>`;
});
