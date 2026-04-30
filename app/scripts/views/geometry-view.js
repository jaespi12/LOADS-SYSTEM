function getStationRange(stations) {
  if (!stations.length) return "—";
  const values = stations.map((s) => s.station);
  return `${Math.min(...values)} to ${Math.max(...values)}`;
}

export function renderGeometryView({ geometry, validation }) {
  if (!geometry) {
    return `<section class="card"><h2>Geometry</h2><p class="muted">No geometry data loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-geometry">
      <div class="panel-header-row">
        <h2>Geometry</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Geometry ID</dt><dd>${geometry.geometryId ?? "—"}</dd></div>
        <div><dt>Reference Line</dt><dd>${geometry.referenceLineType ?? "—"}</dd></div>
        <div><dt>Station Range</dt><dd>${getStationRange(geometry.stations ?? [])}</dd></div>
        <div><dt>Station Count</dt><dd>${geometry.stations?.length ?? 0}</dd></div>
      </dl>
    </section>
    <section class="card">
      <h3>Geometry Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>
  `;
}
