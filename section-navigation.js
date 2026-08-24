import { appRoute, parseAppRoute } from "./navigation-routes.mjs?v=tao-ux-2";
import { element } from "./tao-ui.js";
import { createContextBreadcrumb } from "./tao-components.js?v=1.1.0";

export function createSectionNavigation(view, items, label) {
  const route = parseAppRoute(location.hash);
  const nav = element("nav", { className: "section-navigation", attributes: { "aria-label": label } });
  const track = element("div", { className: "section-navigation__track" });
  for (const item of items) {
    const link = element("a", {
      className: "section-navigation__item",
      text: item.label,
      attributes: { href: appRoute(view, item.id), "data-section-target": item.id },
    });
    if (route.view === view && route.section === item.id) link.setAttribute("aria-current", "location");
    track.append(link);
  }
  const parent = label.replace(/^Explorer\s+/i, "");
  const current = items.find((item) => item.id === route.section) ?? items[0];
  nav.append(createContextBreadcrumb(parent, current.label), track);
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
