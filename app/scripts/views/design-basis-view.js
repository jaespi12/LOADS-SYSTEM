import { esc } from "../utils/format.js";

function renderSelect({ id, action, field, options, current }) {
  // If current value isn't in options list, prepend it so it stays visible
  const hasMatch = options.some((o) => o.value === current);
  const optionList = hasMatch ? options : [{ value: current ?? "", label: current ?? "—" }, ...options];
  const opts = optionList.map((o) =>
    `<option value="${esc(o.value)}"${o.value === current ? " selected" : ""}>${esc(o.label)}</option>`
  ).join("");
  return `<select id="${esc(id)}" class="field-input" data-action="${esc(action)}" data-field="${esc(field)}">${opts}</select>`;
}

export function renderDesignBasisView({ designBasis, validation, lookups }) {
  if (!designBasis) {
    return `<section class="card"><h2>Design Basis</h2><p class="muted">No design basis data found in loaded project.</p></section>`;
  }

  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  const codeSetOptions = (lookups?.codeSets?.codes ?? []).map((c) => ({ value: c.id, label: `${c.id}` }));
  const unitSystemOptions = (lookups?.unitSystems?.systems ?? []).map((s) => ({ value: s.id, label: s.label }));
  const statusOptions = (lookups?.statusOptions?.statuses ?? []).map((s) => ({ value: s.id, label: s.label }));

  return `
    <section class="card panel-design-basis">
      <div class="panel-header-row">
        <h2>Design Basis</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>ID</dt><dd>${esc(designBasis.id ?? "—")}</dd></div>
        <div><dt>Name</dt><dd>${esc(designBasis.name ?? "—")}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Edit Design Basis</h3>
      <div class="form-grid">
        <label class="field-label" for="db-codeset">Code Set</label>
        ${renderSelect({ id: "db-codeset", action: "mutate-design-basis", field: "codeSet", options: codeSetOptions, current: designBasis.codeSet })}

        <label class="field-label" for="db-unitsystem">Unit System</label>
        ${renderSelect({ id: "db-unitsystem", action: "mutate-design-basis", field: "unitSystem", options: unitSystemOptions, current: designBasis.unitSystem })}

        <label class="field-label" for="db-status">Status</label>
        ${renderSelect({ id: "db-status", action: "mutate-design-basis", field: "status", options: statusOptions, current: designBasis.status })}

        <label class="field-label" for="db-notes">Notes</label>
        <textarea id="db-notes" class="field-input field-textarea" rows="3"
          data-action="mutate-design-basis" data-field="notes">${esc(designBasis.notes ?? "")}</textarea>
      </div>
    </section>

    <section class="card">
      <h3>Validation</h3>
      ${validation.errors.length
        ? `<ul class="error-list">${validation.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No schema errors detected.</p>"}
    </section>
  `;
}
