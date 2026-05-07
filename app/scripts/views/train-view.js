import { esc, fmtNum } from "../utils/format.js";
import { analyzeTrainModel } from "../utils/train-model.js";

const SECTION_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "LEAD", label: "Lead" },
  { value: "MIDDLE", label: "Middle" },
  { value: "TRAILER", label: "Trailer" },
  { value: "BOGIE_FRAME", label: "Bogie Frame" }
];

const DATA_SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "IMPORTED", label: "Imported" },
  { value: "PENDING", label: "Pending" }
];

// ── Input helpers ────────────────────────────────────────────────────────────

function dataAttrs(attrs) {
  return Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(" ");
}

function numInput(attrs, value, step = "any", cls = "") {
  const v = typeof value === "number" ? value : "";
  return `<input type="number" class="field-input field-num ${cls}" step="${step}" ${dataAttrs(attrs)} value="${v}">`;
}

function textInput(attrs, value, cls = "") {
  return `<input type="text" class="field-input field-text ${cls}" ${dataAttrs(attrs)} value="${esc(String(value ?? ""))}">`;
}

function selectInput(attrs, value, options) {
  const opts = options.map((o) =>
    `<option value="${esc(o.value)}"${o.value === (value ?? "") ? " selected" : ""}>${esc(o.label)}</option>`
  ).join("");
  return `<select class="field-input field-select" ${dataAttrs(attrs)}>${opts}</select>`;
}

function checkboxInput(attrs, checked) {
  return `<input type="checkbox" class="field-checkbox" ${dataAttrs(attrs)}${checked ? " checked" : ""}>`;
}

// ── KPI strip (top row) ──────────────────────────────────────────────────────

function renderKpiStrip(train, m, validationValid) {
  const validationLabel = validationValid ? "Valid" : "Invalid";
  const validationClass = validationValid ? "status-ok" : "status-bad";
  return `
    <section class="kpi-strip">
      <div class="kpi-card"><span class="kpi-label">Train ID</span><span class="kpi-value mono">${esc(train.trainId ?? "—")}</span></div>
      <div class="kpi-card"><span class="kpi-label">Vehicle Type</span><span class="kpi-value">${esc(train.vehicleType ?? "—")}</span></div>
      <div class="kpi-card"><span class="kpi-label">Sections</span><span class="kpi-value">${m.sectionCount}</span></div>
      <div class="kpi-card"><span class="kpi-label">Total Axles</span><span class="kpi-value">${m.axleCount}</span></div>
      <div class="kpi-card"><span class="kpi-label">Wheel Pairs</span><span class="kpi-value">${m.wheelPairCount}</span></div>
      <div class="kpi-card"><span class="kpi-label">Train Length</span><span class="kpi-value">${fmtNum(m.totalTrainLength)}</span></div>
      <div class="kpi-card"><span class="kpi-label">First → Last Wheel</span><span class="kpi-value">${fmtNum(m.firstToLastWheelDistance)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Schema</span><span class="status-pill ${validationClass}">${validationLabel}</span></div>
    </section>`;
}

// ── Train metadata block ─────────────────────────────────────────────────────

function renderTrainMetaBlock(train) {
  return `
    <section class="card panel-train">
      <h3>Train Metadata</h3>
      <div class="form-grid form-grid-train">
        <label class="field-label" for="train-id">Train ID</label>
        ${textInput({ action: "mutate-train", field: "trainId" }, train.trainId)}

        <label class="field-label" for="train-name">Train Name</label>
        ${textInput({ action: "mutate-train", field: "trainName" }, train.trainName)}

        <label class="field-label" for="train-vt">Vehicle Type</label>
        ${textInput({ action: "mutate-train", field: "vehicleType" }, train.vehicleType ?? "")}

        <label class="field-label" for="train-notes">Notes</label>
        <textarea class="field-input field-textarea" rows="2" ${dataAttrs({ action: "mutate-train", field: "notes" })}>${esc(train.notes ?? "")}</textarea>
      </div>
    </section>`;
}

