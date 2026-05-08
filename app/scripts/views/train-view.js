import { esc, fmtNum } from "../utils/format.js";
import { analyzeTrainModel } from "../utils/train-model.js";

// ── Product-facing option labels (no internal codes shown to users) ──────────

const SECTION_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "LEAD", label: "Lead" },
  { value: "MIDDLE", label: "Middle" },
  { value: "TRAILER", label: "Trailer" },
  { value: "BOGIE_FRAME", label: "Bogie Frame" }
];

const SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manually entered" },
  { value: "IMPORTED", label: "Imported" },
  { value: "PENDING", label: "Not yet entered" }
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

// ── Unit system bar ───────────────────────────────────────────────────────────
// Display assumption: US Customary throughout (ft, in, lb, kip).
// These labels are hardcoded for the current phase of the app. When a dynamic
// unit system selector is added, this function should read the active unit
// system from the store/design-basis and map to the appropriate display strings.

function renderUnitSystemBar() {
  return `
    <div class="unit-system-bar">
      <span class="unit-system-label">Units</span>
      <span class="unit-system-value">US Customary</span>
      <span class="unit-sep">·</span>
      <span class="unit-system-hint">length: <strong>ft</strong> · gauge: <strong>in</strong> · mass: <strong>lb</strong> · load: <strong>kip</strong></span>
    </div>`;
}

// ── Summary strip (top, full width) ──────────────────────────────────────────

function renderSummaryStrip(train, m, checksOk) {
  const checkLabel = checksOk ? "All checks passed" : "Needs attention";
  const checkClass = checksOk ? "status-ok" : "status-bad";
  const calcBadge = `<span class="kpi-badge kpi-badge-calc" title="Calculated from your inputs">calculated</span>`;
  const inputBadge = `<span class="kpi-badge kpi-badge-input" title="Set in Train Details / Train Formation">input</span>`;
  const countBadge = `<span class="kpi-badge kpi-badge-count" title="Use Add/Remove Section to change">count</span>`;

  return `
    <section class="summary-strip">
      <div class="summary-card summary-card-input">
        <div class="summary-label">Train ID ${inputBadge}</div>
        <div class="summary-value mono">${esc(train.trainId ?? "—")}</div>
      </div>
      <div class="summary-card summary-card-input">
        <div class="summary-label">Vehicle Type ${inputBadge}</div>
        <div class="summary-value">${esc(train.vehicleType ?? "—")}</div>
      </div>
      <div class="summary-card summary-card-count">
        <div class="summary-label">Number of Sections ${countBadge}</div>
        <div class="summary-value">${m.sectionCount}</div>
      </div>
      <div class="summary-card summary-card-calc">
        <div class="summary-label">Total Axles ${calcBadge}</div>
        <div class="summary-value">${m.axleCount}</div>
      </div>
      <div class="summary-card summary-card-calc">
        <div class="summary-label">Total Wheel Pairs ${calcBadge}</div>
        <div class="summary-value">${m.wheelPairCount}</div>
      </div>
      <div class="summary-card summary-card-calc">
        <div class="summary-label">Total Train Length <span class="unit-tag">(ft)</span> ${calcBadge}</div>
        <div class="summary-value">${fmtNum(m.totalTrainLength)}</div>
      </div>
      <div class="summary-card summary-card-calc">
        <div class="summary-label">First → Last Wheel <span class="unit-tag">(ft)</span> ${calcBadge}</div>
        <div class="summary-value">${fmtNum(m.firstToLastWheelDistance)}</div>
      </div>
      <div class="summary-card summary-card-status">
        <div class="summary-label">Checks</div>
        <div class="summary-value"><span class="status-pill ${checkClass}">${checkLabel}</span></div>
      </div>
    </section>`;
}

// ── Train details (left column) ──────────────────────────────────────────────

function renderTrainDetails(train) {
  return `
    <section class="card panel-train">
      <header class="card-header">
        <h3>Train Details</h3>
        <span class="card-header-hint">Identification and notes for this train.</span>
      </header>
      <div class="form-grid form-grid-train">
        <label class="field-label">Train ID</label>
        ${textInput({ action: "mutate-train", field: "trainId" }, train.trainId)}

        <label class="field-label">Train Name</label>
        ${textInput({ action: "mutate-train", field: "trainName" }, train.trainName)}

        <label class="field-label">Vehicle Type</label>
        ${textInput({ action: "mutate-train", field: "vehicleType" }, train.vehicleType ?? "")}

        <label class="field-label">Notes</label>
        <textarea class="field-input field-textarea" rows="2" ${dataAttrs({ action: "mutate-train", field: "notes" })}>${esc(train.notes ?? "")}</textarea>
      </div>
    </section>`;
}

