let registry = null;

export async function loadNavRegistry(path = "shared/nav/app-registry.json") {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load nav registry from ${path}`);
  registry = await response.json();
  return registry;
}

export function getNavRegistry() {
  return registry;
}

export function getDefaultRoute() {
  return registry?.defaultRoute ?? "#/home";
}

export function getCurrentRoute() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  return hash || getDefaultRoute();
}

export function setRoute(route) {
  if (typeof window === "undefined") return;
  if (window.location.hash !== route) window.location.hash = route;
}

export function onRouteChange(handler) {
  if (typeof window === "undefined") return () => {};
  const fire = () => handler(getCurrentRoute());
  window.addEventListener("hashchange", fire);
  return () => window.removeEventListener("hashchange", fire);
}

export function findItemByRoute(route) {
  if (!registry) return null;
  for (const group of registry.groups ?? []) {
    for (const item of group.items ?? []) {
      if (item.route === route) return item;
    }
  }
  return null;
}

export function isKnownRoute(route) {
  return findItemByRoute(route) !== null;
}