// ── Section card ─────────────────────────────────────────────────────────────

function renderAxleRow(axle, sectionIdx, axleIdx) {
  return `
    <tr>
      <td class="tc muted mono small">${axleIdx}</td>
      <td>${textInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "axleId" }, axle.axleId ?? "")}</td>
      <td>${numInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "offset" }, axle.offset, "0.001")}</td>
      <td>${numInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "load" }, axle.load, "0.001")}</td>
      <td>${textInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "wheelPairId" }, axle.wheelPairId ?? "")}</td>
      <td>${numInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "gauge" }, axle.gauge, "0.001")}</td>
      <td>${textInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "leftWheelId" }, axle.leftWheelId ?? "")}</td>
      <td>${textInput({ action: "mutate-axle", "section-idx": sectionIdx, "axle-idx": axleIdx, field: "rightWheelId" }, axle.rightWheelId ?? "")}</td>
      <td><button class="btn btn-danger btn-xs" data-action="remove-axle" data-section-idx="${sectionIdx}" data-axle-idx="${axleIdx}" title="Remove axle">✕</button></td>
    </tr>`;
}

function renderSectionCard(section, idx, info) {
  const axles = section.axles ?? [];
  return `
    <article class="section-card">
      <header class="section-card-header">
        <div class="section-card-title">
          <span class="section-id mono">${esc(section.id ?? `SEC-${idx}`)}</span>
          <span class="section-card-pos muted small">@ start ${fmtNum(info.sectionStart)} → ${fmtNum(info.sectionEnd)}</span>
        </div>
        <div class="section-card-controls">
          <button class="btn btn-add btn-xs" data-action="add-axle" data-section-idx="${idx}">+ Axle</button>
          <button class="btn btn-danger btn-xs" data-action="remove-train-section" data-section-idx="${idx}" title="Remove section">✕</button>
        </div>
      </header>

      <div class="section-card-body">
        <details open>
          <summary>Section Geometry</summary>
          <div class="form-grid form-grid-section">
            <label class="field-label">ID</label>
            ${textInput({ action: "mutate-train-section", "section-idx": idx, field: "id" }, section.id ?? "")}
            <label class="field-label">Name</label>
            ${textInput({ action: "mutate-train-section", "section-idx": idx, field: "name" }, section.name ?? "")}
            <label class="field-label">Type</label>
            ${selectInput({ action: "mutate-train-section", "section-idx": idx, field: "type" }, section.type ?? "", SECTION_TYPE_OPTIONS)}
            <label class="field-label">Length</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "length" }, section.length, "0.001")}
            <label class="field-label">Gap to Next</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "gapToNext" }, section.gapToNext ?? 0, "0.001")}
          </div>
        </details>

        <details open>
          <summary>Axle / Wheel-Pair Layout (${axles.length})</summary>
          <div class="table-scroll">
            <table class="data-table data-table-axles">
              <thead>
                <tr>
                  <th class="tc">#</th>
                  <th>Axle ID</th>
                  <th>Offset</th>
                  <th>Load</th>
                  <th>Wheel Pair</th>
                  <th>Gauge</th>
                  <th>Left Wheel</th>
                  <th>Right Wheel</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${axles.length === 0
                  ? `<tr><td colspan="9" class="muted tc">No axles in this section.</td></tr>`
                  : axles.map((a, ai) => renderAxleRow(a, idx, ai)).join("")}
              </tbody>
            </table>
          </div>
        </details>

        <details>
          <summary>Mass &amp; Inertia Model (BEL/Stengel placeholders)</summary>
          <div class="form-grid form-grid-section">
            <label class="field-label">Mass</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "mass" }, section.mass, "0.001")}
            <label class="field-label">Data Source</label>
            ${selectInput({ action: "mutate-train-section", "section-idx": idx, field: "dataSource" }, section.dataSource ?? "PENDING", DATA_SOURCE_OPTIONS)}

            <label class="field-label">CoM Offset (X)</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "centerOfMass.x" }, section.centerOfMass?.x, "0.001")}
            <label class="field-label">CoM Offset (Y)</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "centerOfMass.y" }, section.centerOfMass?.y, "0.001")}
            <label class="field-label">CoM Offset (Z)</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "centerOfMass.z" }, section.centerOfMass?.z, "0.001")}

            <label class="field-label">Iₓₓ (Roll)</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "inertia.Ixx" }, section.inertia?.Ixx, "0.001")}
            <label class="field-label">Iᵧᵧ (Pitch)</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "inertia.Iyy" }, section.inertia?.Iyy, "0.001")}
            <label class="field-label">Iᵤᵤ (Yaw)</label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "inertia.Izz" }, section.inertia?.Izz, "0.001")}

            <label class="field-label">Participates in Load Gen?</label>
            <div class="field-checkbox-wrap">
              ${checkboxInput({ action: "mutate-train-section", "section-idx": idx, field: "participatesInLoadGen" }, section.participatesInLoadGen !== false)}
              <span class="muted small">When unchecked, this section is excluded from wheel-load assembly (placeholder until math approval).</span>
            </div>
          </div>
        </details>
      </div>
    </article>`;
}

