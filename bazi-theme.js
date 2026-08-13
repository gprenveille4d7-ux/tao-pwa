import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { element, formatBirthDate, formatPlace } from "./tao-ui.js";
import { setTaoNarrativeState } from "./tao-narrative.js";
import { formatPercent, getConcept, t } from "./locales/index.js?v=1.2.0";
import { glossaryDisclosure } from "./locales/glossary-ui.js";
import { branchRelations, visibleTenGods } from "./bazi-insights.mjs?v=1.0.1";
import { createSectionNavigation, focusRequestedSection, markProductSection } from "./section-navigation.js";
import { parseAppRoute } from "./navigation-routes.mjs";
import { getSemanticConcept } from "./semantic-layer.mjs?v=1.0.1";

const root = document.querySelector("[data-bazi-root]");
const debugEnabled = new URLSearchParams(location.search).get("debug") === "bazi";

const elementData = (key) => getConcept("bazi.elements", key);
const polarityData = (key) => getConcept("bazi.polarities", key);
const stemData = (key) => getConcept("bazi.heavenlyStems", key);
const branchData = (key) => getConcept("bazi.earthlyBranches", key);
const THEME_SECTIONS = Object.freeze([
  { id: "overview", label: "En un coup d’œil" }, { id: "pillars", label: "Quatre facettes" },
  { id: "elements", label: "Tes mouvements" }, { id: "structure", label: "Sous la surface" },
  { id: "ten-gods", label: "Grandes dynamiques" }, { id: "cycles", label: "Cycles de vie" }, { id: "life", label: "Pistes de lecture" },
]);
const PILLAR_LABELS = Object.freeze({ year: "Année", month: "Mois", day: "Jour", hour: "Heure" });

function header(profile) {
  const node = element("header", { className: "product-header theme-header" });
  node.append(
    element("p", { className: "product-eyebrow", text: t("common.navigation.theme") }),
    element("h1", { text: profile.firstName }),
    element("p", { className: "product-lead", text: t("bazi.ui.themeLead") }),
  );
  const details = element("dl", { className: "profile-facts" });
  for (const [label, value] of [
    [t("profiles.facts.birth"), formatBirthDate(profile.birthDate)],
    [t("profiles.facts.place"), formatPlace(profile.birthPlace)],
    [t("profiles.facts.localTime"), profile.birthTimeKnown ? profile.birthTime : t("profiles.fields.unknownTime")],
  ]) {
    const item = element("div");
    item.append(element("dt", { text: label }), element("dd", { text: value }));
    details.append(item);
  }
  node.append(details);
  return node;
}

function dayMaster(result) {
  const master = result.dayMaster;
  const localizedStem = stemData(master.key);
  const localizedElement = elementData(master.element);
  const localizedPolarity = polarityData(master.polarity);
  const semantic = getSemanticConcept("stems", master.key);
  const card = element("section", { className: `product-card day-master-card element-accent--${master.element}` });
  card.append(
    element("p", { className: "product-eyebrow", text: "Ton énergie fondamentale" }),
    element("span", { className: "day-master-card__glyph", text: localizedStem.hanzi }),
    element("p", { className: "day-master-card__name", text: semantic.icon }),
    element("h2", { text: semantic.humanTitle }),
    element("p", { className: "semantic-keywords", text: semantic.keywords.join(" · ") }),
    element("p", { className: "day-master-card__copy", text: semantic.humanDescription }),
  );
  const details = element("details", { className: "semantic-technical day-master-card__details" });
  details.append(
    element("summary", { text: "Comprendre mon énergie" }),
    element("p", { text: `Dans la lecture BaZi, le Maître du Jour est le point central à partir duquel les relations du thème sont observées.` }),
    element("p", { text: `${semantic.traditionalLabel} — ${localizedElement.label} ${localizedPolarity.label}` }),
    element("p", { text: "Cette énergie constitue un repère de lecture : elle ne résume pas une personne à elle seule." }),
  );
  card.append(details);
  return card;
}

