import { appRoute, parseAppRoute } from "./navigation-routes.mjs?v=tao-ux-2";
import { element } from "./tao-ui.js";
import { createContextBreadcrumb } from "./tao-components.js?v=1.1.0";

const ICON_PATHS = Object.freeze({
  profile: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 21a7.5 7.5 0 0 1 15 0"],
  people: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M2.5 20a6.5 6.5 0 0 1 13 0", "M17 11.5a3 3 0 1 0 0-6", "M17 14a5.5 5.5 0 0 1 5.5 5.5"],
  harmony: ["M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"],
  constellation: ["M12 3v6", "M12 15v6", "M5 8l4 2.5", "M19 8l-4 2.5", "M5 16l4-2.5", "M19 16l-4-2.5", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
});

function navigationIcon(name) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("section-navigation__icon");
  paths.forEach((definition) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    svg.append(path);
  });
  return svg;
}

export function createSectionNavigation(view, items, label) {
  const route = parseAppRoute(location.hash);
  const usesIcons = items.some((item) => item.icon);
  const nav = element("nav", { className: `section-navigation${usesIcons ? " section-navigation--icons" : ""}`, attributes: { "aria-label": label } });
  const track = element("div", { className: "section-navigation__track" });
  for (const item of items) {
    const link = element("a", {
      className: "section-navigation__item",
      attributes: { href: appRoute(view, item.id), "data-section-target": item.id },
    });
    const icon = navigationIcon(item.icon);
    if (icon) link.append(icon);
    link.append(element("span", { text: item.label }));
    if (route.view === view && route.section === item.id) link.setAttribute("aria-current", "location");
    link.addEventListener("click", (event) => {
      const currentRoute = parseAppRoute(location.hash);
      if (currentRoute.view !== view || currentRoute.section !== item.id) return;
      event.preventDefault();
      const scrollHost = link.closest("[data-app-view]");
      if (scrollHost?.scrollTo) scrollHost.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });
    track.append(link);
  }
  const parent = label.replace(/^Explorer\s+/i, "");
  const current = items.find((item) => item.id === route.section) ?? items[0];
  nav.append(createContextBreadcrumb(parent, current.breadcrumb ?? current.label), track);
  return nav;
}

export function markProductSection(node, view, id) {
  node.id = `${view}-${id}`;
  node.dataset.productSection = id;
  node.tabIndex = -1;
  return node;
}

export function focusRequestedSection(root, view, section, { scroll = true } = {}) {
  const target = root?.querySelector(`#${CSS.escape(`${view}-${section}`)}`);
  if (!target) return false;
  root.querySelectorAll(".section-navigation__item").forEach((link) => {
    if (link.dataset.sectionTarget === section) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  if (scroll) requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  return true;
}

export function showOnlyProductSection(root, section) {
  const sections = [...(root?.children ?? [])].filter((node) => node.dataset.productSection);
  let found = false;
  sections.forEach((node) => {
    const active = node.dataset.productSection === section;
    node.hidden = !active;
    if (active) found = true;
  });
  return found;
}
