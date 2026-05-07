function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
}

function fmtNum(value, fallback = "—") {
  return typeof value === "number" ? String(value) : fallback;
}

function renderMemberList(ids) {
  if (!ids?.length) return "<span class='muted'>—</span>";
  const shown = ids.slice(0, 6).map(escapeHtml).join(", ");
  const more = ids.length > 6 ? ` <span class="muted">…+${ids.length - 6}</span>` : "";
  return shown + more;
}

function renderRepeatRef(ref) {
  if (!ref) return "<span class='muted'>—</span>";
  const repeat = fmtNum(ref.repeatLength);
  if (typeof ref.trainSectionLengthSum !== "number") return `repeat ${repeat}`;
  const flag = ref.consistent === true
    ? "<span class='ok'>matches train length</span>"
    : "<span class='status-bad'>differs from train length</span>";
  return `repeat ${repeat} · sum ${fmtNum(ref.trainSectionLengthSum)} · ${flag}`;
}

function renderGroupedCaseRow(gc) {
  const cov = gc.stationCoverage ?? {};
  const status = gc.readiness?.status === "READY" ? "status-ok" : "status-bad";
  const statusLabel = gc.readiness?.status ?? "UNKNOWN";
  return `
    <li class="grouped-case-item">
      <div class="grouped-case-row-head">
        <strong>${escapeHtml(gc.groupedCaseId)}</strong>
        <span class="status-pill ${status}">${escapeHtml(statusLabel)}</span>
      </div>
      <dl class="kv-grid grouped-case-kv">
        <div><dt>Positions</dt><dd>${gc.positionCount} (${renderMemberList(gc.sourcePositionIds)})</dd></div>
        <div><dt>Head Station Range</dt><dd>${fmtNum(cov.minHeadStation)} → ${fmtNum(cov.maxHeadStation)} (Δ ${fmtNum(cov.spanLength)})</dd></div>
        <div><dt>Tail Station Range</dt><dd>${fmtNum(cov.minTailStation)} → ${fmtNum(cov.maxTailStation)}</dd></div>
        <div><dt>Repeat Reference</dt><dd>${renderRepeatRef(gc.repeatLengthReference)}</dd></div>
      </dl>
    </li>
  `;
}

function renderGroupedCasesPanel({ groupedCases, groupingResult, groupedCaseValidation }) {
  if (!groupingResult || !Array.isArray(groupedCases) || groupedCases.length === 0) {
    const reason = groupingResult?.summary?.skippedReason ?? "Grouped cases will appear here once positions are loaded.";
    return `
      <section class="card">
        <div class="panel-header-row">
          <h3>Grouped Cases</h3>
          <span class="status-pill status-planned">Empty</span>
        </div>
        <p class="muted">${escapeHtml(reason)}</p>
      </section>
    `;
  }

  const summary = groupingResult.summary;
  const conformance = groupedCaseValidation?.valid
    ? "<span class='ok'>All grouped cases conform to schema.</span>"
    : `<ul class="error-list">${(groupedCaseValidation?.errors ?? []).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`;

  return `
    <section class="card panel-grouped-cases">
      <div class="panel-header-row">
        <h3>Grouped Cases</h3>
        <span class="status-pill status-ok">${groupedCases.length} generated</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Rule</dt><dd>${escapeHtml(summary.ruleLabel ?? summary.ruleId)} (${escapeHtml(summary.ruleId)})</dd></div>
        <div><dt>Source Positions</dt><dd>${summary.sourcePositionCount}</dd></div>
        <div><dt>Grouped Cases</dt><dd>${summary.groupedCaseCount}</dd></div>
      </dl>
      <ul class="grouped-case-list">${groupedCases.map(renderGroupedCaseRow).join("")}</ul>
      <h4>Schema Conformance</h4>
      ${conformance}
    </section>
  `;
}

export function renderTrainPositionView({ trainPositions, validation, readiness, groupedCases, groupingResult, groupedCaseValidation }) {
  if (!trainPositions) {
    return `<section class="card"><h2>Train Position / Case Grouping</h2><p class="muted">No train-position profile loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";
  const readinessClass = readiness.valid ? "status-ok" : "status-bad";
  const readinessLabel = readiness.valid ? "Ready" : "Blocked";

  return `
    <section class="card panel-train-position">
      <div class="panel-header-row">
        <h2>Train Position / Case Grouping</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Profile ID</dt><dd>${escapeHtml(trainPositions.positionProfileId ?? "—")}</dd></div>
        <div><dt>Train ID</dt><dd>${escapeHtml(trainPositions.trainId ?? "—")}</dd></div>
        <div><dt>Reference Line</dt><dd>${escapeHtml(trainPositions.referenceLineType ?? "—")}</dd></div>
        <div><dt>Step Length</dt><dd>${fmtNum(trainPositions.stepLength)}</dd></div>
        <div><dt>Start Station</dt><dd>${fmtNum(trainPositions.startStation)}</dd></div>
        <div><dt>End Station</dt><dd>${fmtNum(trainPositions.endStation)}</dd></div>
        <div><dt>Repeat Length</dt><dd>${fmtNum(trainPositions.repeatLength)}</dd></div>
        <div><dt>Entry Count</dt><dd>${trainPositions.positions?.length ?? 0}</dd></div>
      </dl>
    </section>

    <section class="card">
      <div class="panel-header-row">
        <h3>Grouped-Case Readiness</h3>
        <span class="status-pill ${readinessClass}">${readinessLabel}</span>
      </div>
      ${readiness.blockingIssues.length ? `<ul class="error-list">${readiness.blockingIssues.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>` : "<p class='ok'>No blocking readiness issues detected.</p>"}
      ${readiness.warnings.length ? `<p><strong>Warnings</strong></p><ul class="warning-list">${readiness.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>` : ""}
    </section>

    <section class="card">
      <h3>Train Position Validation</h3>
      ${validation.errors.length ? `<ul class="error-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>` : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    ${renderGroupedCasesPanel({ groupedCases, groupingResult, groupedCaseValidation })}
  `;
}
