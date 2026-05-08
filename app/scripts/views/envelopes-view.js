export function renderEnvelopesView() {
  return `
    <section class="card panel-envelopes">
      <div class="panel-header-row">
        <h2>Envelopes</h2>
        <span class="status-pill status-planned">Planned</span>
      </div>
      <p class="muted">Envelope outputs for grouped cases. No formulas wired in this milestone.</p>
      <h3>Planned Capabilities</h3>
      <ul class="section-list">
        <li>Per-station max/min envelopes from grouped-case sweeps.</li>
        <li>Position-window superposition summaries.</li>
        <li>Comparative overlays across revisions.</li>
      </ul>
    </section>
  `;
}