function pillarCard(name, pillar, highlighted = false) {
  const card = element("article", { className: `pillar-card${highlighted ? " pillar-card--day" : ""}${pillar.determined ? "" : " pillar-card--unknown"}` });
  card.append(element("p", { className: "product-eyebrow", text: name }));
  if (!pillar.determined) {
    card.append(element("h3", { text: t("common.states.notDetermined") }), element("p", { text: t("bazi.ui.undeterminedHour") }));
    return card;
  }
  const localizedStem = stemData(pillar.stem.key);
  const localizedBranch = branchData(pillar.branch.key);
  const signs = element("div", { className: "pillar-card__signs" });
  for (const [kind, sign, extra] of [
    [t("bazi.labels.heavenlyStem"), localizedStem, localizedStem.french],
    [t("bazi.labels.earthlyBranch"), localizedBranch, localizedBranch.french],
  ]) {
    const item = element("div");
    item.append(element("span", { text: kind }), element("strong", { text: sign.hanzi }), element("b", { text: sign.pinyin }), element("small", { text: extra }));
    signs.append(item);
  }
  card.append(signs);
  return card;
}

function pillars(result) {
  const section = element("section", { className: "product-section" });
  const head = element("header", { className: "product-section__header" });
  head.append(element("p", { className: "product-eyebrow", text: "Quatre points de vue" }), element("h2", { text: "Les quatre facettes de ton thème" }), element("p", { text: "Chaque facette éclaire un angle différent. Les signes traditionnels restent disponibles après cette première lecture." }));
  const facets = element("div", { className: "pillar-facets" });
  for (const id of ["year", "month", "day", "hour"]) {
    const semantic = getSemanticConcept("pillars", id);
    const facet = element("article", { className: "insight-card" });
    facet.append(element("span", { text: PILLAR_LABELS[id] }), element("strong", { text: semantic.humanTitle }), element("p", { text: semantic.humanDescription }));
    facets.append(facet);
  }
  const traditional = element("details", { className: "product-disclosure semantic-technical" });
  traditional.append(element("summary", { text: "Voir les Quatre Piliers traditionnels" }));
  const grid = element("div", { className: "pillar-grid" });
  grid.append(
    pillarCard(t("bazi.pillars.year"), result.pillars.year), pillarCard(t("bazi.pillars.month"), result.pillars.month),
    pillarCard(t("bazi.pillars.day"), result.pillars.day, true), pillarCard(t("bazi.pillars.hour"), result.pillars.hour),
  );
  traditional.append(grid);
  section.append(head, facets, traditional);
  return section;
}

function elements(result) {
  const section = element("section", { className: "product-card" });
  const head = element("header", { className: "product-section__header" });
  head.append(element("p", { className: "product-eyebrow", text: "Mouvements présents" }), element("h2", { text: "Ce qui circule dans ton thème" }), element("p", { text: "Les Cinq Éléments décrivent des mouvements symboliques, pas cinq personnalités ni un diagnostic. La présence visible donne ici un premier repère." }));
  const list = element("div", { className: "element-bars" });
  for (const item of Object.values(result.elements)) {
    const localized = elementData(item.key);
    const semantic = getSemanticConcept("elements", item.key);
    const row = element("div", { className: `element-row element-row--${item.key}` });
    const label = element("div", { className: "element-row__label" });
    label.append(element("strong", { text: `${semantic.icon} ${semantic.humanTitle}` }), element("span", { text: `${localized.label} · ${t(item.count > 1 ? "bazi.ui.components" : "bazi.ui.component", { count: item.count })}` }));
    const meter = element("div", { className: "element-meter", attributes: { role: "meter", "aria-label": `${localized.label} : ${formatPercent(item.percent)}`, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(item.percent) } });
    const fill = element("span", { className: "element-meter__fill" });
    fill.style.width = `${item.percent}%`;
    meter.append(fill);
    row.append(label, meter, element("span", { className: "element-row__value", text: formatPercent(item.percent) }));
    list.append(row);
  }
  section.append(head, list);
  return section;
}