// ── Right-column panels ──────────────────────────────────────────────────────

function renderDerivedPanel(m) {
  return `
    <section class="card summary-panel">
      <h3>Derived Train Geometry</h3>
      <dl class="kv-grid kv-grid-tight">
        <div><dt>Section Length Σ</dt><dd>${fmtNum(m.sectionLengthSum)}</dd></div>
        <div><dt>Inter-section Gap Σ</dt><dd>${fmtNum(m.interSectionGapSum)}</dd></div>
        <div><dt>Total Train Length</dt><dd>${fmtNum(m.totalTrainLength)}</dd></div>
        <div><dt>First → Last Wheel</dt><dd>${fmtNum(m.firstToLastWheelDistance)}</dd></div>
        <div><dt>Axle Count</dt><dd>${m.axleCount}</dd></div>
        <div><dt>Wheel Pair Count</dt><dd>${m.wheelPairCount}</dd></div>
      </dl>
      <h4 class="subhead">Cumulative Section Starts</h4>
      <table class="data-table data-table-tight">
        <thead><tr><th>Section</th><th>Start</th><th>End</th><th>Gap</th></tr></thead>
        <tbody>
          ${m.sections.map((s) => `
            <tr>
              <td class="mono">${esc(s.id)}</td>
              <td>${fmtNum(s.sectionStart)}</td>
              <td>${fmtNum(s.sectionEnd)}</td>
              <td>${fmtNum(s.gapToNext)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </section>`;
}

function renderValidationPanel(validation, modelWarnings) {
  const blocking = modelWarnings.filter((w) => w.severity === "blocking");
  const info = modelWarnings.filter((w) => w.severity === "info");
  const schemaErrors = validation.errors ?? [];

  return `
    <section class="card">
      <h3>Validation &amp; Readiness</h3>
      ${schemaErrors.length === 0 && blocking.length === 0
        ? `<p class="ok">No blocking issues.</p>`
        : ""}
      ${schemaErrors.length > 0 ? `
        <h4 class="subhead">Schema Errors (${schemaErrors.length})</h4>
        <ul class="error-list">${schemaErrors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${blocking.length > 0 ? `
        <h4 class="subhead">Engineering Warnings — Blocking</h4>
        <ul class="error-list">${blocking.map((w) => `<li><span class="mono small muted">${esc(w.scope)}</span> ${esc(w.message)}</li>`).join("")}</ul>` : ""}
      ${info.length > 0 ? `
        <h4 class="subhead">Engineering Warnings — Info / Pending</h4>
        <ul class="warning-list">${info.map((w) => `<li><span class="mono small muted">${esc(w.scope)}</span> ${esc(w.message)}</li>`).join("")}</ul>` : ""}
    </section>`;
}

function renderMassInertiaSummary(m) {
  return `
    <section class="card">
      <h3>Mass &amp; Inertia Summary</h3>
      <table class="data-table data-table-tight">
        <thead>
          <tr><th>Section</th><th>Mass</th><th>CoM (x,y,z)</th><th>Source</th></tr>
        </thead>
        <tbody>
          ${m.sections.map((s) => {
            const com = s.centerOfMass ?? {};
            const comStr = `${fmtNum(com.x)}, ${fmtNum(com.y)}, ${fmtNum(com.z)}`;
            return `
              <tr>
                <td class="mono">${esc(s.id)}</td>
                <td>${fmtNum(s.mass)}</td>
                <td class="small">${esc(comStr)}</td>
                <td><span class="nav-tag">${esc(s.dataSource ?? "PENDING")}</span></td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
      <p class="field-hint">Inertia + COM are placeholders until BEL/Stengel inputs are approved (no formulas applied yet).</p>
    </section>`;
}

// ── Bottom global axle table ─────────────────────────────────────────────────

function renderGlobalAxleTable(m) {
  return `
    <section class="card">
      <h3>Global Axle Position Table</h3>
      <p class="field-hint">Axle global position = section cumulative start + axle offset. Includes inter-section gaps. (Engine math currently uses section length only — see <code>docs/data-model.md</code>.)</p>
      <div class="table-scroll">
        <table class="data-table data-table-tight">
          <thead>
            <tr>
              <th class="tc">#</th>
              <th>Axle ID</th>
              <th>Section</th>
              <th>Section Idx</th>
              <th>Offset</th>
              <th>Global Position</th>
              <th>Wheel Pair</th>
              <th>Gauge</th>
              <th>Load</th>
            </tr>
          </thead>
          <tbody>
            ${m.axles.length === 0
              ? `<tr><td colspan="9" class="muted tc">No axles defined.</td></tr>`
              : m.axles.map((a, i) => `
                <tr>
                  <td class="tc muted mono small">${i}</td>
                  <td class="mono">${esc(a.axleId)}</td>
                  <td class="mono">${esc(a.sectionId)}</td>
                  <td class="tc">${a.sectionIndex}</td>
                  <td>${fmtNum(a.offset)}</td>
                  <td><strong>${fmtNum(a.globalPosition)}</strong></td>
                  <td class="mono small">${esc(a.wheelPairId ?? "—")}</td>
                  <td>${fmtNum(a.gauge)}</td>
                  <td>${fmtNum(a.load)}</td>
                </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

// ── Main view ────────────────────────────────────────────────────────────────

export function renderTrainView({ train, validation }) {
  if (!train) {
    return `<section class="card"><h2>Train</h2><p class="muted">No train data loaded.</p></section>`;
  }

  const m = analyzeTrainModel(train);
  const sections = train.sections ?? [];

  return `
    ${renderKpiStrip(train, m, validation.valid)}

    <div class="train-workspace">
      <div class="train-workspace-left">
        ${renderTrainMetaBlock(train)}

        <section class="card">
          <div class="panel-header-row">
            <h3>Train Formation</h3>
            <button class="btn btn-add btn-sm" data-action="add-train-section">+ Add Section</button>
          </div>
          ${sections.length === 0
            ? `<p class="muted">No sections defined. Add the lead car to begin.</p>`
            : sections.map((s, i) => renderSectionCard(s, i, m.sections[i])).join("")}
          <p class="field-hint">Blur (click away) to commit text and number edits. Selects and checkboxes commit immediately.</p>
        </section>
      </div>

      <aside class="train-workspace-right">
        ${renderDerivedPanel(m)}
        ${renderValidationPanel(validation, m.warnings)}
        ${renderMassInertiaSummary(m)}
      </aside>
    </div>

    ${renderGlobalAxleTable(m)}
  `;
}
