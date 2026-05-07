import { esc } from "../utils/format.js";

function renderFamilyToggleRows(lookups, selected) {
  const availableFamilies = lookups?.loadFamilyTypes?.families ?? [];
  const selectedIds = new Set((selected ?? []).map((f) => f.familyId));

  if (!availableFamilies.length) {
    return `<p class="muted">No load family types available in lookup data.</p>`;
  }

  return `
    <div class="family-toggle-list">
      ${availableFamilies.map((f) => {
        const isChecked = selectedIds.has(f.id);
        const requiredTag = f.required ? `<span class="nav-tag">required</span>` : "";
        const dynamicTag = f.dynamic ? `<span class="nav-tag">dynamic</span>` : "";
        return `
          <label class="family-toggle-row${isChecked ? " is-selected" : ""}">
            <input type="checkbox" class="family-checkbox"
              data-action="toggle-load-family" data-family-id="${esc(f.id)}"
              ${isChecked ? "checked" : ""}>
            <span class="family-toggle-label">
              <strong>${esc(f.label)}</strong>
              <span class="family-id muted">${esc(f.id)}</span>
            </span>
            <span class="family-tags">${requiredTag}${dynamicTag}</span>
          </label>`;
      }).join("")}
    </div>`;
}

export function renderLoadFamilyView({ loadFamilies, validation, lookups }) {
  if (!loadFamilies) {
    return `<section class="card"><h2>Load Families</h2><p class="muted">No load-family profile loaded.</p></section>`;
  }

  const selected = loadFamilies.families ?? [];
  const statusClass = validation.valid ? "status-ok" : "status-bad";
  const statusLabel = validation.valid ? "Valid" : "Invalid";

  return `
    <section class="card panel-load-family">
      <div class="panel-header-row">
        <h2>Load Families</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Selected</dt><dd>${selected.length}</dd></div>
        <div><dt>Available</dt><dd>${(lookups?.loadFamilyTypes?.families ?? []).length}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Family Selection</h3>
      <p class="field-hint">Check families to include them in wheel-load computations.</p>
      ${renderFamilyToggleRows(lookups, selected)}
    </section>

    <section class="card">
      <h3>Selected Families</h3>
      ${selected.length === 0
        ? `<p class="muted">No families selected.</p>`
        : `<table class="data-table">
            <thead><tr><th>Family ID</th><th>Status</th><th>Source Type</th></tr></thead>
            <tbody>
              ${selected.map((f) => `
                <tr>
                  <td>${esc(f.familyId)}</td>
                  <td>${esc(f.status ?? "—")}</td>
                  <td>${esc(f.sourceType ?? "—")}</td>
                </tr>`).join("")}
            </tbody>
          </table>`}
    </section>

    <section class="card">
      <h3>Load Family Validation</h3>
      ${validation.errors.length
        ? `<ul class="error-list">${validation.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
        : "<p class='ok'>No schema errors detected.</p>"}
    </section>
  `;
}
