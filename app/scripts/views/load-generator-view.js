function labelFromLookup(lookups, familyId) {
  const options = lookups?.loadFamilyTypes?.families ?? [];
  const match = options.find((item) => item.id === familyId);
  return match ? `${match.label} (${match.id})` : familyId;
}

function renderFamilyRows(loadFamilies, lookups) {
  const items = loadFamilies?.families ?? [];
  if (!items.length) return "<li class='muted'>No load families selected.</li>";

  return items
    .map(
      (entry) => `<li><strong>${entry.familyId}</strong> — ${labelFromLookup(lookups, entry.familyId)} · status ${entry.status} · source ${entry.sourceType}</li>`
    )
    .join("");
}

export function renderLoadFamilyView({ loadFamilies, validation, lookups }) {
  if (!loadFamilies) {
    return `<section class="card"><h2>Load Families</h2><p class="muted">No load-family profile loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-load-family">
      <div class="panel-header-row">
        <h2>Load Families</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Family ID(s)</dt><dd>${(loadFamilies.families ?? []).map((f) => f.familyId).join(", ") || "—"}</dd></div>
        <div><dt>Selection Count</dt><dd>${loadFamilies.families?.length ?? 0}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Selection Summary</h3>
      <ul class="section-list">${renderFamilyRows(loadFamilies, lookups)}</ul>
    </section>

    <section class="card">
      <h3>Load Family Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    <section class="card placeholder-panel">
      <h3>Generation Placeholder</h3>
      <p class="muted">Future milestone: family generation rules, train-position sweeps, and case expansion workflow.</p>
    </section>
  `;
}
