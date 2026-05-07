import { esc } from "../utils/format.js";

function formatRelative(timestamp) {
  if (!timestamp) return "never";
  const ms = Date.now() - new Date(timestamp).getTime();
  if (ms < 5000) return "just now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function renderProjectControls(state) {
  const { dirty, lastSavedAt, loadedFromStorage, persistenceMessage } = state;

  let pillClass = "status-ok";
  let pillLabel = "Saved";
  if (dirty) {
    pillClass = "status-bad";
    pillLabel = "Unsaved changes";
  } else if (lastSavedAt) {
    pillClass = "status-ok";
    pillLabel = `Saved ${formatRelative(lastSavedAt)}`;
  } else if (loadedFromStorage) {
    pillClass = "status-ok";
    pillLabel = "Loaded from storage";
  } else {
    pillClass = "status-planned";
    pillLabel = "Fixtures";
  }

  const messageHtml = persistenceMessage
    ? `<span class="persistence-message ${esc(persistenceMessage.kind ?? "info")}">${esc(persistenceMessage.text)}</span>`
    : "";

  return `
    <div class="project-controls">
      <span class="status-pill ${pillClass}">${esc(pillLabel)}</span>
      ${messageHtml}
      <div class="project-controls-buttons">
        <button class="btn btn-primary btn-sm" data-action="save-project" title="Save current project to browser storage">Save</button>
        <button class="btn btn-sm" data-action="reload-project" title="Reload last saved project from browser storage">Reload</button>
        <button class="btn btn-sm" data-action="export-project" title="Download project package as JSON">Export</button>
        <label class="btn btn-sm import-label" title="Import project package from JSON file">
          Import
          <input type="file" accept=".json,application/json" data-action="import-project-file" hidden>
        </label>
        <button class="btn btn-danger btn-sm" data-action="reset-project" title="Reset project to bundled example fixtures">Reset</button>
      </div>
    </div>
  `;
}
