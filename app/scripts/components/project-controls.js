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

function renderPendingDialog(pendingDialog) {
  if (!pendingDialog) return "";
  const isNew = pendingDialog.type === "new-project";
  const label = isNew ? "New project name" : "Save copy as";
  const placeholder = isNew ? "My Project" : "Project Name (Copy)";
  const confirmAction = isNew ? "new-project-confirm" : "save-as-confirm";
  const cancelAction = isNew ? "new-project-cancel" : "save-as-cancel";
  const defaultName = pendingDialog.defaultName ?? "";

  return `
    <div class="dialog-inline">
      <label class="dialog-label">${esc(label)}:</label>
      <input id="dialog-project-name" type="text" class="field-input dialog-name-input"
        placeholder="${esc(placeholder)}" value="${esc(defaultName)}" autocomplete="off">
      <button class="btn btn-primary btn-sm" data-action="${confirmAction}">Confirm</button>
      <button class="btn btn-sm" data-action="${cancelAction}">Cancel</button>
    </div>
  `;
}

function renderProjectPicker(projectsIndex, currentProjectId) {
  if (!projectsIndex.length) {
    return `<div class="project-picker-empty muted">No saved projects.</div>`;
  }
  const rows = projectsIndex.map((p) => {
    const isActive = p.id === currentProjectId;
    return `
      <div class="project-picker-row${isActive ? " is-active" : ""}">
        <div class="project-picker-meta">
          <span class="project-picker-name">${esc(p.name)}</span>
          <span class="project-picker-date muted">${formatRelative(p.savedAt)}</span>
        </div>
        <div class="project-picker-actions">
          ${isActive
            ? `<span class="nav-tag">open</span>`
            : `<button class="btn btn-sm btn-xs" data-action="select-project" data-project-id="${esc(p.id)}">Open</button>`}
          <button class="btn btn-sm btn-xs" data-action="duplicate-project" data-project-id="${esc(p.id)}" title="Duplicate">⧉</button>
          ${isActive ? "" : `<button class="btn btn-danger btn-xs" data-action="delete-project" data-project-id="${esc(p.id)}" title="Delete">✕</button>`}
        </div>
      </div>`;
  }).join("");

  return `<div class="project-picker-list">${rows}</div>`;
}

export function renderProjectControls(state) {
  const {
    dirty, lastSavedAt, loadedFromStorage, persistenceMessage,
    currentProjectId, projectsIndex, projectPickerOpen, pendingDialog, project
  } = state;

  const projectName = project?.name ?? "Untitled Project";

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
    pillLabel = "Fixtures (unsaved)";
  }

  const messageHtml = persistenceMessage
    ? `<span class="persistence-message ${esc(persistenceMessage.kind ?? "info")}">${esc(persistenceMessage.text)}</span>`
    : "";

  const pickerHtml = projectPickerOpen
    ? `<div class="project-picker">${renderProjectPicker(projectsIndex, currentProjectId)}</div>`
    : "";

  const dialogHtml = pendingDialog ? renderPendingDialog(pendingDialog) : "";

  return `
    <div class="project-controls">
      <div class="project-controls-primary">
        <button class="btn btn-sm project-name-btn" data-action="toggle-project-picker"
          title="Switch project" aria-expanded="${projectPickerOpen}">
          ${esc(projectName)}<span class="picker-caret">${projectPickerOpen ? "▲" : "▼"}</span>
        </button>
        <span class="status-pill ${pillClass}">${esc(pillLabel)}</span>
        ${messageHtml}
      </div>
      ${pickerHtml}
      ${dialogHtml}
      <div class="project-controls-buttons">
        <button class="btn btn-sm" data-action="new-project-start" title="Create a new project">New</button>
        <button class="btn btn-primary btn-sm" data-action="save-project" title="Save project to browser storage">Save</button>
        <button class="btn btn-sm" data-action="save-as-start" title="Save a copy with a new name">Save As</button>
        <button class="btn btn-sm" data-action="export-project" title="Download project as JSON">Export</button>
        <label class="btn btn-sm import-label" title="Import project from JSON file">
          Import
          <input type="file" accept=".json,application/json" data-action="import-project-file" hidden>
        </label>
        ${currentProjectId
          ? `<button class="btn btn-danger btn-sm" data-action="delete-project" data-project-id="${esc(currentProjectId)}" title="Delete current project">Delete</button>`
          : ""}
      </div>
    </div>
  `;
}
