import { element } from "./tao-ui.js";

export const TAO_SOURCES = Object.freeze({
  natal: "Thème natal", day: "Jour calculé", combined: "Jour × thème natal",
  season: "Saison solaire", environment: "Environnement réel", astronomy: "Astronomie réelle", yijing: "Tirage Yi Jing",
});

export function createSourceBadge(source, detail = "") {
  const label = TAO_SOURCES[source] ?? source;
  return element("span", { className: `tao-source tao-source--${source}`, text: detail ? `${label} · ${detail}` : label, attributes: { "aria-label": `Source : ${detail ? `${label}, ${detail}` : label}` } });
}

export function createContextBreadcrumb(parent, current) {
  const node = element("p", { className: "tao-context", attributes: { "aria-label": `Vous êtes dans ${parent}, ${current}` } });
  node.append(element("span", { text: parent }), element("b", { text: "›", attributes: { "aria-hidden": "true" } }), element("strong", { text: current }));
  return node;
}

export function createReadingReferenceCard({ dailyStem, dailyBranch, natalMaster }) {
  const card = element("aside", { className: "tao-reading-reference", attributes: { "aria-label": "Les repères de cette lecture" } });
  card.append(element("h2", { text: "Les repères de cette lecture" }));
  const grid = element("div");
  for (const [title, value, note, source] of [
    ["Aujourd’hui", dailyStem, `Tronc et Branche calculés pour cette journée · ${dailyBranch}`, "day"],
    ["Votre thème natal", natalMaster, "Maître du Jour calculé à partir de votre naissance", "natal"],
  ]) { const item = element("section"); item.append(createSourceBadge(source), element("strong", { text: title }), element("p", { text: value }), element("small", { text: note })); grid.append(item); }
  card.append(grid, element("p", { text: "TAO compare ces deux repères pour construire la lecture personnalisée de votre journée." }));
  return card;
}

export function createTaoHero({ eyebrow = "", title, lead = "", symbol = "", context = "", actions = [] }) {
  const hero = element("header", { className: "tao-hero" });
  if (eyebrow) hero.append(element("p", { className: "tao-hero__eyebrow", text: eyebrow }));
  const identity = element("div", { className: "tao-hero__identity" });
  if (symbol) identity.append(element("span", { className: "tao-hero__symbol", text: symbol, attributes: { "aria-hidden": "true" } }));
  identity.append(element("h1", { text: title }));
  hero.append(identity);
  if (lead) hero.append(element("p", { className: "tao-hero__lead", text: lead }));
  if (context) hero.append(element("p", { className: "tao-hero__context", text: context }));
  if (actions.length) {
    const row = element("div", { className: "tao-hero__actions" });
    row.append(...actions);
    hero.append(row);
  }
  return hero;
}

function cardStep(track) {
  const first = track.firstElementChild;
  if (!first) return 1;
  const styles = getComputedStyle(track);
  return first.getBoundingClientRect().width + Number.parseFloat(styles.columnGap || styles.gap || "0");
}

export function createTaoCarousel({ cards, label, dots = true, className = "", startIndex = 0 }) {
  const items = cards.filter(Boolean).slice(0, 5);
  const region = element("section", { className: `tao-carousel ${className}`.trim(), attributes: { "aria-label": label } });
  const track = element("div", { className: "tao-carousel__track", attributes: { tabindex: "0" } });
  items.forEach((card, index) => {
    card.classList.add("tao-carousel__card");
    card.dataset.carouselIndex = String(index);
    track.append(card);
  });
  const status = element("p", { className: "sr-only", attributes: { "aria-live": "polite" } });
  const controls = element("div", { className: "tao-carousel__dots", attributes: { "aria-label": "Choisir une carte" } });
  const dotButtons = items.map((_, index) => {
    const dot = element("button", { attributes: { type: "button", "aria-label": `Afficher la carte ${index + 1}`, "aria-current": index === startIndex ? "true" : "false" } });
    dot.addEventListener("click", () => track.scrollTo({ left: cardStep(track) * index, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    controls.append(dot);
    return dot;
  });
  const update = () => {
    const index = Math.max(0, Math.min(items.length - 1, Math.round(track.scrollLeft / cardStep(track))));
    dotButtons.forEach((dot, dotIndex) => dot.setAttribute("aria-current", String(dotIndex === index)));
    status.textContent = `Carte ${index + 1} sur ${items.length}`;
  };
  let frame = 0;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = Math.round(track.scrollLeft / cardStep(track));
    const next = Math.max(0, Math.min(items.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
    track.scrollTo({ left: cardStep(track) * next, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  region.append(track);
  if (dots && items.length > 1) region.append(controls);
  region.append(status);
  requestAnimationFrame(() => {
    if (startIndex) track.scrollLeft = cardStep(track) * Math.min(startIndex, items.length - 1);
    update();
  });
  return region;
}

export function createTaoSegmentedControl({ items, selectedId = items[0]?.id, label, onChange }) {
  const nav = element("div", { className: "tao-segmented", attributes: { role: "tablist", "aria-label": label } });
  const buttons = [];
  const select = (id, { focus = false } = {}) => {
    buttons.forEach((button) => {
      const active = button.dataset.segmentId === id;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    onChange?.(id);
  };
  items.forEach((item, index) => {
    const button = element("button", { text: item.label, attributes: { type: "button", role: "tab", "aria-selected": String(item.id === selectedId), "data-segment-id": item.id, tabindex: item.id === selectedId ? "0" : "-1" } });
    button.addEventListener("click", () => select(item.id));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = buttons.indexOf(button);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      select(buttons[next].dataset.segmentId, { focus: true });
    });
    buttons.push(button);
    nav.append(button);
  });
  return nav;
}

export function openTaoSheet({ title, content, opener = document.activeElement, label = "Détails" }) {
  const backdrop = element("div", { className: "tao-sheet-backdrop" });
  const sheet = element("section", { className: "tao-sheet", attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "tao-sheet-title" } });
  const header = element("header", { className: "tao-sheet__header" });
  header.append(element("p", { className: "tao-sheet__eyebrow", text: label }), element("h2", { text: title, attributes: { id: "tao-sheet-title" } }));
  const close = element("button", { className: "tao-sheet__close", text: "×", attributes: { type: "button", "aria-label": "Fermer" } });
  header.append(close);
  const body = element("div", { className: "tao-sheet__body" });
  if (Array.isArray(content)) body.append(...content); else if (content) body.append(content);
  sheet.append(header, body);
  backdrop.append(sheet);
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), details > summary, [tabindex]:not([tabindex="-1"])';
  const closeSheet = () => {
    document.removeEventListener("keydown", onKeydown);
    document.body.classList.remove("has-tao-sheet");
    backdrop.remove();
    opener?.focus?.();
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") return closeSheet();
    if (event.key !== "Tab") return;
    const focusable = [...sheet.querySelectorAll(focusableSelector)];
    if (!focusable.length) return event.preventDefault();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  close.addEventListener("click", closeSheet);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeSheet(); });
  document.addEventListener("keydown", onKeydown);
  document.body.classList.add("has-tao-sheet");
  document.body.append(backdrop);
  requestAnimationFrame(() => close.focus());
  return closeSheet;
}
