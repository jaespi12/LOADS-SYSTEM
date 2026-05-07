import { esc, fmtNum } from "../utils/format.js";

function numInput({ action, attrs, value, step, cls }) {
  const v = typeof value === "number" ? value : "";
  const stepAttr = step != null ? ` step="${step}"` : "";
  const clsAttr = cls ? ` ${cls}` : "";
  const dataAttrs = Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(" ");
  return `<input type="number" class="field-input field-num${clsAttr}"${stepAttr} ${dataAttrs} value="${v}">`;
}

function textInput({ action, attrs, value }) {
  const dataAttrs = Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(" ");
  return `<input type="text" class="field-input field-text" ${dataAttrs} value="${esc(String(value ?? ""))}">`;
}

function renderAxleRows(axles, sectionIdx) {
  if (!axles.length) {
    return `<tr><td colspan="3" class="muted tc">No axles in this section.</td></tr>`;
  }
  return axles.map((axle, ai) => `
    <tr>
      <td class="tc muted" style="font-size:0.8rem">${ai}</td>
      <td>${numInput({ attrs: { action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": ai, field: "offset" }, value: axle.offset, step: "0.1" })}</td>
      <td>${numInput({ attrs: { action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": ai, field: "load" }, value: axle.load, step: "0.01" })}</td>
      <td>
        <button class="btn btn-danger btn-xs" data-action="remove-axle" data-section-idx="${sectionIdx}" data-axle-idx="${ai}" title="Remove axle ${ai}">✕</button>
      </td>
    </tr>`).join("");
}

function renderSectionBlock(section, sectionIdx) {
  const axles = section.axles ?? [];
  return `
    <div class="section-block">
      <div class="section-block-header">
        <div class="section-meta">
          <span class="section-id">${esc(section.id ?? `SEC-${sectionIdx}`)}</span>
          <span class="field-row-inline">
            Name:
            ${textInput({ attrs: { action: "mutate-train-section", "section-idx": sectionIdx, field: "name" }, value: section.name ?? "" })}
            Length:
            ${numInput({ attrs: { action: "mutate-train-section", "section-idx": sectionIdx, field: "length" }, value: section.length, step: "0.1" })}
          </span>
        </div>
        <button class="btn btn-add btn-xs" data-action="add-axle" data-section-idx="${sectionIdx}">+ Axle</button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th class="tc">#</th><th>Offset</th><th>Load</th><th></th></tr>
        </thead>
        <tbody>${renderAxleRows(axles, sectionIdx)}</tbody>
      </table>
    </div>`;
}

function derivedSummary(train) {
  const sections = train?.sections ?? [];
  const totalLength = sections.reduce((sum, s) => sum + (typeof s.length === "number" ? s.length : 0), 0);
  const totalAxles = sections.reduce((sum, s) => sum + (s.axles?.length ?? 0), 0);
  const totalWheelPairs = Math.floor(totalAxles / 2);
  return { sectionCount: sections.length, totalAxles, totalWheelPairs, totalLength };
}

export function renderTrainView({ train, validation }) {
  if (!train) {
    return `<section class="card"><h2>Train</h2><p class="muted">No train data loaded.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";
  const sections = train.sections ?? [];
  const d = derivedSummary(train);

  return `
    <section class="card panel-train">
      <div class="panel-header-row">
        <h2>Train</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Train ID</dt><dd>${esc(train.trainId ?? "—")}</dd></div>
        <div><dt>Train Name</dt><dd>${esc(train.trainName ?? "—")}</dd></div>
      </dl>
    </section>

    <section class="card summary-panel">
      <h3>Train Summary</h3>
      <dl class="kv-grid">
        <div><dt>Sections</dt><dd>${d.sectionCount}</dd></div>
        <div><dt>Total Axles</dt><dd>${d.totalAxles}</dd></div>
        <div><dt>Wheel Pairs</dt><dd>${d.totalWheelPairs}</dd></div>
        <div><dt>Total Length</dt><dd>${fmtNum(d.totalLength)}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Sections &amp; Axles</h3>
      ${sections.length === 0
        ? `<p class="muted">No sections loaded.</p>`
        : sections.map((s, i) => renderSectionBlock(s, i)).join("")}
      <p class="field-hint">Blur (click away) to commit text and number edits.</p>
    </section>

    <section class="card">
      <h3>Train Validation</h3>
      ${validation.errors.length
        ? `<ul class="error-list">${validation.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No schema errors detected.</p>"}
    </section>
  `;
}
