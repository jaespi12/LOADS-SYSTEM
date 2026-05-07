function renderTargetRow(target) {
  return `<li><strong>${target.id ?? "—"}</strong> — ${target.label ?? "Unlabeled target"}</li>`;
}

export function renderExportView({ lookups } = {}) {
  const targets = lookups?.exportTargets?.targets ?? lookups?.exportTargets?.exportTargets ?? [];
  const targetItems = targets.length
    ? targets.map(renderTargetRow).join("")
    : "<li class=\"muted\">No export targets registered.</li>";

  return `
    <section class="card panel-export">
      <div class="panel-header-row">
        <h2>Export</h2>
        <span class="status-pill status-planned">Planned</span>
      </div>
      <p class="muted">Serialize the validated package into governed export shapes (e.g. RISA).</p>
      <h3>Configured Targets</h3>
      <ul class="section-list">${targetItems}</ul>
      <h3>Planned Capabilities</h3>
      <ul class="section-list">
        <li>JSON download of the current store snapshot.</li>
        <li>RISA-target export aligned with <code>shared/schemas/risa-export.schema.json</code>.</li>
        <li>Per-target readiness gate driven by validation state.</li>
      </ul>
    </section>
  `;
}
