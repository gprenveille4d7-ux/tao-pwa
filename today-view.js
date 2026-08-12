import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateDailyTao } from "./daily-tao-engine.mjs?v=1.0.1";
import { getCachedDaily, setCachedDaily } from "./daily-cache.mjs?v=1.0.1";
import { element, formatLongDate, localDateIso } from "./tao-ui.js";
import { setTaoDialogueText } from "./tao-dialogue.js";
import { setTaoNarrativeState } from "./tao-narrative.js";

const root = document.querySelector("[data-today-root]");

function sectionHeader(kicker, title, intro) {
  const header = element("header", { className: "product-section__header" });
  if (kicker) header.append(element("p", { className: "product-eyebrow", text: kicker }));
  header.append(element("h2", { text: title }));
  if (intro) header.append(element("p", { className: "product-section__intro", text: intro }));
  return header;
}

function createOverview(result) {
  const card = element("section", { className: "product-card glance-card", attributes: { "aria-labelledby": "today-glance" } });
  card.append(sectionHeader(null, "EN UN REGARD"));
  card.querySelector("h2").id = "today-glance";
  const grid = element("dl", { className: "glance-grid" });
  for (const [label, value] of [
    ["Énergie", result.overview.energy], ["Rythme", result.overview.rhythm],
    ["Élément soutenu", result.overview.supported], ["Point d’attention", result.overview.attention],
  ]) {
    const item = element("div");
    item.append(element("dt", { text: label }), element("dd", { text: value }));
    grid.append(item);
  }
  card.append(grid);
  return card;
}

function createDayEnergy(result) {
  const card = element("section", { className: `product-card hero-card element-accent--${result.dayEnergy.stem.element}` });
  card.append(
    element("p", { className: "product-eyebrow", text: "ÉNERGIE DU JOUR" }),
    element("p", { className: "hero-card__glyph", text: result.pillars.day.chinese }),
    element("h2", { className: "hero-card__value", text: result.dayEnergy.label }),
    element("p", { className: "hero-card__meta", text: `${result.dayEnergy.stem.name} ${result.dayEnergy.branch.name} · ${result.dayEnergy.animal}` }),
    element("p", { className: "hero-card__summary", text: result.dayEnergy.summary }),
  );
  return card;
}

function createResonance(result, natalTheme) {
  const card = element("section", { className: "product-card resonance-card" });
  card.append(sectionHeader("JOUR × THÈME NATAL", "RÉSONANCE AVEC TON THÈME"));
  const level = element("div", { className: "resonance-level" });
  level.append(
    element("span", { text: "Harmonie symbolique" }),
    element("strong", { text: result.resonance.level }),
    element("small", { text: `${result.resonance.score}/100 · indicateur interne` }),
  );
  const text = element("div", { className: "resonance-copy" });
  text.append(
    element("p", { text: `Ton Maître du Jour est ${natalTheme.dayMaster.elementLabel} ${natalTheme.dayMaster.polarity === "yang" ? "Yang" : "Yin"}.` }),
    ...result.resonance.reasons.map((reason) => element("p", { text: reason })),
  );
  card.append(level, text);
  return card;
}

function createElementBalance(result) {
  const section = element("section", { className: "product-card" });
  section.append(sectionHeader("ÉQUILIBRE SYMBOLIQUE", "CINQ ÉLÉMENTS", "Le trait clair montre l’équilibre natal enrichi des deux composantes du jour."));
  const list = element("div", { className: "element-bars" });
  for (const item of Object.values(result.elements)) {
    const row = element("div", { className: `element-row element-row--${item.key}` });
    const label = element("div", { className: "element-row__label" });
    label.append(
      element("strong", { text: item.label }),
      element("span", { text: item.dailyCount ? `+${item.dailyCount} aujourd’hui` : "stable aujourd’hui" }),
    );
    const meter = element("div", { className: "element-meter", attributes: {
      role: "meter", "aria-label": `${item.label} : ${item.percent}% dans la lecture combinée`,
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(item.percent),
    } });
    const fill = element("span", { className: "element-meter__fill" });
    fill.style.width = `${item.percent}%`;
    meter.append(fill);
    row.append(label, meter, element("span", { className: "element-row__value", text: `${item.percent}%` }));
    list.append(row);
  }
  section.append(list);
  return section;
}

