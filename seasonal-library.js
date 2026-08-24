import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { getActiveProfile } from "./profile-store.js";
import { getSeasonCycle, getSeasonalPeriod } from "./seasonal-balance.mjs?v=1.2.0";
import { JIE_QI, MOVEMENT_KEYS, MOVEMENTS, ORGAN_SYSTEMS, SEASON_MOVEMENT_INTERACTIONS, YIN_YANG_PAIRS, getJieQiByPinyin } from "./seasonal-knowledge.mjs?v=1.0.0";
import { createSourceBadge, openTaoSheet } from "./tao-components.js?v=1.1.0";
import { element } from "./tao-ui.js";

const pavilionRoot = document.querySelector("[data-seasonal-pavilion]");
const LEVELS = Object.freeze([
  { id: "discover", label: "🌱 Je découvre" },
  { id: "understand", label: "☯️ Je comprends" },
  { id: "theme", label: "🧭 Mon thème" },
]);

function formatDate(epochMs, withYear = false) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(new Date(epochMs));
}

function infoBlock(kind, title, text) {
  const labels = { observation: "👀 Observation", tradition: "☯️ Tradition chinoise", science: "🔬 Science moderne", example: "🧑 Exemple", takeaway: "💡 À retenir" };
  const section = element("section", { className: `season-knowledge__block season-knowledge__block--${kind}` });
  section.append(element("span", { className: "season-knowledge__signal", text: labels[kind] }), element("h3", { text: title }), element("p", { text }));
  return section;
}

function organSheet(organKey, opener) {
  const organ = ORGAN_SYSTEMS[organKey];
  const pair = ORGAN_SYSTEMS[organ.pair];
  const content = element("div", { className: "organ-sheet" });
  const facts = element("dl", { className: "organ-sheet__facts" });
  for (const [label, value] of [["Système", `${organ.polarity} · ${MOVEMENTS[organ.movement].label}`], ["Saison", MOVEMENTS[organ.movement].season], ["Couple", pair.label], ["Climat traditionnel", organ.climate], ["Émotion traditionnelle", organ.emotion], ["Tissu", organ.tissue], ["Sens / orifice", organ.sense]]) {
    const row = element("div"); row.append(element("dt", { text: label }), element("dd", { text: value })); facts.append(row);
  }
  const functions = element("ul"); organ.functions.forEach((text) => functions.append(element("li", { text })));
  content.append(
    createSourceBadge("season", "Système fonctionnel traditionnel"),
    element("p", { className: "organ-sheet__simple", text: organ.simple }),
    facts,
    element("h3", { text: "Fonctions attribuées dans les textes" }), functions,
    infoBlock("tradition", `Pourquoi ${MOVEMENTS[organ.movement].label} ?`, organ.whyMovement),
    infoBlock("tradition", `Pourquoi ${MOVEMENTS[organ.movement].season} ?`, organ.whySeason),
    infoBlock("tradition", `Pourquoi ${pair.label} ?`, organ.whyPair),
    infoBlock("tradition", `Pourquoi ${organ.sense.toLocaleLowerCase("fr-FR")} ?`, organ.whySense),
    infoBlock("science", "Est-ce scientifiquement démontré ?", organ.science),
    element("p", { className: "symbolic-note", text: "Cette fiche explique une classification traditionnelle. Elle ne constitue ni un diagnostic ni une prédiction médicale." }),
  );
  openTaoSheet({ title: `${organ.label} · ${organ.chinese} · ${organ.pinyin}`, label: "Saisons, Mouvements & Corps", content, opener });
}

function organButton(organKey) {
  const organ = ORGAN_SYSTEMS[organKey];
  const button = element("button", { className: "season-organ-button", attributes: { type: "button", "aria-haspopup": "dialog" } });
  button.append(element("strong", { text: `${organ.label} · ${organ.chinese}` }), element("span", { text: `${organ.pinyin} · ${organ.polarity}` }), element("b", { text: "Pourquoi ?" }));
  button.addEventListener("click", () => organSheet(organKey, button));
  return button;
}

