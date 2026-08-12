export const DEFAULT_VIEW = "pavilion";

export const SECTION_ROUTES = Object.freeze({
  today: ["guidance", "energies", "personal", "cycles", "nature"],
  theme: ["overview", "pillars", "elements", "structure", "ten-gods", "cycles", "life"],
  pavilion: ["tao", "sky", "desk", "library", "almanac"],
  yijing: ["consult", "history", "learn"],
  profiles: ["me", "people", "compatibility"],
});

export function parseAppRoute(hash = "") {
  const [candidateView, candidateSection] = String(hash).replace(/^#/, "").split("/");
  const view = Object.hasOwn(SECTION_ROUTES, candidateView) ? candidateView : DEFAULT_VIEW;
  const sections = SECTION_ROUTES[view];
  const section = sections.includes(candidateSection) ? candidateSection : sections[0];
  return Object.freeze({ view, section });
}

export function appRoute(view, section) {
  const safeView = Object.hasOwn(SECTION_ROUTES, view) ? view : DEFAULT_VIEW;
  const sections = SECTION_ROUTES[safeView];
  const safeSection = sections.includes(section) ? section : sections[0];
  return `#${safeView}/${safeSection}`;
}
