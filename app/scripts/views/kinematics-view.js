function renderEntryRows(entries = []) {
  if (!entries.length) {
    return "<li class='muted'>No kinematics entries available.</li>";
  }

  return entries
    .map(
      (entry, index) =>
        `<li>#${index + 1} · station ${entry.station} · speed ${entry.speed} · cant deficiency ${entry.cantDeficiency}</li>`
    )
    .join("");
}

export function renderKinematicsView({ kinematics, validation }) {
  if (!kinematics) {
    return `<section class="card"><h2>Kinematics</h2><p class="muted">No kinematics data loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-kinematics">
      <div class="panel-header-row">
        <h2>Kinematics</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Profile ID</dt><dd>${kinematics.profileId ?? "—"}</dd></div>
        <div><dt>Source</dt><dd>${kinematics.source ?? "—"}</dd></div>
        <div><dt>Revision</dt><dd>${kinematics.revision ?? "—"}</dd></div>
        <div><dt>Entry Count</dt><dd>${kinematics.entries?.length ?? 0}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Kinematics Entry Summary</h3>
      <ul class="section-list">${renderEntryRows(kinematics.entries)}</ul>
    </section>

    <section class="card">
      <h3>Kinematics Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    <section class="card placeholder-panel">
      <h3>Plotting/Interpolation Placeholder</h3>
      <p class="muted">Future milestone: plotting tools, interpolation profiles, and review overlays.</p>
    </section>
  `;
}