function discoverPanel(movementKey) {
  const movement = MOVEMENTS[movementKey];
  const panel = element("div", { className: "season-knowledge__panel" });
  panel.append(
    element("blockquote", { text: `« Avant le vocabulaire traditionnel, regardons simplement ce qui change autour de nous pendant ${movement.season.toLocaleLowerCase("fr-FR")}. »` }),
    infoBlock("observation", "Ce que l’on peut observer", movement.nature),
    infoBlock("example", "Une image de la vie réelle", movement.analogy),
    infoBlock("tradition", `Pourquoi le Mouvement ${movement.label} ?`, movement.why),
    infoBlock("takeaway", "L’idée la plus simple", movement.takeaway),
    infoBlock("science", "Est-ce scientifiquement démontré ?", `Les variations de lumière, de température et d’environnement sont observables et étudiées. Leur classement sous le nom ${movement.label}, ainsi que les correspondances avec les organes, appartient au cadre traditionnel du Wu Xing.`),
  );
  return panel;
}

function understandPanel(movementKey) {
  const movement = MOVEMENTS[movementKey];
  const pair = YIN_YANG_PAIRS[movementKey];
  const panel = element("div", { className: "season-knowledge__panel" });
  const organs = element("div", { className: "season-organ-grid" });
  organs.append(organButton(pair.yin), organButton(pair.yang));
  const relations = element("div", { className: "season-cycle-visual" });
  const generates = MOVEMENT_KEYS.find((key) => MOVEMENTS[key] && SEASON_MOVEMENT_INTERACTIONS[movementKey][key].kind === "seasonGeneratesProfile");
  const controlled = MOVEMENT_KEYS.find((key) => SEASON_MOVEMENT_INTERACTIONS[movementKey][key].kind === "seasonControlsProfile");
  relations.append(element("p", { text: `Cycle Sheng · ${movement.icon} ${movement.label} nourrit ${MOVEMENTS[generates].icon} ${MOVEMENTS[generates].label}` }), element("p", { text: `Cycle Ke · ${movement.icon} ${movement.label} contrôle ${MOVEMENTS[controlled].icon} ${MOVEMENTS[controlled].label}` }));
  const terms = element("details", { className: "product-disclosure" });
  const termList = element("ol", { className: "season-jieqi-list" });
  JIE_QI.filter((item) => item.movement === movementKey).forEach((item) => {
    const li = element("li"); li.append(element("strong", { text: `${item.label} · ${item.chinese}` }), element("span", { text: item.beginner })); termList.append(li);
  });
  terms.append(element("summary", { text: "Voir les Jie Qi de cette dynamique" }), termList);
  panel.append(
    infoBlock("tradition", "Le couple Yin / Yang", `${ORGAN_SYSTEMS[pair.yin].label} et ${ORGAN_SYSTEMS[pair.yang].label} ne sont pas juxtaposés arbitrairement. ${pair.explanation}`),
    organs,
    relations,
    terms,
    element("p", { className: "symbolic-note", text: "Sheng et Ke décrivent des relations de transformation et de régulation. Engendrer n’est pas toujours favorable ; contrôler n’est pas toujours défavorable." }),
  );
  return panel;
}

