export function renderTrainPositionView({ trainPositions, validation }) {
  if (!trainPositions) {
    return `<section class="card"><h2>Train Position / Case Grouping</h2><p class="muted">No train-position profile loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-train-position">
      <div class="panel-header-row">
        <h2>Train Position / Case Grouping</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Profile ID</dt><dd>${trainPositions.positionProfileId ?? "—"}</dd></div>
        <div><dt>Train ID</dt><dd>${trainPositions.trainId ?? "—"}</dd></div>
        <div><dt>Reference Line</dt><dd>${trainPositions.referenceLineType ?? "—"}</dd></div>
        <div><dt>Step Length</dt><dd>${trainPositions.stepLength ?? "—"}</dd></div>
        <div><dt>Start Station</dt><dd>${trainPositions.startStation ?? "—"}</dd></div>
        <div><dt>End Station</dt><dd>${trainPositions.endStation ?? "—"}</dd></div>
        <div><dt>Repeat Length</dt><dd>${trainPositions.repeatLength ?? "—"}</dd></div>
        <div><dt>Entry Count</dt><dd>${trainPositions.positions?.length ?? 0}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Train Position Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    <section class="card placeholder-panel">
      <h3>Grouping/Superposition Placeholder</h3>
      <p class="muted">Future milestone: position grouping windows, superposition rules, and grouped-case assembly.</p>
    </section>
  `;
}
