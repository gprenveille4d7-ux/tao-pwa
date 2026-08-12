import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateDailyTao } from "./daily-tao-engine.mjs?v=1.1.0";
import { getCachedDaily, setCachedDaily } from "./daily-cache.mjs?v=1.1.0";
import { element, formatLongDate, localDateIso } from "./tao-ui.js";
import { setTaoDailyBrief } from "./tao-dialogue.js";
import { setTaoNarrativeState } from "./tao-narrative.js";
import { formatPercent, getConcept, t } from "./locales/index.js";
import { glossaryDisclosure } from "./locales/glossary-ui.js";

const root = document.querySelector("[data-today-root]");
const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const elementData = (key) => getConcept("bazi.elements", key);
const stemData = (key) => getConcept("bazi.heavenlyStems", key);
const branchData = (key) => getConcept("bazi.earthlyBranches", key);

function solarTermId(pinyin) {
  return String(pinyin).trim().toLowerCase().replace(/\s+/g, "_");
}

function lowerFirst(value) {
  return value ? `${value.charAt(0).toLocaleLowerCase("fr-FR")}${value.slice(1)}` : value;
}

function localizedResonanceReasons(result, natalTheme) {
  const daily = result.dayEnergy.stem.element;
  const master = natalTheme.dayMaster.element;
  const reasons = [];
  if (daily === master) reasons.push(t("guidance.resonanceReasons.same"));
  else if (GENERATES[daily] === master) reasons.push(t("guidance.resonanceReasons.nourishes"));
  else if (GENERATES[master] === daily) reasons.push(t("guidance.resonanceReasons.supports"));
  else if (CONTROLS[daily] === master || CONTROLS[master] === daily) reasons.push(t("guidance.resonanceReasons.controls"));
  else reasons.push(t("guidance.resonanceReasons.neutral"));
  if (result.dayEnergy.stem.polarity !== natalTheme.dayMaster.polarity) reasons.push(t("guidance.resonanceReasons.polarity"));
  return reasons;
}

function sectionHeader(kicker, title, intro) {
  const header = element("header", { className: "product-section__header" });
  if (kicker) header.append(element("p", { className: "product-eyebrow", text: kicker }));
  header.append(element("h2", { text: title }));
  if (intro) header.append(element("p", { className: "product-section__intro", text: intro }));
  return header;
}

function createOverview(result) {
  const card = element("section", { className: "product-card glance-card", attributes: { "aria-labelledby": "today-glance" } });
  card.append(sectionHeader(null, t("guidance.page.glance")));
  card.querySelector("h2").id = "today-glance";
  const grid = element("dl", { className: "glance-grid" });
  for (const [label, value] of [
    [t("guidance.overview.energy"), `${elementData(result.dayEnergy.stem.element).label} ${getConcept("bazi.polarities", result.dayEnergy.stem.polarity).label}`],
    [t("guidance.overview.rhythm"), result.dayEnergy.stem.polarity === "yang" ? t("guidance.rhythms.measuredMovement") : t("guidance.rhythms.activeObservation")],
    [t("guidance.overview.supported"), elementData(Object.keys(GENERATES).find((key) => GENERATES[key] === result.dayEnergy.stem.element)).label],
    [t("guidance.overview.attention"), elementData(Object.keys(CONTROLS).find((key) => CONTROLS[key] === result.dayEnergy.stem.element)).label],
  ]) {
    const item = element("div");
    item.append(element("dt", { text: label }), element("dd", { text: value }));
    grid.append(item);
  }
  card.append(grid);
  return card;
}

function createDayEnergy(result) {
  const stem = stemData(result.dayEnergy.stem.key);
  const branch = branchData(result.dayEnergy.branch.key);
  const energy = elementData(result.dayEnergy.stem.element);
  const summary = result.dayEnergy.stem.polarity === "yang"
    ? t("guidance.dailySummaryYang", { energy: energy.energyOf })
    : t("guidance.dailySummaryYin", { element: energy.withArticle });
  const card = element("section", { className: `product-card hero-card element-accent--${result.dayEnergy.stem.element}` });
  card.append(
    element("p", { className: "product-eyebrow", text: t("guidance.page.dayEnergy") }),
    element("p", { className: "hero-card__glyph", text: result.pillars.day.chinese }),
    element("h2", { className: "hero-card__value", text: `${stem.french} · ${branch.animal}` }),
    element("p", { className: "hero-card__meta", text: `${stem.label} · ${branch.label}` }),
    element("p", { className: "hero-card__summary", text: summary }),
  );
  return card;
}

