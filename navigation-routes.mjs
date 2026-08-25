export const DEFAULT_VIEW = "pavilion";

export const SECTION_ROUTES = Object.freeze({
  today: ["understand", "rhythm", "season", "environment"],
  theme: ["essential", "composition", "structure", "journey"],
  pavilion: ["tao"],
  yijing: ["consult", "history", "learn"],
  profiles: ["me", "people", "compatibility", "family"],
});

export const ROUTE_ALIASES = Object.freeze({
  "#today/guidance": "#today/understand",
  "#today/energies": "#today/understand",
  "#today/personal": "#today/rhythm",
  "#today/cycles": "#today/rhythm",
  "#today/nature": "#today/environment",
  "#theme/overview": "#theme/essential",
  "#theme/elements": "#theme/composition",
  "#theme/pillars": "#theme/composition",
  "#theme/structure-old": "#theme/structure",
  "#theme/ten-gods": "#theme/structure",
  "#theme/cycles": "#theme/journey",
  "#theme/life": "#theme/journey",
  "#pavilion/sky": "#today/environment",
  "#pavilion/desk": "#yijing/consult",
  "#pavilion/library": "#theme/composition",
  "#pavilion/almanac": "#today/season",
});

function canonicalRoute(hash) {
  const [view, section] = hash.replace(/^#/, "").split("/");
  return Object.freeze({ view, section, canonicalHash: hash });
}

export function resolveAppRoute(hash = "") {
  const rawHash = String(hash || "").trim();
  const normalizedHash = rawHash.startsWith("#") ? rawHash : rawHash ? `#${rawHash}` : "";
  const aliasTarget = ROUTE_ALIASES[normalizedHash];
  if (aliasTarget) return Object.freeze({ ...canonicalRoute(aliasTarget), isAlias: true, isInvalid: false, requestedHash: normalizedHash });

  const segments = normalizedHash.replace(/^#/, "").split("/").filter(Boolean);
  const candidateView = segments[0];
  if (!candidateView) {
    const section = SECTION_ROUTES[DEFAULT_VIEW][0];
    return Object.freeze({ view: DEFAULT_VIEW, section, canonicalHash: `#${DEFAULT_VIEW}`, isAlias: false, isInvalid: false, requestedHash: normalizedHash });
  }
  if (!Object.hasOwn(SECTION_ROUTES, candidateView)) {
    const section = SECTION_ROUTES[DEFAULT_VIEW][0];
    return Object.freeze({ view: DEFAULT_VIEW, section, canonicalHash: `#${DEFAULT_VIEW}`, isAlias: false, isInvalid: true, requestedHash: normalizedHash });
  }

  const sections = SECTION_ROUTES[candidateView];
  if (segments.length === 1) return Object.freeze({ view: candidateView, section: sections[0], canonicalHash: `#${candidateView}`, isAlias: false, isInvalid: false, requestedHash: normalizedHash });
  const candidateSection = segments[1];
  if (segments.length === 2 && sections.includes(candidateSection)) {
    return Object.freeze({ view: candidateView, section: candidateSection, canonicalHash: `#${candidateView}/${candidateSection}`, isAlias: false, isInvalid: false, requestedHash: normalizedHash });
  }
  return Object.freeze({ view: candidateView, section: sections[0], canonicalHash: `#${candidateView}`, isAlias: false, isInvalid: true, requestedHash: normalizedHash });
}

export function parseAppRoute(hash = "") {
  const { view, section } = resolveAppRoute(hash);
  return Object.freeze({ view, section });
}

export function appRoute(view, section) {
  const safeView = Object.hasOwn(SECTION_ROUTES, view) ? view : DEFAULT_VIEW;
  const sections = SECTION_ROUTES[safeView];
  const safeSection = sections.includes(section) ? section : sections[0];
  return `#${safeView}/${safeSection}`;
}
