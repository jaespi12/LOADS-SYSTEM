export function renderDesignBasisView({ designBasis, validation }) {
  if (!designBasis) {
    return `
      <section class="card">
        <h2>Design Basis</h2>
        <p class="muted">No design basis data found in loaded project.</p>
      </section>
    `;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-design-basis">
      <div class="panel-header-row">
        <h2>Design Basis</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>ID</dt><dd>${designBasis.id ?? "—"}</dd></div>
        <div><dt>Name</dt><dd>${designBasis.name ?? "—"}</dd></div>
        <div><dt>Code Set</dt><dd>${designBasis.codeSet ?? "—"}</dd></div>
        <div><dt>Unit System</dt><dd>${designBasis.unitSystem ?? "—"}</dd></div>
        <div><dt>Status</dt><dd>${designBasis.status ?? "—"}</dd></div>
      </dl>
      <p><strong>Notes:</strong> ${designBasis.notes ?? "—"}</p>
    </section>

    <section class="card">
      <h3>Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    <section class="card placeholder-panel">
      <h3>Editing Placeholder</h3>
      <p class="muted">Future milestone: inline editing, controlled form state, and save/revision workflow.</p>
    </section>
  `;
}