// ── Section card ─────────────────────────────────────────────────────────────

function renderAxleRow(axle, sectionIdx, axleIdx) {
  return `
    <tr>
      <td class="tc muted mono small">${axleIdx + 1}</td>
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
  const label = info.label || section.name || section.id || `Section ${idx + 1}`;
  return `
    <article class="section-card">
      <header class="section-card-header">
        <div class="section-card-title">
          <span class="section-id mono">${esc(section.id ?? `SEC-${idx + 1}`)}</span>
          <span class="section-card-name">${esc(label)}</span>
          <span class="section-card-pos muted small">starts ${fmtNum(info.sectionStart)} · ends ${fmtNum(info.sectionEnd)}</span>
        </div>
        <div class="section-card-controls">
          <button class="btn btn-add btn-sm" data-action="add-axle" data-section-idx="${idx}">+ Axle</button>
          <button class="btn btn-danger btn-sm" data-action="remove-train-section" data-section-idx="${idx}" title="Remove this section">Remove Section</button>
        </div>
      </header>

      <div class="section-card-body">
        <details open data-panel-id="sec-${idx}-geometry">
          <summary><span class="summary-chevron">›</span><span class="summary-text">Section Geometry</span></summary>
          <div class="form-grid form-grid-section">
            <label class="field-label">Section ID</label>
            ${textInput({ action: "mutate-train-section", "section-idx": idx, field: "id" }, section.id ?? "")}
            <label class="field-label">Section Name</label>
            ${textInput({ action: "mutate-train-section", "section-idx": idx, field: "name" }, section.name ?? "")}
            <label class="field-label">Section Type</label>
            ${selectInput({ action: "mutate-train-section", "section-idx": idx, field: "type" }, section.type ?? "", SECTION_TYPE_OPTIONS)}
            <label class="field-label">Section Length <span class="unit-tag">(ft)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "length" }, section.length, "0.001")}
            <label class="field-label">Gap to Next Section <span class="unit-tag">(ft)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "gapToNext" }, section.gapToNext ?? 0, "0.001")}
          </div>
        </details>

        <details open data-panel-id="sec-${idx}-axles">
          <summary><span class="summary-chevron">›</span><span class="summary-text">Axle / Wheel Layout</span><span class="summary-count">${axles.length}</span></summary>
          <div class="table-scroll">
            <table class="data-table data-table-axles">
              <thead>
                <tr>
                  <th class="tc">#</th>
                  <th>Axle ID</th>
                  <th>Axle Offset <span class="unit-tag">(ft)</span></th>
                  <th>Axle Load <span class="unit-tag">(kip)</span></th>
                  <th>Wheel Pair ID</th>
                  <th>Gauge <span class="unit-tag">(in)</span></th>
                  <th>Left Wheel ID</th>
                  <th>Right Wheel ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${axles.length === 0
                  ? `<tr><td colspan="9" class="muted tc">No axles in this section. Use + Axle to add one.</td></tr>`
                  : axles.map((a, ai) => renderAxleRow(a, idx, ai)).join("")}
              </tbody>
            </table>
          </div>
        </details>

        <details data-panel-id="sec-${idx}-mass">
          <summary><span class="summary-chevron">›</span><span class="summary-text">Mass &amp; Inertia Inputs</span><span class="summary-tag">not yet used by calculations</span></summary>
          <div class="form-grid form-grid-section">
            <label class="field-label">Mass <span class="unit-tag">(lb)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "mass" }, section.mass, "0.001")}
            <label class="field-label">Source</label>
            ${selectInput({ action: "mutate-train-section", "section-idx": idx, field: "dataSource" }, section.dataSource ?? "PENDING", SOURCE_OPTIONS)}

            <label class="field-label">Center of Mass X <span class="unit-tag">(ft)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "centerOfMass.x" }, section.centerOfMass?.x, "0.001")}
            <label class="field-label">Center of Mass Y <span class="unit-tag">(ft)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "centerOfMass.y" }, section.centerOfMass?.y, "0.001")}
            <label class="field-label">Center of Mass Z <span class="unit-tag">(ft)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "centerOfMass.z" }, section.centerOfMass?.z, "0.001")}

            <label class="field-label">Inertia XX <span class="unit-tag">(lb·ft²)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "inertia.Ixx" }, section.inertia?.Ixx, "0.001")}
            <label class="field-label">Inertia YY <span class="unit-tag">(lb·ft²)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "inertia.Iyy" }, section.inertia?.Iyy, "0.001")}
            <label class="field-label">Inertia ZZ <span class="unit-tag">(lb·ft²)</span></label>
            ${numInput({ action: "mutate-train-section", "section-idx": idx, field: "inertia.Izz" }, section.inertia?.Izz, "0.001")}

            <label class="field-label">Used in Calculations</label>
            <div class="field-checkbox-wrap">
              ${checkboxInput({ action: "mutate-train-section", "section-idx": idx, field: "participatesInLoadGen" }, section.participatesInLoadGen !== false)}
              <span class="muted small">When unchecked, this section is excluded from load assembly. Reserved for future use.</span>
            </div>
          </div>
        </details>
      </div>
    </article>`;
}

// ── Right column panels ──────────────────────────────────────────────────────

function renderDerivedGeometry(m) {
  return `
    <section class="card calc-card">
      <header class="card-header">
        <h3>Derived Train Geometry</h3>
        <span class="card-header-tag">calculated</span>
      </header>
      <dl class="kv-grid kv-grid-tight">
        <div><dt>Total Train Length <span class="unit-tag">(ft)</span></dt><dd>${fmtNum(m.totalTrainLength)}</dd></div>
        <div><dt>First → Last Wheel <span class="unit-tag">(ft)</span></dt><dd>${fmtNum(m.firstToLastWheelDistance)}</dd></div>
        <div><dt>Sections</dt><dd>${m.sectionCount}</dd></div>
        <div><dt>Axles</dt><dd>${m.axleCount}</dd></div>
        <div><dt>Wheel Pairs</dt><dd>${m.wheelPairCount}</dd></div>
        <div><dt>Section Length Σ <span class="unit-tag">(ft)</span></dt><dd>${fmtNum(m.sectionLengthSum)}</dd></div>
        <div><dt>Inter-section Gap Σ <span class="unit-tag">(ft)</span></dt><dd>${fmtNum(m.interSectionGapSum)}</dd></div>
      </dl>
      <h4 class="subhead">Section Start &amp; End Positions</h4>
      <table class="data-table data-table-tight">
        <thead><tr><th>Section</th><th>Start <span class="unit-tag">(ft)</span></th><th>End <span class="unit-tag">(ft)</span></th><th>Gap to Next <span class="unit-tag">(ft)</span></th></tr></thead>
        <tbody>
          ${m.sections.length === 0
            ? `<tr><td colspan="4" class="muted tc">No sections defined yet.</td></tr>`
            : m.sections.map((s) => `
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

function renderChecks(validation, modelWarnings) {
  const blocking = modelWarnings.filter((w) => w.severity === "blocking");
  const info = modelWarnings.filter((w) => w.severity === "info");
  const schemaErrors = (validation?.errors ?? []).map((e) => humanizeSchemaError(e));

  const allBlocking = [...schemaErrors, ...blocking.map((w) => w.message)];
  const noIssues = allBlocking.length === 0 && info.length === 0;

  return `
    <section class="card checks-card">
      <header class="card-header">
        <h3>Checks</h3>
        <span class="card-header-hint">Plain-language status of your train inputs.</span>
      </header>
      ${noIssues ? `<p class="ok">Everything looks good. No issues to report.</p>` : ""}

      ${allBlocking.length > 0 ? `
        <div class="checks-group checks-group-blocking">
          <div class="checks-group-title">
            <span class="check-dot dot-bad"></span>Blocking Issues
            <span class="checks-count">${allBlocking.length}</span>
          </div>
          <ul class="checks-list">
            ${allBlocking.map((m) => `<li>${esc(m)}</li>`).join("")}
          </ul>
        </div>` : ""}

      ${info.length > 0 ? `
        <div class="checks-group checks-group-info">
          <div class="checks-group-title">
            <span class="check-dot dot-info"></span>Information
            <span class="checks-count">${info.length}</span>
          </div>
          <ul class="checks-list checks-list-info">
            ${info.map((w) => `<li>${esc(w.message)}</li>`).join("")}
          </ul>
        </div>` : ""}
    </section>`;
}

function humanizeSchemaError(err) {
  // Schema messages can include paths like "sections[0].mass". Convert to plain language.
  // Best-effort heuristic: the underlying validator is loose, so we just strip obvious jargon.
  return String(err)
    .replace(/sections\[(\d+)\]/g, (_, n) => `Section ${Number(n) + 1}`)
    .replace(/\.axles\[(\d+)\]/g, (_, n) => ` axle ${Number(n) + 1}`)
    .replace(/centerOfMass\.([xyz])/gi, (_, k) => `Center of Mass ${k.toUpperCase()}`)
    .replace(/inertia\.I([a-z]{2})/gi, (_, k) => `Inertia ${k.toUpperCase()}`)
    .replace(/\bparticipatesInLoadGen\b/g, "Used in Calculations")
    .replace(/\bdataSource\b/g, "Source")
    .replace(/\baxleId\b/g, "Axle ID")
    .replace(/\bwheelPairId\b/g, "Wheel Pair ID")
    .replace(/\btrainId\b/g, "Train ID")
    .replace(/\btrainName\b/g, "Train Name")
    .replace(/\bvehicleType\b/g, "Vehicle Type")
    .replace(/\bgapToNext\b/g, "Gap to Next Section");
}

function renderCalculationUsage() {
  return `
    <section class="card usage-card">
      <header class="card-header">
        <h3>Calculation Usage</h3>
        <span class="card-header-hint">Which inputs are read by the engine today.</span>
      </header>
      <div class="usage-group usage-group-now">
        <div class="usage-group-title"><span class="usage-dot dot-now"></span>Used by calculations now</div>
        <ul class="usage-list">
          <li>Section Length</li>
          <li>Axle Offset</li>
          <li>Axle Load</li>
        </ul>
      </div>
      <div class="usage-group usage-group-saved">
        <div class="usage-group-title"><span class="usage-dot dot-saved"></span>Saved now, used later</div>
        <ul class="usage-list">
          <li>Train ID, Train Name, Vehicle Type, Notes</li>
          <li>Section ID, Section Name, Section Type</li>
          <li>Gap to Next Section</li>
          <li>Axle ID, Wheel Pair ID, Gauge, Left/Right Wheel ID</li>
        </ul>
      </div>
      <div class="usage-group usage-group-not-yet">
        <div class="usage-group-title"><span class="usage-dot dot-not-yet"></span>Not yet used by calculations</div>
        <ul class="usage-list">
          <li>Mass</li>
          <li>Center of Mass (X, Y, Z)</li>
          <li>Inertia (XX, YY, ZZ)</li>
          <li>Source · Used in Calculations</li>
        </ul>
      </div>
    </section>`;
}

// ── Bottom global axle table ─────────────────────────────────────────────────

function renderAxlePositionTable(m) {
  return `
    <section class="card calc-card">
      <header class="card-header">
        <h3>Axle Position Table</h3>
        <span class="card-header-tag">calculated</span>
      </header>
      <p class="field-hint">Global Position is calculated from each section's start position plus the axle's offset within the section.</p>
      <div class="table-scroll">
        <table class="data-table data-table-tight">
          <thead>
            <tr>
              <th class="tc">#</th>
              <th>Axle ID</th>
              <th>Section</th>
              <th>Offset <span class="unit-tag">(ft)</span></th>
              <th>Global Position <span class="unit-tag">(ft)</span></th>
              <th>Wheel Pair ID</th>
              <th>Gauge <span class="unit-tag">(in)</span></th>
              <th>Load <span class="unit-tag">(kip)</span></th>
            </tr>
          </thead>
          <tbody>
            ${m.axles.length === 0
              ? `<tr><td colspan="8" class="muted tc">No axles defined yet.</td></tr>`
              : m.axles.map((a, i) => `
                <tr>
                  <td class="tc muted mono small">${i + 1}</td>
                  <td class="mono">${esc(a.axleId)}</td>
                  <td><span class="mono small">${esc(a.sectionId)}</span> <span class="muted small">${esc(a.sectionLabel ?? "")}</span></td>
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
    return `<section class="card"><h2>Train</h2><p class="muted">No train data loaded yet.</p></section>`;
  }

  const m = analyzeTrainModel(train);
  const sections = train.sections ?? [];
  const blockingCount = m.warnings.filter((w) => w.severity === "blocking").length;
  const checksOk = (validation?.valid ?? true) && blockingCount === 0;

  return `
    ${renderUnitSystemBar()}
    ${renderSummaryStrip(train, m, checksOk)}

    <div class="train-workspace">
      <div class="train-workspace-left">
        ${renderTrainDetails(train)}

        <section class="card">
          <header class="card-header">
            <h3>Train Formation</h3>
            <div class="card-header-actions">
              <span class="card-header-hint">${sections.length} section${sections.length === 1 ? "" : "s"}</span>
              <button class="btn btn-add btn-sm" data-action="add-train-section">+ Add Section</button>
            </div>
          </header>
          ${sections.length === 0
            ? `<p class="muted empty-hint">No sections defined yet. Click <strong>+ Add Section</strong> to begin building the train.</p>`
            : sections.map((s, i) => renderSectionCard(s, i, m.sections[i])).join("")}
          <p class="field-hint">Click away from a text or number field to save your edit. Selects and checkboxes save immediately.</p>
        </section>
      </div>

      <aside class="train-workspace-right">
        ${renderDerivedGeometry(m)}
        ${renderChecks(validation, m.warnings)}
        ${renderCalculationUsage()}
      </aside>
    </div>

    ${renderAxlePositionTable(m)}
  `;
}