function createGuidance(result) {
  const section = element("section", { className: "product-card guidance-card" });
  section.append(sectionHeader("PAROLES DE TAO", "GUIDANCE DE TAO"));
  const grid = element("div", { className: "guidance-grid" });
  for (const [title, items] of [["À privilégier", result.guidance.favor], ["À modérer", result.guidance.moderate]]) {
    const group = element("div");
    group.append(element("h3", { text: title }));
    const list = element("ul");
    for (const item of items) list.append(element("li", { text: item }));
    group.append(list);
    grid.append(group);
  }
  const rhythm = element("div", { className: "guidance-rhythm" });
  rhythm.append(element("span", { text: "Rythme" }), element("strong", { text: result.guidance.rhythm }));
  const domains = element("div", { className: "domain-pills", attributes: { "aria-label": "Domaines soutenus" } });
  for (const domain of result.guidance.domains) domains.append(element("span", { text: domain }));
  section.append(grid, rhythm, domains);
  return section;
}

function createSeason(result) {
  const section = element("section", { className: "product-card season-card" });
  section.append(
    sectionHeader("SAISON DU MOMENT", `${result.solarTerm.label} · ${result.solarTerm.pinyin}`),
    element("p", { text: result.solarTerm.description }),
  );
  return section;
}

function pillarMini(label, pillar) {
  const card = element("article", { className: "mini-pillar" });
  card.append(element("span", { text: label }), element("strong", { text: pillar.chinese }), element("small", { text: pillar.label }));
  return card;
}

function createDetails(result) {
  const details = element("details", { className: "product-disclosure" });
  details.append(element("summary", { text: "Approfondir la lecture du jour" }));
  const content = element("div", { className: "product-disclosure__content" });
  const pillars = element("div", { className: "mini-pillar-grid" });
  pillars.append(pillarMini("Année énergétique", result.pillars.year), pillarMini("Mois énergétique", result.pillars.month), pillarMini("Jour", result.pillars.day));
  content.append(
    pillars,
    element("p", { className: "method-note", text: result.methodology }),
    element("p", { className: "symbolic-note", text: "TAO propose une lecture traditionnelle et symbolique destinée à la réflexion personnelle." }),
  );
  details.append(content);
  return details;
}

function renderError(message) {
  root.replaceChildren(element("section", { className: "product-card product-error", text: message, attributes: { role: "alert" } }));
}

export function getActiveDailyReading() {
  const profile = getActiveProfile();
  if (!profile) return null;
  const natalTheme = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const date = localDateIso(timeZone);
  const input = { profile, natalTheme, timeZone, date };
  const result = getCachedDaily(input) ?? setCachedDaily(input, calculateDailyTao(input));
  return { profile, natalTheme, result };
}

export async function renderTodayView() {
  if (!root) return null;
  try {
    const reading = getActiveDailyReading();
    if (!reading) {
      renderError("Crée d’abord un profil pour découvrir la lecture de ta journée.");
      return null;
    }
    const { profile, natalTheme, result } = reading;
    const header = element("header", { className: "product-header" });
    header.append(
      element("p", { className: "product-eyebrow", text: "AUJOURD’HUI" }),
      element("h1", { text: formatLongDate(result.date, result.timeZone) }),
      element("p", { className: "product-lead", text: `Bonjour ${profile.firstName}. Voici les repères symboliques de ta journée.` }),
    );
    root.replaceChildren(header, createOverview(result), createDayEnergy(result), createResonance(result, natalTheme), createElementBalance(result), createGuidance(result), createSeason(result), createDetails(result));
    await setTaoNarrativeState("observing");
    return result;
  } catch (error) {
    console.error("[TAO] Lecture quotidienne impossible.", error);
    renderError("La lecture du jour ne peut pas être établie pour le moment.");
    return null;
  }
}

async function updatePavilionDialogue() {
  try {
    const reading = getActiveDailyReading();
    if (!reading) return;
    setTaoDialogueText(`${reading.result.dayEnergy.stem.elementLabel} est au cœur de la journée. ${reading.result.dayEnergy.summary}`);
    await setTaoNarrativeState("observing");
  } catch {
    // Le Pavillon reste utilisable même si la lecture temporelle est indisponible.
  }
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view === "today") renderTodayView();
  if (event.detail?.view === "pavilion") updatePavilionDialogue();
});
window.addEventListener("tao:profile-changed", () => {
  if (location.hash === "#today") renderTodayView();
});

if (location.hash === "#today") renderTodayView();