function yinYang(result) {
  const section = element("section", { className: "product-card yin-yang-card" });
  section.append(element("p", { className: "product-eyebrow", text: t("bazi.polarities.balance") }), element("h2", { text: `${formatPercent(result.yinYang.yinPercent)} Yin · ${formatPercent(result.yinYang.yangPercent)} Yang` }));
  const bar = element("div", { className: "yin-yang-meter", attributes: { role: "img", "aria-label": `${formatPercent(result.yinYang.yinPercent)} Yin et ${formatPercent(result.yinYang.yangPercent)} Yang` } });
  const yin = element("span", { className: "yin-yang-meter__yin" });
  yin.style.width = `${result.yinYang.yinPercent}%`;
  const yang = element("span", { className: "yin-yang-meter__yang" });
  yang.style.width = `${result.yinYang.yangPercent}%`;
  bar.append(yin, yang);
  const labels = element("div", { className: "yin-yang-labels" });
  labels.append(element("span", { text: `Yin · ${polarityData("yin").quality}` }), element("span", { text: `Yang · ${polarityData("yang").quality}` }));
  section.append(bar, labels);
  return section;
}

function cycle() {
  const details = element("details", { className: "product-disclosure" });
  details.append(element("summary", { text: t("bazi.ui.understandCycle") }));
  const content = element("div", { className: "product-disclosure__content" });
  const flow = element("ol", { className: "element-cycle", attributes: { "aria-label": "Cycle d’engendrement des cinq éléments" } });
  for (const item of getConcept("bazi.cycles", "generation").sequence) flow.append(element("li", { text: elementData(item).label }));
  content.append(flow, element("p", { text: getConcept("bazi.cycles", "generation").explanation }), element("p", { text: getConcept("bazi.cycles", "control").explanation }));
  details.append(content);
  return details;
}

function reading(result) {
  const section = element("section", { className: "product-card tao-reading" });
  section.append(element("p", { className: "product-eyebrow", text: t("bazi.ui.taoReading") }), element("h2", { text: t("bazi.ui.readingTitle") }));
  const ordered = Object.values(result.elements).sort((left, right) => right.count - left.count);
  const strongest = ordered.filter((item) => item.count === ordered[0].count).map((item) => elementData(item.key).label);
  const weakest = ordered.filter((item) => item.count === ordered.at(-1).count).map((item) => elementData(item.key).label);
  const master = stemData(result.dayMaster.key);
  const tendency = result.yinYang.yin === result.yinYang.yang ? t("bazi.ui.equalTendency") : result.yinYang.yin > result.yinYang.yang ? t("bazi.ui.yinTendency") : t("bazi.ui.yangTendency");
  const semanticMaster = getSemanticConcept("stems", result.dayMaster.key);
  const localizedReading = [
    `${semanticMaster.humanTitle} donne le centre de cette lecture. ${semanticMaster.humanDescription}`,
    t(strongest.length > 1 ? "bazi.ui.readingStrongestMany" : "bazi.ui.readingStrongestOne", { elements: strongest.join(" et ") }),
    t(weakest.length > 1 ? "bazi.ui.readingWeakestMany" : "bazi.ui.readingWeakestOne", { elements: weakest.join(" et "), tendency }),
  ];
  const labels = ["Ton point de départ", "Ce qui te nourrit", "Ce qui demande de l’attention"];
  localizedReading.forEach((paragraph, index) => {
    const group = element("div");
    group.append(element("h3", { text: labels[index] ?? "Manière d’avancer" }), element("p", { text: paragraph }));
    section.append(group);
  });
  return section;
}

function groupSection(id, ...children) {
  const section = markProductSection(element("section", { className: "product-depth-section" }), "theme", id);
  section.append(...children);
  return section;
}

function hiddenStems(result) {
  const section = element("section", { className: "product-card" });
  section.append(element("p", { className: "product-eyebrow", text: "Sous la surface" }), element("h2", { text: "Les influences intérieures" }), element("p", { text: "Chaque énergie du cycle terrestre peut contenir plusieurs nuances moins visibles. La tradition BaZi les appelle les Troncs cachés." }));
  const grid = element("div", { className: "insight-grid" });
  for (const [pillarId, pillar] of Object.entries(result.pillars)) {
    if (!pillar.determined) continue;
    const branch = getConcept("bazi.hiddenStems.branches", pillar.branch.key);
    const card = element("article", { className: "insight-card" });
    card.append(element("span", { text: PILLAR_LABELS[pillarId] }), element("strong", { text: branch.label }));
    const list = element("ul");
    branch.stems.forEach((stem) => list.append(element("li", { text: `${stemData(stem).label} — ${stemData(stem).french}` })));
    card.append(list);
    grid.append(card);
  }
  const technical = element("details", { className: "product-disclosure semantic-technical" });
  technical.append(element("summary", { text: "Voir les influences traditionnelles" }), grid);
  section.append(technical);
  return section;
}

