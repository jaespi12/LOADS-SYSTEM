function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
}

function renderItem(item, activeRoute) {
  const isActive = item.route === activeRoute;
  const classes = ["nav-link"];
  if (isActive) classes.push("is-active");
  if (item.status === "planned") classes.push("is-planned");
  const tag = item.status === "planned" ? "<span class=\"nav-tag\">soon</span>" : "";
  const aria = isActive ? " aria-current=\"page\"" : "";
  return `<li><a class="${classes.join(" ")}" href="${escapeHtml(item.route)}"${aria}>${escapeHtml(item.label)}${tag}</a></li>`;
}

export function renderSidebar({ registry, activeRoute, projectName, projectId } = {}) {
  if (!registry) return "<aside class=\"app-sidebar\"></aside>";
  const groups = (registry.groups ?? []).map((group) => {
    const items = (group.items ?? []).map((item) => renderItem(item, activeRoute)).join("");
    return `<div class="nav-group">
      <div class="nav-group-label">${escapeHtml(group.label)}</div>
      <ul class="nav-list">${items}</ul>
    </div>`;
  }).join("");

  const projectBlock = projectName
    ? `<div class="nav-project">
        <div class="nav-project-label">Project</div>
        <div class="nav-project-name" title="${escapeHtml(projectName)}">${escapeHtml(projectName)}</div>
        <div class="nav-project-id">${escapeHtml(projectId ?? "")}</div>
      </div>`
    : "";

  return `<aside class="app-sidebar" aria-label="Primary navigation">
    ${projectBlock}
    ${groups}
  </aside>`;
}
