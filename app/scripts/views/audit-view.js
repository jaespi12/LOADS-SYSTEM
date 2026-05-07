export function renderAuditView() {
  return `
    <section class="card panel-audit">
      <div class="panel-header-row">
        <h2>Audit</h2>
        <span class="status-pill status-planned">Planned</span>
      </div>
      <p class="muted">Audit log of contract edits, validation outcomes, and grouped-case readiness transitions.</p>
      <h3>Planned Capabilities</h3>
      <ul class="section-list">
        <li>Per-section revision history with timestamp and source.</li>
        <li>Validation transition log (valid → invalid, blocking issues opened/closed).</li>
        <li>Grouped-case readiness gate trail.</li>
      </ul>
    </section>
  `;
}