function interactions(result) {
  const section = element("section", { className: "product-card" });
  section.append(element("p", { className: "product-eyebrow", text: "Relations visibles" }), element("h2", { text: "Comment les énergies se rencontrent" }), element("p", { text: "Ces relations indiquent des rapprochements ou des tensions possibles. Leur importance dépend toujours du thème complet." }));
  const found = branchRelations(result);
  if (!found.length) section.append(element("p", { text: "Aucune combinaison Liu He ni opposition Chong n’apparaît entre les Branches principales visibles." }));
  for (const relation of found) {
    const concept = getSemanticConcept("interactions", relation.type);
    const [left, right] = relation.branches;
    const item = element("article", { className: "relation-card" });
    item.append(element("strong", { text: concept.humanLabel }), element("p", { text: concept.humanDescription }));
    const technical = element("details", { className: "semantic-technical" });
    technical.append(element("summary", { text: "Voir la relation traditionnelle" }), element("p", { text: `${concept.traditionalLabel} — ${PILLAR_LABELS[left.pillarId]} · ${branchData(left.key).label} ↔ ${PILLAR_LABELS[right.pillarId]} · ${branchData(right.key).label}` }));
    item.append(technical);
    section.append(item);
  }
  const waiting = element("p", { className: "method-note", text: "Punitions, dommages et ruptures : moteur détaillé en attente. TAO n’affiche aucune relation non calculée." });
  section.append(waiting);
  return section;
}

function tenGods(result) {
  const section = element("section", { className: "product-card" });
  section.append(element("p", { className: "product-eyebrow", text: "Relations symboliques" }), element("h2", { text: "Les grandes dynamiques de ton thème" }), element("p", { text: "TAO commence par leur fonction humaine. Dans la tradition, ces dix relations sont appelées les Dix Dieux ; elles ne désignent ni des personnes ni des prédictions." }));
  const insights = visibleTenGods(result);
  const grid = element("div", { className: "ten-god-families" });
  for (const familyId of ["support", "peers", "expression", "resources", "responsibility"]) {
    const family = getSemanticConcept("tenGodFamilies", familyId);
    const familyInsights = insights.filter((insight) => getSemanticConcept("tenGods", insight.tenGod).family === familyId);
    if (!familyInsights.length) continue;
    const familyCard = element("article", { className: "semantic-family" });
    familyCard.append(element("h3", { text: `${family.icon} ${family.humanTitle}` }), element("p", { text: family.humanDescription }));
    for (const insight of familyInsights) {
      const semantic = getSemanticConcept("tenGods", insight.tenGod);
      const item = element("section", { className: "semantic-family__item" });
      item.append(element("span", { text: PILLAR_LABELS[insight.pillarId] }), element("strong", { text: semantic.humanLabel }), element("p", { text: semantic.humanDescription }));
      const technical = element("details", { className: "semantic-technical" });
      technical.append(element("summary", { text: "Lecture traditionnelle" }), element("p", { text: `${semantic.traditionalLabel} — ${semantic.technicalFrench}` }), element("small", { text: semantic.englishLabel }));
      item.append(technical);
      familyCard.append(item);
    }
    grid.append(familyCard);
  }
  section.append(grid);
  return section;
}

function cyclesAndTimeline(result) {
  const section = element("section", { className: "product-card" });
  section.append(element("p", { className: "product-eyebrow", text: "Chronologie" }), element("h2", { text: "Tes grands cycles de vie" }), element("p", { text: "Le BaZi observe aussi de longues périodes, souvent proches de dix ans, durant lesquelles certaines dynamiques prennent davantage de place. Elles sont traditionnellement appelées Da Yun · 大運." }));
  const status = element("aside", { className: "engine-status", attributes: { role: "note" } });
  status.append(element("strong", { text: "Moteur en attente" }), element("p", { text: "Aucune décennie ni période remarquable n’est affichée sans calcul déterministe vérifié." }));
  section.append(status, cycle(result));
  return section;
}

