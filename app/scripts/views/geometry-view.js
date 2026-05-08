import { esc, fmtNum } from "../utils/format.js";

function numInput({ action, index, field, value, step }) {
  const v = typeof value === "number" ? value : "";
  const stepAttr = step != null ? ` step="${step}"` : "";
  return `<input type="number" class="field-input field-num"${stepAttr}
    data-action="${esc(action)}" data-index="${index}" data-field="${esc(field)}"
    value="${v}">`;
}

function renderStationRows(stations) {
  if (!stations.length) {
    return `<tr><td colspan="7" class="muted tc">No stations defined.</td></tr>`;
  }
  return stations.map((s, i) => `
    <tr>
      <td>${numInput({ action: "mutate-geometry-station", index: i, field: "station", value: s.station })}</td>
      <td>${numInput({ action: "mutate-geometry-station", index: i, field: "x", value: s.x, step: "0.01" })}</td>
      <td>${numInput({ action: "mutate-geometry-station", index: i, field: "y", value: s.y, step: "0.01" })}</td>
      <td>${numInput({ action: "mutate-geometry-station", index: i, field: "z", value: s.z, step: "0.01" })}</td>
      <td>${numInput({ action: "mutate-geometry-station", index: i, field: "curveRadius", value: s.curveRadius ?? "", step: "0.01" })}</td>
      <td>
        <button class="btn btn-danger btn-xs" data-action="remove-geometry-station" data-index="${i}" title="Remove station ${i}">✕</button>
      </td>
    </tr>`).join("");
}

function derivedSummary(stations) {
  if (!stations.length) return null;
  const stationVals = stations.map((s) => s.station).filter((v) => typeof v === "number");
  if (!stationVals.length) return null;
  const minSt = Math.min(...stationVals);
  const maxSt = Math.max(...stationVals);
  return { count: stations.length, minStation: minSt, maxStation: maxSt, span: maxSt - minSt };
}

export function renderGeometryView({ geometry, validation }) {
  if (!geometry) {
    return `<section class="card"><h2>Geometry</h2><p class="muted">No geometry data loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";
  const stations = geometry.stations ?? [];
  const summary = derivedSummary(stations);

  return `
    <section class="card panel-geometry">
      <div class="panel-header-row">
        <h2>Geometry</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Geometry ID</dt><dd>${esc(geometry.geometryId ?? "—")}</dd></div>
        <div><dt>Reference Line</dt><dd>${esc(geometry.referenceLineType ?? "—")}</dd></div>
        <div><dt>Station Count</dt><dd>${stations.length}</dd></div>
      </dl>
    </section>

    ${summary ? `
    <section class="card summary-panel">
      <h3>Coverage Summary</h3>
      <dl class="kv-grid">
        <div><dt>Min Station</dt><dd>${fmtNum(summary.minStation)}</dd></div>
        <div><dt>Max Station</dt><dd>${fmtNum(summary.maxStation)}</dd></div>
        <div><dt>Total Span</dt><dd>${fmtNum(summary.span)}</dd></div>
        <div><dt>Station Count</dt><dd>${summary.count}</dd></div>
      </dl>
    </section>` : ""}

    <section class="card">
      <div class="panel-header-row">
        <h3>Stations</h3>
        <button class="btn btn-add btn-sm" data-action="add-geometry-station">+ Add Station</button>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>X</th>
              <th>Y</th>
              <th>Z</th>
              <th>Curve Radius</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${renderStationRows(stations)}</tbody>
        </table>
      </div>
      <p class="field-hint">Blur (click away) to commit each edit. Curve Radius is optional.</p>
    </section>

    <section class="card">
      <h3>Geometry Validation</h3>
      ${validation.errors.length
        ? `<ul class="error-list">${validation.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No schema errors detected.</p>"}
    </section>
  `;
}
