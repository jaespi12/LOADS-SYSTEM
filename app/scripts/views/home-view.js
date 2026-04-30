function sectionState(name, data, validation) {
  if (!data) return { name, state: "missing", detail: "No data loaded." };
  if (!validation?.valid) return { name, state: "invalid", detail: `${validation?.errors?.length ?? 0} validation issue(s).` };
  return { name, state: "ready", detail: "Ready." };
}

export function renderHomeView({ packageSummary }) {
  const statusClass = packageSummary.complete ? "status-ok" : "status-bad";
  const statusLabel = packageSummary.complete ? "Complete" : "Incomplete";

  const sectionRows = packageSummary.sections
    .map((section) => `<li><strong>${section.name}</strong> — ${section.state.toUpperCase()} · ${section.detail}</li>`)
    .join("");

  const missingRows = packageSummary.missingOrInvalid.length
    ? `<ul class="error-list">${packageSummary.missingOrInvalid.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "<p class='ok'>All required package sections are present and valid.</p>";

  return `
    <section class="card panel-home">
      <div class="panel-header-row">
        <h2>Project Package</h2>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <dl class="kv-grid">
        <div><dt>Required Sections</dt><dd>${packageSummary.requiredCount}</dd></div>
        <div><dt>Ready Sections</dt><dd>${packageSummary.readyCount}</dd></div>
        <div><dt>Invalid/Missing</dt><dd>${packageSummary.missingOrInvalid.length}</dd></div>
      </dl>
    </section>

    <section class="card">
      <h3>Completeness by Section</h3>
      <ul class="section-list">${sectionRows}</ul>
    </section>

    <section class="card">
      <h3>Validation and Required Checks</h3>
      ${missingRows}
    </section>
  `;
}

export function buildPackageSummary(state) {
  const sections = [
    sectionState("Design Basis", state.designBasis, state.validation.designBasis),
    sectionState("Geometry", state.geometry, state.validation.geometry),
    sectionState("Train", state.train, state.validation.train),
    sectionState("Kinematics", state.kinematics, state.validation.kinematics),
    sectionState("Load Families", state.loadFamilies, state.validation.loadFamilies)
  ];

  const missingOrInvalid = [];
  sections.forEach((section) => {
    if (section.state !== "ready") {
      missingOrInvalid.push(`${section.name}: ${section.detail}`);
    }
  });

  if (!state.validation.requiredLoadFamilies.valid) {
    state.validation.requiredLoadFamilies.errors.forEach((error) => missingOrInvalid.push(`Load Families: ${error}`));
  }

  const readyCount = sections.filter((section) => section.state === "ready").length;

  return {
    sections,
    requiredCount: sections.length,
    readyCount,
    complete: missingOrInvalid.length === 0,
    missingOrInvalid
  };
}
