import { APP_CONFIG } from "./config.js";
import { getState, setState, subscribe } from "./store.js";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function bootstrap() {
  const [codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions] = await Promise.all([
    loadJson(APP_CONFIG.dataPaths.codeSets),
    loadJson(APP_CONFIG.dataPaths.unitSystems),
    loadJson(APP_CONFIG.dataPaths.loadFamilyTypes),
    loadJson(APP_CONFIG.dataPaths.rideStates),
    loadJson(APP_CONFIG.dataPaths.exportTargets),
    loadJson(APP_CONFIG.dataPaths.statusOptions)
  ]);

  setState({
    initialized: true,
    lookups: { codeSets, unitSystems, loadFamilyTypes, rideStates, exportTargets, statusOptions }
  });
}

function render() {
  const root = document.querySelector("#app-root");
  const version = document.querySelector("#app-version");
  const { initialized, lookups } = getState();

  version.textContent = `v${APP_CONFIG.version}`;

  if (!initialized) {
    root.innerHTML = `<section class="card"><h2>Loading…</h2></section>`;
    return;
  }

  root.innerHTML = `
    <section class="card">
      <h2>App shell ready</h2>
      <p>Loaded datasets:</p>
      <ul>
        ${Object.keys(lookups).map((k) => `<li>${k}</li>`).join("")}
      </ul>
    </section>
  `;
}

subscribe(render);
render();
bootstrap().catch((error) => {
  const root = document.querySelector("#app-root");
  root.innerHTML = `<section class="card error"><h2>Startup Error</h2><pre>${error.message}</pre></section>`;
});
