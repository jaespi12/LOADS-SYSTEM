import { esc, fmtNum } from "../utils/format.js";

function renderMemberList(ids) {
  if (!ids?.length) return "<span class='muted'>—</span>";
  const shown = ids.slice(0, 6).map(esc).join(", ");
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
        <strong>${esc(gc.groupedCaseId)}</strong>
        <span class="status-pill ${status}">${esc(statusLabel)}</span>
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
        <p class="muted">${esc(reason)}</p>
      </section>
    `;
  }

  const summary = groupingResult.summary;
  const conformance = groupedCaseValidation?.valid
    ? "<span class='ok'>All grouped cases conform to schema.</span>"
    : `<ul class="error-list">${(groupedCaseValidation?.errors ?? []).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`;

  return `
    <section class="card panel-grouped-cases">
      <div class="panel-header-row">
        <h3>Grouped Cases</h3>
        <span class="status-pill status-ok">${groupedCases.length} generated</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Rule</dt><dd>${esc(summary.ruleLabel ?? summary.ruleId)} (${esc(summary.ruleId)})</dd></div>
        <div><dt>Source Positions</dt><dd>${summary.sourcePositionCount}</dd></div>
        <div><dt>Grouped Cases</dt><dd>${summary.groupedCaseCount}</dd></div>
      </dl>
      <ul class="grouped-case-list">${groupedCases.map(renderGroupedCaseRow).join("")}</ul>
      <h4>Schema Conformance</h4>
      ${conformance}
    </section>
  `;
}

function renderGeneratorPanel(trainPositions, lookups) {
  if (!trainPositions) return "";
  const tp = trainPositions;
  const refLineOptions = [
    { value: "TRACK_CENTERLINE", label: "Track Centerline" },
    { value: "RAIL_LEFT", label: "Rail Left" },
    { value: "RAIL_RIGHT", label: "Rail Right" }
  ];
  const refLineSelect = refLineOptions.map((o) =>
    `<option value="${esc(o.value)}"${tp.referenceLineType === o.value ? " selected" : ""}>${esc(o.label)}</option>`
  ).join("");

  return `
    <section class="card">
      <h3>Position Generator</h3>
      <div class="form-grid">
        <label class="field-label" for="tp-refline">Reference Line</label>
        <select id="tp-refline" class="field-input"
          data-action="mutate-train-position" data-field="referenceLineType">
          ${refLineSelect}
        </select>

        <label class="field-label" for="tp-start">Start Station</label>
        <input id="tp-start" type="number" class="field-input"
          data-action="mutate-train-position" data-field="startStation"
          value="${tp.startStation ?? ""}">

        <label class="field-label" for="tp-end">End Station</label>
        <input id="tp-end" type="number" class="field-input"
          data-action="mutate-train-position" data-field="endStation"
          value="${tp.endStation ?? ""}">

        <label class="field-label" for="tp-step">Step Length</label>
        <input id="tp-step" type="number" step="0.5" min="0.001" class="field-input"
          data-action="mutate-train-position" data-field="stepLength"
          value="${tp.stepLength ?? ""}">

        <label class="field-label" for="tp-repeat">Repeat Length</label>
        <input id="tp-repeat" type="number" step="0.1" class="field-input"
          data-action="mutate-train-position" data-field="repeatLength"
          value="${tp.repeatLength ?? ""}">
      </div>
      <div style="margin-top:0.75rem">
        <button class="btn btn-primary btn-sm" data-action="regen-train-positions">
          Regenerate Positions
        </button>
        <span class="field-hint" style="margin-left:0.75rem">Current: ${tp.positions?.length ?? 0} positions (P-${String(Math.round(tp.startStation ?? 0)).padStart(3,"0")} … P-${String(Math.round(tp.endStation ?? 0)).padStart(3,"0")})</span>
      </div>
    </section>
  `;
}

export function renderTrainPositionView({ trainPositions, validation, readiness, groupedCases, groupingResult, groupedCaseValidation, lookups }) {
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
        <div><dt>Profile ID</dt><dd>${esc(trainPositions.positionProfileId ?? "—")}</dd></div>
        <div><dt>Train ID</dt><dd>${esc(trainPositions.trainId ?? "—")}</dd></div>
        <div><dt>Reference Line</dt><dd>${esc(trainPositions.referenceLineType ?? "—")}</dd></div>
        <div><dt>Step Length</dt><dd>${fmtNum(trainPositions.stepLength)}</dd></div>
        <div><dt>Start Station</dt><dd>${fmtNum(trainPositions.startStation)}</dd></div>
        <div><dt>End Station</dt><dd>${fmtNum(trainPositions.endStation)}</dd></div>
        <div><dt>Repeat Length</dt><dd>${fmtNum(trainPositions.repeatLength)}</dd></div>
        <div><dt>Position Count</dt><dd>${trainPositions.positions?.length ?? 0}</dd></div>
      </dl>
    </section>

    ${renderGeneratorPanel(trainPositions, lookups)}

    <section class="card">
      <div class="panel-header-row">
        <h3>Grouped-Case Readiness</h3>
        <span class="status-pill ${readinessClass}">${readinessLabel}</span>
      </div>
      ${readiness.blockingIssues.length
        ? `<ul class="error-list">${readiness.blockingIssues.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No blocking readiness issues detected.</p>"}
      ${readiness.warnings.length
        ? `<p><strong>Warnings</strong></p><ul class="warning-list">${readiness.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>`
        : ""}
    </section>

    <section class="card">
      <h3>Train Position Validation</h3>
      ${validation.errors.length
        ? `<ul class="error-list">${validation.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No schema errors detected.</p>"}
    </section>

    ${renderGroupedCasesPanel({ groupedCases, groupingResult, groupedCaseValidation })}
  `;
}
