function renderSectionRows(sections = []) {
  if (!sections.length) {
    return "<li class='muted'>No sections available.</li>";
  }

  return sections
    .map(
      (section) =>
        `<li><strong>${section.id}</strong> — ${section.name} · length ${section.length} · axles ${section.axles?.length ?? 0}</li>`
    )
    .join("");
}

export function renderTrainView({ train, validation }) {
  if (!train) {
    return `<section class="card"><h2>Train</h2><p class="muted">No train data loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-train">
      <div class="panel-header-row">
        <h2>Train</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Train ID</dt><dd>${train.trainId ?? "—"}</dd></div>
        <div><dt>Train Name</dt><dd>${train.trainName ?? "—"}</dd></div>
        <div><dt>Section Count</dt><dd>${train.sections?.length ?? 0}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Section Summary</h3>
      <ul class="section-list">${renderSectionRows(train.sections)}</ul>
    </section>

    <section class="card">
      <h3>Train Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    <section class="card placeholder-panel">
      <h3>Train Section Editing Placeholder</h3>
      <p class="muted">Future milestone: per-section detail editor, axle templates, and revision workflow.</p>
    </section>
  `;
}
