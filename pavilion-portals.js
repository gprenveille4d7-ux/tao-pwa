import { element } from "./tao-ui.js";
import { createSectionNavigation, focusRequestedSection, markProductSection } from "./section-navigation.js";
import { parseAppRoute } from "./navigation-routes.mjs";

const root = document.querySelector("[data-pavilion-portals]");
const PAVILION_SECTIONS = Object.freeze([
  { id: "tao", label: "Parler avec TAO" }, { id: "sky", label: "Observer le ciel" },
  { id: "desk", label: "Bureau" }, { id: "library", label: "Bibliothèque" }, { id: "almanac", label: "Almanach" },
]);

function portal(id, eyebrow, title, copy, href, action) {
  const section = markProductSection(element("section", { className: "pavilion-portal product-card" }), "pavilion", id);
  section.append(element("p", { className: "product-eyebrow", text: eyebrow }), element("h2", { text: title }), element("p", { text: copy }));
  const link = element("a", { className: "product-button product-button--quiet", text: action, attributes: { href } });
  section.append(link);
  return section;
}

export function renderPavilionPortals(section = parseAppRoute(location.hash).section) {
  if (!root) return;
  root.replaceChildren(
    createSectionNavigation("pavilion", PAVILION_SECTIONS, "Explorer le Pavillon"),
    portal("tao", "Présence", "Parler avec TAO", "Le dialogue sous la scène reste le point de rencontre principal. TAO y dépose sa lecture de la journée.", "#pavilion/tao", "Revenir à TAO"),
    portal("sky", "Fenêtre", "Observer le ciel", "L’extérieur accompagne le Pavillon. Les repères astronomiques restent distincts des calculs BaZi.", "#today/nature", "Voir Ciel & nature"),
    portal("desk", "Objets", "Le bureau de TAO", "Le livre du Yi Jing ouvre une consultation ; les autres objets ne deviennent actifs que lorsqu’ils servent une information réelle.", "#yijing/consult", "Ouvrir le Yi Jing"),
    portal("library", "Comprendre", "La bibliothèque", "Troncs, Branches, éléments, Dix Dieux, trigrammes et hexagrammes sont réunis dans une base de connaissances locale.", "#theme/structure", "Explorer les fondements"),
    portal("almanac", "Temps", "Calendrier & almanach", "Les piliers de l’année, du mois et du jour donnent les repères déjà calculables. Les cycles avancés restent en attente.", "#today/cycles", "Consulter les cycles"),
  );
  focusRequestedSection(root, "pavilion", section, { scroll: section !== "tao" });
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view === "pavilion") renderPavilionPortals(event.detail.section);
});

if (location.hash.startsWith("#pavilion")) renderPavilionPortals();
