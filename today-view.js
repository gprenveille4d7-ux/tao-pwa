import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateDailyTao } from "./daily-tao-engine.mjs?v=2.2.0";
import { getCachedDaily, setCachedDaily } from "./daily-cache.mjs?v=2.1.0";
import { element, formatLongDate, localDateIso } from "./tao-ui.js";
import { setTaoDailyBrief } from "./tao-dialogue.js";
import { setTaoNarrativeState } from "./tao-narrative.js";
import { formatPercent, getConcept, t } from "./locales/index.js?v=1.2.0";
import { glossaryDisclosure } from "./locales/glossary-ui.js";
import { createSectionNavigation, focusRequestedSection, markProductSection } from "./section-navigation.js";
import { parseAppRoute } from "./navigation-routes.mjs";
import { buildDailySemanticReading, getSemanticConcept } from "./semantic-layer.mjs?v=1.0.1";
import { buildSeasonalProfile, selectCareAdvice } from "./seasonal-balance.mjs?v=1.0.1";

const root = document.querySelector("[data-today-root]");
const semanticDebug = new URLSearchParams(location.search).get("debug") === "semantics";
const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const elementData = (key) => getConcept("bazi.elements", key);
const stemData = (key) => getConcept("bazi.heavenlyStems", key);
const branchData = (key) => getConcept("bazi.earthlyBranches", key);
const TODAY_SECTIONS = Object.freeze([
  { id: "guidance", label: "L’essentiel" },
  { id: "energies", label: "Pourquoi ?" },
  { id: "personal", label: "Pour toi" },
  { id: "cycles", label: "Le temps" },
  { id: "nature", label: "Ciel & nature" },
]);

function solarTermId(pinyin) {
  return String(pinyin).trim().toLowerCase().replace(/\s+/g, "_");
}

function lowerFirst(value) {
  return value ? `${value.charAt(0).toLocaleLowerCase("fr-FR")}${value.slice(1)}` : value;
}

function seasonalText(path, id) {
  return t(`seasonal.${path}.${id}`);
}

function movementDetails(period) {
  const correspondence = period.correspondence;
  return {
    movement: seasonalText("movements", period.movement),
    season: seasonalText("seasons", correspondence.season),
    organ: seasonalText("organs", correspondence.organ),
    bowel: seasonalText("bowels", correspondence.bowel),
    climate: seasonalText("climates", correspondence.climate),
  };
}

function createPillList(items, className = "seasonal-pills") {
  const list = element("ul", { className });
  items.forEach((item) => list.append(element("li", { text: item })));
  return list;
}

function createImmediateEssential(result, profile) {
  const personal = result.personalSignature;
  const card = element("article", { className: "today-swipe-card today-swipe-card--essential", attributes: { "data-swipe-card": "essential", "aria-labelledby": "today-swipe-essential", tabindex: "0" } });
  card.append(
    element("p", { className: "product-eyebrow", text: seasonalText("carousel", "essential") }),
    element("h2", { text: personal?.primarySignal ?? `Aujourd’hui, ${profile.firstName}` }),
    element("p", { className: "today-swipe-card__lead", text: personal?.concreteAdvice ?? result.dayEnergy.summary }),
  );
  card.querySelector("h2").id = "today-swipe-essential";
  const axes = (personal?.supports ?? result.guidance.favor).slice(0, 2);
  if (axes.length) card.append(element("strong", { className: "today-swipe-card__label", text: t("guidance.advice.favor") }), createPillList(axes));
  return card;
}

function transitionCopy(period) {
  if (period.daysUntilNext === 0) return seasonalText("transition", "today");
  return t("seasonal.transition.inDays", { days: period.daysUntilNext });
}

