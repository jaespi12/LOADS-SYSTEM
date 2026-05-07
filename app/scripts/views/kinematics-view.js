import { esc, fmtNum } from "../utils/format.js";

function numInput({ index, field, value, step }) {
  const v = typeof value === "number" ? value : "";
  const stepAttr = step != null ? ` step="${step}"` : "";
  return `<input type="number" class="field-input field-num"${stepAttr}
    data-action="mutate-kinematics-entry" data-index="${index}" data-field="${esc(field)}"
    value="${v}">`;
}

function renderEntryRows(entries) {
  if (!entries.length) {
    return `<tr><td colspan="4" class="muted tc">No entries defined.</td></tr>`;
  }
  return entries.map((e, i) => `
    <tr>
      <td>${numInput({ index: i, field: "station", value: e.station })}</td>
      <td>${numInput({ index: i, field: "speed", value: e.speed, step: "0.1" })}</td>
      <td>${numInput({ index: i, field: "cantDeficiency", value: e.cantDeficiency, step: "0.01" })}</td>
      <td>
        <button class="btn btn-danger btn-xs" data-action="remove-kinematics-entry" data-index="${i}" title="Remove entry ${i}">✕</button>
      </td>
    </tr>`).join("");
}

function derivedSummary(entries) {
  if (!entries.length) return null;
  const stations = entries.map((e) => e.station).filter((v) => typeof v === "number");
  const speeds = entries.map((e) => e.speed).filter((v) => typeof v === "number");
  if (!stations.length) return null;
  return {
    count: entries.length,
    minStation: Math.min(...stations),
    maxStation: Math.max(...stations),
    maxSpeed: speeds.length ? Math.max(...speeds) : null,
    minSpeed: speeds.length ? Math.min(...speeds) : null
  };
}

export function renderKinematicsView({ kinematics, validation }) {
  if (!kinematics) {
    return `<section class="card"><h2>Kinematics</h2><p class="muted">No kinematics data loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";
  const entries = kinematics.entries ?? [];
  const summary = derivedSummary(entries);

  return `
    <section class="card panel-kinematics">
      <div class="panel-header-row">
        <h2>Kinematics</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Profile ID</dt><dd>${esc(kinematics.profileId ?? "—")}</dd></div>
        <div><dt>Source</dt><dd>${esc(kinematics.source ?? "—")}</dd></div>
        <div><dt>Revision</dt><dd>${esc(kinematics.revision ?? "—")}</dd></div>
        <div><dt>Entry Count</dt><dd>${entries.length}</dd></div>
      </dl>
    </section>

    ${summary ? `
    <section class="card summary-panel">
      <h3>Profile Summary</h3>
      <dl class="kv-grid">
        <div><dt>Station Range</dt><dd>${fmtNum(summary.minStation)} → ${fmtNum(summary.maxStation)}</dd></div>
        <div><dt>Speed Range</dt><dd>${fmtNum(summary.minSpeed)} → ${fmtNum(summary.maxSpeed)}</dd></div>
        <div><dt>Entry Count</dt><dd>${summary.count}</dd></div>
      </dl>
    </section>` : ""}

    <section class="card">
      <div class="panel-header-row">
        <h3>Entries</h3>
        <button class="btn btn-add btn-sm" data-action="add-kinematics-entry">+ Add Entry</button>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>Speed</th>
              <th>Cant Deficiency</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${renderEntryRows(entries)}</tbody>
        </table>
      </div>
      <p class="field-hint">Blur (click away) to commit each edit.</p>
    </section>

    <section class="card">
      <h3>Kinematics Validation</h3>
      ${validation.errors.length
        ? `<ul class="error-list">${validation.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No schema errors detected.</p>"}
    </section>
  `;
}