function createResonance(result, natalTheme) {
  const card = element("section", { className: "product-card resonance-card" });
  card.append(sectionHeader(t("guidance.resonance.kicker"), t("guidance.page.resonance")));
  const level = element("div", { className: "resonance-level" });
  level.append(
    element("span", { text: t("guidance.resonance.harmony") }),
    element("strong", { text: t(`guidance.resonance.${result.resonance.level}`) }),
    element("small", { text: t("guidance.resonance.internalIndicator") }),
  );
  const text = element("div", { className: "resonance-copy" });
  text.append(
    element("p", { text: `Ton ${t("bazi.labels.dayMaster")} est ${stemData(natalTheme.dayMaster.key).french}.` }),
    ...localizedResonanceReasons(result, natalTheme).map((reason) => element("p", { text: reason })),
  );
  card.append(level, text);
  return card;
}

function createElementBalance(result) {
  const section = element("section", { className: "product-card" });
  section.append(sectionHeader(t("guidance.elements.kicker"), t("guidance.elements.title"), t("guidance.elements.intro")));
  const list = element("div", { className: "element-bars" });
  for (const item of Object.values(result.elements)) {
    const localized = elementData(item.key);
    const row = element("div", { className: `element-row element-row--${item.key}` });
    const label = element("div", { className: "element-row__label" });
    label.append(
      element("strong", { text: localized.label }),
      element("span", { text: item.dailyCount ? t("guidance.elements.dailyAddition", { count: item.dailyCount }) : t("guidance.elements.stable") }),
    );
    const meter = element("div", { className: "element-meter", attributes: {
      role: "meter", "aria-label": `${localized.label} : ${formatPercent(item.percent)} dans la lecture combinée`,
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(item.percent),
    } });
    const fill = element("span", { className: "element-meter__fill" });
    fill.style.width = `${item.percent}%`;
    meter.append(fill);
    row.append(label, meter, element("span", { className: "element-row__value", text: formatPercent(item.percent) }));
    list.append(row);
  }
  section.append(list);
  return section;
}

function createGuidance(result) {
  const section = element("section", { className: "product-card guidance-card" });
  section.append(sectionHeader(t("common.app.dialogueTitle"), t("guidance.page.guidance")));
  const grid = element("div", { className: "guidance-grid" });
  const localizedAdvice = getConcept("guidance.elementAdvice", result.dayEnergy.stem.element);
  for (const [title, items] of [[t("guidance.advice.favor"), localizedAdvice.favor], [t("guidance.advice.moderate"), localizedAdvice.moderate]]) {
    const group = element("div");
    group.append(element("h3", { text: title }));
    const list = element("ul");
    for (const item of items) list.append(element("li", { text: item }));
    group.append(list);
    grid.append(group);
  }
  const rhythm = element("div", { className: "guidance-rhythm" });
  rhythm.append(element("span", { text: t("guidance.advice.rhythm") }), element("strong", { text: result.dayEnergy.stem.polarity === "yang" ? t("guidance.rhythms.consciousAction") : t("guidance.rhythms.activeContemplation") }));
  const domains = element("div", { className: "domain-pills", attributes: { "aria-label": t("guidance.advice.supportedDomains") } });
  for (const domain of localizedAdvice.domains) domains.append(element("span", { text: domain }));
  section.append(grid, rhythm, domains);
  return section;
}

function domainCard(title, status, text, className = "") {
  const card = element("article", { className: `product-card daily-domain-card ${className}`.trim() });
  card.append(
    element("div", { className: "daily-domain-card__heading" }),
    element("p", { text }),
  );
  card.firstElementChild.append(element("h2", { text: title }), element("span", { text: status }));
  return card;
}

function createDetailedGuidance(result, natalTheme) {
  const section = element("section", { className: "product-section daily-guidance-detail" });
  section.append(sectionHeader(t("guidance.detailed.kicker"), t("guidance.detailed.title"), t("guidance.detailed.intro")));
  const dayElement = elementData(result.dayEnergy.stem.element);
  const dominant = elementData(result.domains.dominantElement);
  const quieter = elementData(result.domains.quieterElement);
  const supportKey = Object.keys(GENERATES).find((key) => GENERATES[key] === result.dayEnergy.stem.element);
  const attentionKey = Object.keys(CONTROLS).find((key) => CONTROLS[key] === result.dayEnergy.stem.element);
  const master = stemData(natalTheme.dayMaster.key);
  const branch = branchData(result.dayEnergy.branch.key);
  section.append(
    domainCard(t("guidance.detailed.support"), t("guidance.status.supportive"), t("guidance.detailed.supportCopy", { support: elementData(supportKey).label, dominant: dominant.label, day: dayElement.label })),
    domainCard(t("guidance.detailed.attention"), t("guidance.status.toModerate"), t("guidance.detailed.attentionCopy", { attention: elementData(attentionKey).label, quieter: quieter.label })),
    domainCard(t("guidance.detailed.relationships"), t(`guidance.status.${result.domains.relations}`), t(`guidance.detailed.relationshipCopy.${result.domains.relations}`, { animal: branch.animal, echoes: result.domains.branchEchoes })),
    domainCard(t("guidance.detailed.action"), t(`guidance.status.${result.domains.action}`), t(`guidance.detailed.actionCopy.${result.domains.action}`, { day: dayElement.label, master: master.french })),
    domainCard(t("guidance.detailed.creativity"), t(`guidance.status.${result.domains.creativity}`), t(`guidance.detailed.creativityCopy.${result.domains.creativity}`, { day: dayElement.label })),
    domainCard(t("guidance.detailed.rhythm"), t(`guidance.status.${result.domains.personalRhythm}`), t(`guidance.detailed.rhythmCopy.${result.domains.personalRhythm}`)),
    domainCard(t("guidance.detailed.retreat"), t(`guidance.status.${result.domains.retreat}`), t(`guidance.detailed.retreatCopy.${result.domains.retreat}`)),
  );
  return section;
}