function lifeReading(result) {
  const section = element("section", { className: "product-card" });
  section.append(element("p", { className: "product-eyebrow", text: "Lecture thématique" }), element("h2", { text: "Ce que le thème permet déjà d’explorer" }), element("p", { text: "Ces portes de lecture s’appuient actuellement sur ton énergie fondamentale, les mouvements visibles et leur équilibre. Elles resteront nuancées jusqu’à l’arrivée des cycles complets." }));
  const grid = element("div", { className: "topic-grid" });
  const master = stemData(result.dayMaster.key);
  for (const [title, copy] of [
    ["Personnalité", `${master.french} sert de centre de lecture : une qualité à cultiver, pas une étiquette définitive.`],
    ["Relations", "Les grandes dynamiques relationnelles donnent des repères de coopération, d’expression et de limites."],
    ["Activité & créativité", "La répartition visible des éléments permet d’observer les ressources déjà présentes et celles à soutenir."],
    ["Évolution personnelle", "Les tendances natales décrivent un terrain. Les périodes de vie demanderont le futur moteur de cycles."],
  ]) {
    const card = element("article", { className: "insight-card" });
    card.append(element("strong", { text: title }), element("p", { text: copy }));
    grid.append(card);
  }
  section.append(grid);
  return section;
}

function renderError(message) {
  root.replaceChildren();
  const panel = element("section", { className: "product-card product-error", attributes: { role: "alert" } });
  panel.append(element("p", { className: "product-eyebrow", text: t("common.navigation.theme") }), element("h1", { text: t("bazi.ui.themeUnavailable") }), element("p", { text: message }), element("a", { text: t("bazi.ui.checkProfile"), attributes: { href: "#profiles" } }));
  root.append(panel);
}

export async function renderActiveBaziTheme() {
  if (!root) return null;
  const profile = getActiveProfile();
  if (!profile) {
    renderError(t("bazi.ui.profileNeeded"));
    return null;
  }
  try {
    const result = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
    const route = parseAppRoute(location.hash);
    root.replaceChildren(
      header(profile),
      createSectionNavigation("theme", THEME_SECTIONS, "Explorer Mon thème"),
      groupSection("overview", dayMaster(result), reading(result)),
      groupSection("pillars", pillars(result)),
      groupSection("elements", elements(result), yinYang(result)),
      groupSection("structure", hiddenStems(result), interactions(result)),
      groupSection("ten-gods", tenGods(result)),
      groupSection("cycles", cyclesAndTimeline(result)),
      groupSection("life", lifeReading(result), glossaryDisclosure(["dayMaster", "fourPillars", "heavenlyStem", "earthlyBranch", "fiveElements", "yinYang", "tenGods", "hiddenStems"], "Glossaire de TAO")),
    );
    if (result.warnings.length) {
      const warning = element("aside", { className: "product-card product-warning", attributes: { role: "note" } });
      result.warnings.forEach(() => warning.append(element("p", { text: t("bazi.ui.timezoneWarning") })));
      root.append(warning);
    }
    root.append(element("p", { className: "method-note", text: t("bazi.ui.methodology", { version: result.calculationVersion, timezone: result.metadata.timezone }) }));
    if (debugEnabled) {
      const details = element("details", { className: "product-disclosure" });
      details.append(element("summary", { text: t("bazi.ui.rawData") }), element("pre", { text: JSON.stringify({ profile, result }, null, 2) }));
      root.append(details);
    }
    focusRequestedSection(root, "theme", route.section, { scroll: route.section !== "overview" });
    await setTaoNarrativeState("explaining");
    root.dispatchEvent(new CustomEvent("tao:bazi-rendered", { detail: { profileId: profile.id, result } }));
    return result;
  } catch (error) {
    console.error("[TAO] Calcul BaZi impossible.", error);
    renderError(t("bazi.ui.calculationInvalid"));
    return null;
  }
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view === "theme") renderActiveBaziTheme();
});
window.addEventListener("tao:profile-created", () => {
  if (location.hash.startsWith("#theme")) renderActiveBaziTheme();
});
window.addEventListener("tao:profile-changed", () => {
  if (location.hash.startsWith("#theme")) renderActiveBaziTheme();
});
if (location.hash.startsWith("#theme")) renderActiveBaziTheme();