function themePanel(movementKey, profile, natalTheme) {
  const panel = element("div", { className: "season-knowledge__panel" });
  if (!profile || !natalTheme?.dayMaster?.element) {
    panel.append(element("p", { text: "Un profil BaZi calculable est nécessaire pour relier cette saison à votre thème. Aucun contenu personnalisé n’est inventé." }));
    return panel;
  }
  const master = natalTheme.dayMaster.element;
  const interaction = SEASON_MOVEMENT_INTERACTIONS[movementKey][master];
  const counts = MOVEMENT_KEYS.map((key) => `${MOVEMENTS[key].label} ${Number(natalTheme.elements?.[key]?.count ?? 0)}`).join(" · ");
  panel.append(
    createSourceBadge("combined", "Saison sélectionnée × thème natal calculé"),
    element("h3", { text: `${profile.firstName} · ${interaction.title}` }),
    element("p", { className: "season-interaction__diagram", text: interaction.diagram }),
    element("p", { text: interaction.summary }),
    infoBlock("example", "Mais concrètement ?", interaction.example),
    element("p", { text: `Votre Maître du Jour fournit une porte d’entrée ${MOVEMENTS[master].label}. TAO ne réduit pas votre personne à ce seul Mouvement.` }),
    element("p", { className: "method-note", text: `Répartition calculée du thème : ${counts}. La saison de naissance, les Troncs, les Branches et les périodes longues restent distincts de cette introduction pédagogique.` }),
    element("a", { className: "product-button product-button--quiet", text: "Voir la composition complète de mon thème", attributes: { href: "#theme/composition" } }),
  );
  return panel;
}

function movementContent(movementKey, level, profile, natalTheme) {
  if (level === "understand") return understandPanel(movementKey);
  if (level === "theme") return themePanel(movementKey, profile, natalTheme);
  return discoverPanel(movementKey);
}

export function createSeasonalKnowledgeLibrary({ period, cycle, profile, natalTheme }) {
  let selectedMovement = cycle.movement;
  let selectedLevel = "discover";
  const library = element("section", { className: "season-knowledge", attributes: { "aria-labelledby": "season-knowledge-title" } });
  const header = element("header", { className: "season-knowledge__header" });
  header.append(createSourceBadge("season", "Calendrier solaire local · 24 Jie Qi"), element("p", { className: "product-eyebrow", text: "Bibliothèque guidée par TAO" }), element("h1", { id: "season-knowledge-title", text: "Saisons, Mouvements & Corps" }), element("p", { text: "Observer d’abord, comprendre l’exemple, puis seulement découvrir la terminologie chinoise." }));

  const progress = element("section", { className: `season-progress-card season-accent--${cycle.movement}` });
  const bar = element("div", { className: "season-progress-card__bar", attributes: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(cycle.progress * 100)), "aria-label": `Progression dans ${cycle.knowledge.season}` } });
  bar.style.setProperty("--season-progress", `${Math.round(cycle.progress * 100)}%`);
  const currentJie = getJieQiByPinyin(period.pinyin);
  const nextJie = getJieQiByPinyin(period.next.pinyin);
  progress.append(
    element("h2", { text: `${cycle.knowledge.icon} ${cycle.knowledge.season} · ${cycle.knowledge.label}` }),
    element("div", { className: "season-progress-card__dates", html: `<span>${formatDate(cycle.startEpochMs)}</span><strong>${Math.round(cycle.progress * 100)} %</strong><span>${formatDate(cycle.endEpochMs)}</span>` }),
    bar,
    element("p", { text: `${cycle.phase} · ${cycle.daysElapsed} jours écoulés · ${cycle.daysRemaining} jours restants` }),
    element("p", { text: `Jie Qi actuel : ${currentJie?.label ?? period.label} · ${currentJie?.chinese ?? ""} · prochain : ${nextJie?.label ?? period.next.label} dans ${period.daysUntilNext} jours.` }),
    element("small", { text: "Les saisons sont des dynamiques progressives. Modèle Terre retenu : quatre intersaisons de 18 jours avant les quatre débuts saisonniers ; d’autres écoles les présentent autrement." }),
  );

  const movementNav = element("nav", { className: "season-library-nav", attributes: { "aria-label": "Toutes les saisons" } });
  const levelNav = element("div", { className: "season-library-levels", attributes: { role: "tablist", "aria-label": "Profondeur de lecture" } });
  const content = element("div", { className: "season-knowledge__content" });
  const render = () => {
    movementNav.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.movement === selectedMovement)));
    levelNav.querySelectorAll("button").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.level === selectedLevel)));
    content.replaceChildren(movementContent(selectedMovement, selectedLevel, profile, natalTheme));
  };
  MOVEMENT_KEYS.forEach((key) => {
    const movement = MOVEMENTS[key];
    const button = element("button", { attributes: { type: "button", "data-movement": key, "aria-pressed": String(key === selectedMovement) } });
    button.append(element("span", { text: movement.icon }), element("strong", { text: movement.season }), element("small", { text: key === cycle.movement ? "VOUS ÊTES ICI" : movement.label }));
    button.addEventListener("click", () => { selectedMovement = key; render(); });
    movementNav.append(button);
  });
  LEVELS.forEach(({ id, label }) => {
    const button = element("button", { text: label, attributes: { type: "button", role: "tab", "data-level": id, "aria-selected": String(id === selectedLevel) } });
    button.addEventListener("click", () => { selectedLevel = id; render(); });
    levelNav.append(button);
  });
  const allTerms = element("details", { className: "product-disclosure season-all-jieqi" });
  const allTermsList = element("ol");
  JIE_QI.forEach((item) => { const li = element("li"); li.append(element("strong", { text: `${item.label} · ${item.chinese} · ${item.pinyin}` }), element("span", { text: item.observation })); allTermsList.append(li); });
  allTerms.append(element("summary", { text: "Voir le cycle complet des 24 Jie Qi" }), allTermsList);
  library.append(header, progress, movementNav, levelNav, content, allTerms);
  render();
  return library;
}