function createSeason(result) {
  const localized = getConcept("calendar.solarTerms", solarTermId(result.solarTerm.pinyin));
  const section = element("section", { className: "product-card season-card" });
  section.append(
    sectionHeader(t("guidance.page.season"), localized.label),
    element("p", { className: "season-card__traditional", text: localized.traditional }),
    element("p", { text: localized.explanation }),
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
  details.append(element("summary", { text: t("guidance.page.deepen") }));
  const content = element("div", { className: "product-disclosure__content" });
  const pillars = element("div", { className: "mini-pillar-grid" });
  pillars.append(pillarMini(t("bazi.pillars.year"), result.pillars.year), pillarMini(t("bazi.pillars.month"), result.pillars.month), pillarMini(t("bazi.pillars.day"), result.pillars.day));
  content.append(
    pillars,
    element("p", { className: "method-note", text: t("guidance.methodology") }),
    element("p", { className: "symbolic-note", text: t("guidance.symbolicNote") }),
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
      renderError(t("guidance.errors.profileRequired"));
      return null;
    }
    const { profile, natalTheme, result } = reading;
    const header = element("header", { className: "product-header" });
    header.append(
      element("p", { className: "product-eyebrow", text: t("guidance.page.eyebrow") }),
      element("h1", { text: formatLongDate(result.date, result.timeZone) }),
      element("p", { className: "product-lead", text: t("guidance.greeting", { firstName: profile.firstName }) }),
    );
    root.replaceChildren(header, createOverview(result), createDayEnergy(result), createDetailedGuidance(result, natalTheme), createResonance(result, natalTheme), createElementBalance(result), createGuidance(result), createSeason(result), createDetails(result), glossaryDisclosure(["dayMaster", "fiveElements", "yinYang", "jieQi", "generationCycle", "controlCycle"], "Glossaire de TAO"));
    await setTaoNarrativeState("observing");
    return result;
  } catch (error) {
    console.error("[TAO] Lecture quotidienne impossible.", error);
    renderError(t("guidance.errors.unavailable"));
    return null;
  }
}

async function updatePavilionDialogue() {
  try {
    const reading = getActiveDailyReading();
    if (!reading) return;
    const key = reading.result.dayEnergy.stem.element;
    const summary = reading.result.dayEnergy.stem.polarity === "yang"
      ? t("guidance.dailySummaryYang", { energy: elementData(key).energyOf })
      : t("guidance.dailySummaryYin", { element: elementData(key).withArticle });
    const localizedTerm = getConcept("calendar.solarTerms", solarTermId(reading.result.solarTerm.pinyin));
    const advice = getConcept("guidance.elementAdvice", key);
    const resonanceLevel = t(`guidance.resonance.${reading.result.resonance.level}`).toLocaleLowerCase("fr-FR");
    setTaoDailyBrief({
      context: `${t("guidance.dailyBrief.context")} · ${stemData(reading.result.dayEnergy.stem.key).french}`,
      meta: `${formatLongDate(reading.result.date, reading.result.timeZone)} · ${localizedTerm.label}`,
      messages: [
        t("guidance.dailyBrief.energy", { firstName: reading.profile.firstName, summary }),
        t("guidance.dailyBrief.season", { term: `${localizedTerm.label} — ${localizedTerm.traditional}`, explanation: localizedTerm.explanation }),
        t("guidance.dailyBrief.advice", { favor: lowerFirst(advice.favor[0]), moderate: lowerFirst(advice.moderate[0]) }),
        t("guidance.dailyBrief.resonance", { level: resonanceLevel }),
      ],
    });
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