function createSeasonSummaryCard(result, seasonal) {
  const period = result.solarTerm;
  const details = movementDetails(period);
  const card = element("article", { className: `today-swipe-card today-swipe-card--season season-accent--${period.movement}`, attributes: { "data-swipe-card": "season", "aria-labelledby": "today-swipe-season", tabindex: "0" } });
  card.append(
    element("p", { className: "product-eyebrow", text: period.transitionWindow ? seasonalText("transition", period.daysSinceCurrent <= 2 ? "recent" : "approaching") : seasonalText("carousel", "season") }),
    element("h2", { text: seasonalText("movementTitles", period.movement) }),
    element("p", { className: "today-swipe-card__meta", text: `${getConcept("calendar.solarTerms", solarTermId(period.pinyin)).label} · ${transitionCopy(period)}` }),
    element("p", { className: "today-swipe-card__fact", text: `${seasonalText("labels", "movement")} · ${details.movement}` }),
    element("p", { className: "today-swipe-card__fact", text: `${seasonalText("labels", "traditional")} · ${details.organ} · ${details.bowel}` }),
    element("p", { className: "today-swipe-card__lead", text: t(`seasonal.relation.${seasonal.relation}`) }),
    createPillList(seasonal.axes.map((axis) => seasonalText("axes", axis))),
    element("a", { className: "product-button today-swipe-card__action", text: seasonalText("carousel", "explore"), attributes: { href: "#today/season" } }),
  );
  card.querySelector("h2").id = "today-swipe-season";
  return card;
}

function createCareCard(seasonal) {
  const adviceIds = selectCareAdvice(seasonal);
  const card = element("article", { className: "today-swipe-card today-swipe-card--care", attributes: { "data-swipe-card": "care", "aria-labelledby": "today-swipe-care", tabindex: "0" } });
  card.append(
    element("p", { className: "product-eyebrow", text: seasonalText("carousel", "care") }),
    element("h2", { text: seasonal.axes.includes("recovery") ? "Aujourd’hui, préservez votre rythme" : "Aujourd’hui, soutenez votre équilibre" }),
    element("p", { className: "today-swipe-card__lead", text: seasonal.weather.available ? seasonalText("weather", seasonal.weather.primary) : seasonalText("weather", "unavailable") }),
    createPillList(adviceIds.map((id) => seasonalText("advice", id)), "seasonal-advice-list"),
    element("a", { className: "product-button today-swipe-card__action", text: seasonalText("carousel", "advice"), attributes: { href: "#today/guidance" } }),
  );
  card.querySelector("h2").id = "today-swipe-care";
  return card;
}

function createTodayCarousel(result, profile, seasonal) {
  const region = element("section", { className: "today-carousel", attributes: { "aria-label": seasonalText("carousel", "label") } });
  const track = element("div", { className: "today-carousel__track", attributes: { "data-today-carousel": "", tabindex: "0" } });
  const cards = [createImmediateEssential(result, profile), createSeasonSummaryCard(result, seasonal), createCareCard(seasonal)];
  if (result.solarTerm.transitionWindow) cards.unshift(cards.splice(1, 1)[0]);
  track.append(...cards);
  const status = element("p", { className: "today-carousel__status sr-only", attributes: { "aria-live": "polite" } });
  const dots = element("div", { className: "today-carousel__dots", attributes: { "aria-hidden": "true" } });
  cards.forEach((_, index) => dots.append(element("span", { className: index ? "" : "is-active" })));
  const update = () => {
    const index = Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / Math.max(1, cards[0].getBoundingClientRect().width + 14))));
    [...dots.children].forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
    status.textContent = t("seasonal.carousel.position", { current: index + 1, total: cards.length });
  };
  let frame = 0;
  track.addEventListener("scroll", () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const current = Math.round(track.scrollLeft / Math.max(1, cards[0].getBoundingClientRect().width + 14));
    cards[Math.max(0, Math.min(cards.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)))]?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", inline: "start", block: "nearest" });
  });
  region.append(track, dots, status);
  update();
  return region;
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
    ["Mouvement du jour", getSemanticConcept("elements", result.dayEnergy.stem.element).humanTitle],
    ["Manière d’avancer", result.dayEnergy.stem.polarity === "yang" ? "Agir avec une direction claire" : "Laisser mûrir avant d’agir"],
    ["Appui disponible", getSemanticConcept("elements", Object.keys(GENERATES).find((key) => GENERATES[key] === result.dayEnergy.stem.element)).humanTitle],
    ["À ménager", getSemanticConcept("elements", Object.keys(CONTROLS).find((key) => CONTROLS[key] === result.dayEnergy.stem.element)).humanTitle],
  ]) {
    const item = element("div");
    item.append(element("dt", { text: label }), element("dd", { text: value }));
    grid.append(item);
  }
  card.append(grid);
  return card;
}