export function createPavilionSeasonCard(now = Date.now()) {
  const year = new Date(now).getUTCFullYear();
  const period = getSeasonalPeriod(now, year);
  const cycle = getSeasonCycle(now, year);
  const current = getJieQiByPinyin(period.pinyin);
  const card = element("article", { className: `pavilion-season-card season-accent--${cycle.movement}` });
  const bar = element("div", { className: "pavilion-season-card__bar", attributes: { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(cycle.progress * 100)) } });
  bar.style.setProperty("--season-progress", `${Math.round(cycle.progress * 100)}%`);
  card.append(
    element("p", { className: "product-eyebrow", text: "Saison actuelle" }),
    element("h2", { text: `${cycle.knowledge.icon} ${cycle.knowledge.season} · ${cycle.knowledge.label}` }),
    element("div", { className: "pavilion-season-card__dates", html: `<span>${formatDate(cycle.startEpochMs)}</span><span>${formatDate(cycle.endEpochMs)}</span>` }),
    bar,
    element("p", { className: "pavilion-season-card__phase", text: `${cycle.phase} · ${Math.round(cycle.progress * 100)} % · ${cycle.daysRemaining} jours restants` }),
    element("p", { text: `Période solaire : ${current?.pinyin ?? period.pinyin} · ${current?.chinese ?? ""} · « ${current?.label ?? period.label} »` }),
    element("blockquote", { text: `« ${cycle.knowledge.nature} La tradition décrit cette dynamique par le Mouvement ${cycle.knowledge.label}. »` }),
    element("div", { className: "product-actions", html: `<a class="product-button product-button--primary" href="#today/season">Comprendre cette saison</a><a class="product-button product-button--quiet" href="#today/season">Voir toutes les saisons</a>` }),
  );
  return card;
}

export function renderPavilionSeasonCard() {
  if (!pavilionRoot) return;
  pavilionRoot.replaceChildren(createPavilionSeasonCard());
}

export function getActiveSeasonalLibraryContext(now = Date.now()) {
  const profile = getActiveProfile();
  let natalTheme = null;
  if (profile) {
    try { natalTheme = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile)); } catch { natalTheme = null; }
  }
  const year = new Date(now).getUTCFullYear();
  return Object.freeze({ profile, natalTheme, period: getSeasonalPeriod(now, year), cycle: getSeasonCycle(now, year) });
}

window.addEventListener("tao:profile-created", renderPavilionSeasonCard);
window.addEventListener("tao:profile-changed", renderPavilionSeasonCard);
renderPavilionSeasonCard();
