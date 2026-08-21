import { element } from "./tao-ui.js";
import { parseAppRoute } from "./navigation-routes.mjs?v=tao-ux-2";
import { openTaoSheet } from "./tao-components.js?v=1.0.0";

const root = document.querySelector("[data-pavilion-portals]");
const ENTRIES = Object.freeze([
  { id: "sky", title: "Ciel", copy: "Observer la météo et les phénomènes.", href: "#today/environment" },
  { id: "desk", title: "Bureau", copy: "Retrouver les objets actifs et le Yi Jing.", href: "#yijing/consult" },
  { id: "library", title: "Bibliothèque", copy: "Comprendre les fondements du thème.", href: "#theme/composition" },
  { id: "almanac", title: "Almanach", copy: "Suivre la saison, les cycles et le temps.", href: "#today/rhythm" },
]);

function explorerContent() {
  const list = element("nav", { className: "nebula-explorer", attributes: { "aria-label": "Raccourcis du Nebula" } });
  ENTRIES.forEach(({ title, copy, href }) => {
    const link = element("a", { className: "nebula-explorer__item", attributes: { href } });
    link.append(element("strong", { text: title }), element("span", { text: copy }), element("b", { text: "›", attributes: { "aria-hidden": "true" } }));
    list.append(link);
  });
  return list;
}

function openExplorer(opener) {
  if (document.querySelector(".tao-sheet-backdrop")) return;
  openTaoSheet({ title: "Explorer le Nebula", label: "Le Pavillon", content: explorerContent(), opener });
}

export function renderPavilionPortals(section = parseAppRoute(location.hash).section) {
  if (!root) return;
  const trigger = element("button", { className: "nebula-explorer-trigger", text: "Explorer le Nebula ⌃", attributes: { type: "button", "aria-haspopup": "dialog" } });
  trigger.addEventListener("click", () => openExplorer(trigger));
  root.replaceChildren(trigger);
  if (section !== "tao") requestAnimationFrame(() => openExplorer(trigger));
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view === "pavilion") renderPavilionPortals(event.detail.section);
});

if (location.hash.startsWith("#pavilion")) renderPavilionPortals();