function createHumanGuidance(result, natalTheme, profile) {
  const semantic = buildDailySemanticReading({ result, natalTheme, firstName: profile.firstName });
  const advice = getConcept("guidance.elementAdvice", result.dayEnergy.stem.element);
  const card = element("section", { className: "product-card semantic-lead" });
  const personal = result.personalSignature;
  card.append(
    element("p", { className: "product-eyebrow", text: `Bonjour ${profile.firstName}` }),
    element("h2", { text: personal?.primarySignal ?? semantic.lead }),
    element("p", { className: "semantic-lead__personal", text: personal?.concreteAdvice ?? semantic.personal }),
  );
  const guidance = element("div", { className: "semantic-guidance-grid" });
  for (const [title, items] of [["Ce qui te soutient", personal?.supports ?? advice.favor], ["Ce qui demande de l’attention", personal?.attentions ?? advice.moderate]]) {
    const group = element("section");
    group.append(element("h3", { text: title }), element("p", { text: items.join(" · ") }));
    guidance.append(group);
  }
  card.append(guidance);
  return { card, semantic };
}

function createWhyDisclosure(result, natalTheme, semantic) {
  const details = element("details", { className: "product-disclosure semantic-why" });
  details.append(element("summary", { text: "Pourquoi TAO me dit ça ?" }));
  const content = element("div", { className: "product-disclosure__content semantic-why__content" });
  const signature = result.personalSignature;
  content.append(
    sectionHeader("Ce que TAO observe", "La rencontre entre cette journée et ton thème"),
    element("h3", { text: "Le mouvement de la journée" }),
    element("p", { text: `${semantic.dailyStem.humanTitle} donne la tonalité du jour. ${semantic.dailyStem.humanDescription}` }),
    element("h3", { text: "Sa rencontre avec ton thème" }),
    element("p", { text: signature?.primarySignal ?? semantic.relation.explanation }),
    ...(signature?.facts?.length ? [element("h3", { text: "Les faits réellement utilisés" }), (() => { const list = element("ul"); signature.facts.forEach((fact) => list.append(element("li", { text: fact.label }))); return list; })()] : []),
    element("h3", { text: "Ce qui nuance la lecture" }),
    element("p", { text: "Cette observation dépend aussi des autres éléments, des branches et de l’équilibre général du thème. Elle indique une dynamique symbolique, jamais un événement certain." }),
  );
  const traditional = element("details", { className: "semantic-technical" });
  traditional.append(
    element("summary", { text: "Voir les données traditionnelles" }),
    element("p", { text: `Énergie du jour : ${semantic.dailyStem.traditionalLabel} — ${semantic.dailyStem.technicalFrench}` }),
    element("p", { text: `Énergie fondamentale : ${semantic.masterStem.traditionalLabel} — ${semantic.masterStem.technicalFrench}` }),
    element("p", { text: `Relation : ${semantic.relation.humanLabel}` }),
  );
  content.append(traditional);
  const talk = element("button", { className: "product-button semantic-talk", text: "En parler avec TAO", attributes: { type: "button" } });
  talk.addEventListener("click", () => window.dispatchEvent(new CustomEvent("tao:ai-open", { detail: {
    mode: "explanation",
    prompt: "Montre-moi pourquoi cette lecture est liée à ma journée et à mon thème.",
    contextOptions: { facts: signature?.facts ?? semantic.trace.sourceFacts.map((value, index) => ({ id: `semantic_fact_${index + 1}`, type: "SEMANTIC_TRACE", value, label: value })) },
  } })));
  content.append(talk);
  if (semanticDebug) {
    const trace = element("details", { className: "semantic-debug" });
    trace.append(element("summary", { text: "Trace sémantique DEV" }), element("pre", { text: JSON.stringify(semantic.trace, null, 2) }));
    content.append(trace);
  }
  details.append(content);
  return details;
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
    element("p", { className: "product-eyebrow", text: "Lecture traditionnelle de la journée" }),
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
  const synthesis = element("button", { className: "product-button product-button--primary semantic-talk", text: "Demander une synthèse à TAO", attributes: { type: "button" } });
  synthesis.addEventListener("click", () => window.dispatchEvent(new CustomEvent("tao:ai-open", { detail: {
    mode: "daily_synthesis",
    prompt: "Que dois-je retenir de cette journée ?",
    autoSend: true,
  } })));
  section.append(synthesis);
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
    domainCard(t("guidance.detailed.support"), t("guidance.status.supportive"), t("guidance.detailed.supportCopy", { support: elementData(supportKey).of, dominant: dominant.withArticle, day: dayElement.of })),
    domainCard(t("guidance.detailed.attention"), t("guidance.status.toModerate"), t("guidance.detailed.attentionCopy", { attention: elementData(attentionKey).withArticle, quieter: `L’élément ${quieter.label}` })),
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

function seasonFact(label, value, description = "") {
  const item = element("article", { className: "season-detail__fact" });
  item.append(element("strong", { text: value }), element("span", { text: label }));
  if (description) item.append(element("small", { text: description }));
  return item;
}

function createSeasonDetail(result, profile, seasonal) {
  const period = result.solarTerm;
  const details = movementDetails(period);
  const localizedTerm = getConcept("calendar.solarTerms", solarTermId(period.pinyin));
  const wrapper = element("section", { className: `season-detail season-accent--${period.movement}`, attributes: { "aria-labelledby": "season-detail-title" } });
  const back = element("a", { className: "season-detail__back", text: seasonalText("page", "back"), attributes: { href: "#today/guidance" } });
  const intro = element("section", { className: "product-card season-detail__hero" });
  const ring = element("div", { className: "season-cycle", attributes: { role: "img", "aria-label": `${seasonalText("labels", "progress")} : ${Math.round(period.progress * 100)} %` } });
  ring.style.setProperty("--season-progress", `${Math.round(period.progress * 360)}deg`);
  ring.append(element("strong", { text: `${Math.round(period.progress * 100)} %` }), element("span", { text: details.season }));
  intro.append(
    element("p", { className: "product-eyebrow", text: seasonalText("page", "now") }),
    element("h1", { id: "season-detail-title", text: seasonalText("movementTitles", period.movement) }),
    element("p", { className: "season-detail__term", text: `${localizedTerm.label} · ${localizedTerm.traditional}` }),
    element("p", { text: `${transitionCopy(period)} · ${seasonalText("movements", period.movement)}` }),
    ring,
  );

  const meaning = element("section", { className: "product-card" });
  meaning.append(sectionHeader(null, seasonalText("page", "meaning")), element("p", { text: seasonalText("meanings", period.movement) }));

  const correspondences = element("section", { className: "product-card" });
  const factGrid = element("div", { className: "season-detail__facts" });
  factGrid.append(
    seasonFact(seasonalText("labels", "organ"), details.organ),
    seasonFact(seasonalText("labels", "bowel"), details.bowel),
    seasonFact(seasonalText("labels", "climate"), details.climate),
  );
  correspondences.append(sectionHeader(null, seasonalText("page", "correspondences")), factGrid, element("p", { className: "symbolic-note", text: t("seasonal.disclaimer") }));

  const personal = element("section", { className: "product-card" });
  personal.append(
    sectionHeader(profile.firstName, seasonalText("page", "profile")),
    element("p", { text: t(`seasonal.relation.${seasonal.relation}`) }),
    element("p", { text: t(`seasonal.natalPresence.${seasonal.natalPresence}`) }),
  );

  const weather = element("section", { className: "product-card" });
  weather.append(sectionHeader(null, seasonalText("page", "weather")));
  if (seasonal.weather.available) {
    const raw = seasonal.weather.raw;
    const facts = [
      ["Température", Number.isFinite(Number(raw.temperature)) ? `${Math.round(raw.temperature)} °C` : null],
      ["Humidité", Number.isFinite(Number(raw.humidity)) ? `${Math.round(raw.humidity)} %` : null],
      ["Vent", Number.isFinite(Number(raw.windSpeed)) ? `${Math.round(raw.windSpeed)} km/h` : null],
    ].filter(([, value]) => value);
    const grid = element("div", { className: "season-weather-grid" });
    facts.forEach(([label, value]) => grid.append(seasonFact(label, value)));
    weather.append(grid, element("p", { text: seasonalText("weather", seasonal.weather.primary) }), element("small", { text: seasonalText("labels", "source") }));
  } else weather.append(element("p", { text: seasonalText("weather", "unavailable") }));

  const support = element("section", { className: "product-card season-detail__support" });
  support.append(
    sectionHeader(null, seasonalText("page", "axes")),
    createPillList(seasonal.axes.map((axis) => seasonalText("axes", axis))),
    element("h2", { text: seasonalText("page", "habits") }),
    createPillList(selectCareAdvice(seasonal).map((id) => seasonalText("advice", id)), "seasonal-advice-list"),
  );

  const observe = element("section", { className: "product-card season-detail__observe" });
  observe.append(
    sectionHeader(null, seasonalText("page", "observe")),
    createPillList(t("seasonal.observation"), "seasonal-advice-list"),
    element("p", { className: "symbolic-note", text: t("seasonal.healthNote") }),
  );
  wrapper.append(back, intro, meaning, correspondences, personal, weather, support, observe);
  return wrapper;
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

function groupSection(id, ...children) {
  const section = markProductSection(element("section", { className: "product-depth-section" }), "today", id);
  section.append(...children);
  return section;
}

function createCycles(result) {
  const section = element("section", { className: "product-card" });
  section.append(sectionHeader("Repères temporels", "Les cycles autour de cette journée", "TAO distingue ici ce que le moteur calcule déjà de ce qui demande encore un moteur dédié."));
  const grid = element("div", { className: "cycle-snapshot" });
  for (const [label, pillar] of [["Année", result.pillars.year], ["Mois", result.pillars.month], ["Jour", result.pillars.day]]) {
    const card = element("article");
    card.append(element("span", { text: label }), element("strong", { text: pillar.chinese }), element("small", { text: pillar.label }));
    grid.append(card);
  }
  const waiting = element("aside", { className: "engine-status", attributes: { role: "note" } });
  waiting.append(element("strong", { text: "Tes grands cycles de vie" }), element("p", { text: "Cette lecture demande encore un moteur déterministe dédié. TAO n’invente aucune période tant que ce calcul n’est pas vérifié." }));
  const traditional = element("small", { text: "Terme traditionnel : Da Yun · 大運" });
  waiting.append(traditional);
  section.append(grid, waiting);
  return section;
}

function createNature(result) {
  const section = element("section", { className: "product-depth-stack" });
  section.append(createSeason(result));
  const astronomy = element("section", { className: "product-card engine-status" });
  astronomy.append(sectionHeader("Repère astronomique", "Lune et événements célestes"), element("p", { text: "Ces données ne sont pas calculées dans la version actuelle. Elles resteront séparées des repères BaZi lorsqu’un moteur astronomique local sera disponible." }));
  section.append(astronomy);
  return section;
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
  const cached = getCachedDaily(input);
  const result = cached?.solarTerm?.movement && cached.solarTerm.correspondence
    ? cached
    : setCachedDaily(input, calculateDailyTao(input));
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
    const human = createHumanGuidance(result, natalTheme, profile);
    const weather = globalThis.taoEnvironment?.getWeatherState?.() ?? null;
    const seasonal = buildSeasonalProfile({ period: result.solarTerm, natalTheme, dailyResult: result, weather });
    const header = element("header", { className: "product-header" });
    header.append(
      element("p", { className: "product-eyebrow", text: t("guidance.page.eyebrow") }),
      element("h1", { text: formatLongDate(result.date, result.timeZone) }),
      element("p", { className: "product-lead", text: "TAO commence par ce qui peut t’être utile, puis te laisse découvrir la lecture traditionnelle à ton rythme." }),
    );
    const route = parseAppRoute(location.hash);
    if (route.section === "season") {
      root.replaceChildren(createSeasonDetail(result, profile, seasonal));
      await setTaoNarrativeState("observing");
      return result;
    }
    root.replaceChildren(
      header,
      createTodayCarousel(result, profile, seasonal),
      createSectionNavigation("today", TODAY_SECTIONS, "Explorer Aujourd’hui"),
      groupSection("guidance", human.card, createOverview(result), createGuidance(result), createDetailedGuidance(result, natalTheme)),
      groupSection("energies", createWhyDisclosure(result, natalTheme, human.semantic), createDayEnergy(result), createElementBalance(result), createDetails(result)),
      groupSection("personal", createResonance(result, natalTheme)),
      groupSection("cycles", createCycles(result)),
      groupSection("nature", createNature(result), glossaryDisclosure(["dayMaster", "fiveElements", "yinYang", "jieQi", "generationCycle", "controlCycle"], "Glossaire de TAO")),
    );
    focusRequestedSection(root, "today", route.section, { scroll: route.section !== "guidance" });
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
  if (location.hash.startsWith("#today")) renderTodayView();
});
window.addEventListener("tao:environment-change", () => {
  if (location.hash.startsWith("#today")) renderTodayView();
});

if (location.hash.startsWith("#today")) renderTodayView();
