import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { element, formatBirthDate, formatPlace } from "./tao-ui.js";
import { setTaoNarrativeState } from "./tao-narrative.js";
import { formatPercent, getConcept, t } from "./locales/index.js";
import { glossaryDisclosure } from "./locales/glossary-ui.js";

const root = document.querySelector("[data-bazi-root]");
const debugEnabled = new URLSearchParams(location.search).get("debug") === "bazi";

const elementData = (key) => getConcept("bazi.elements", key);
const polarityData = (key) => getConcept("bazi.polarities", key);
const stemData = (key) => getConcept("bazi.heavenlyStems", key);
const branchData = (key) => getConcept("bazi.earthlyBranches", key);

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
  const card = element("section", { className: `product-card day-master-card element-accent--${master.element}` });
  card.append(
    element("p", { className: "product-eyebrow", text: `Ton ${t("bazi.labels.dayMaster")}` }),
    element("span", { className: "day-master-card__glyph", text: localizedStem.hanzi }),
    element("p", { className: "day-master-card__name", text: localizedStem.label }),
    element("h2", { text: `${localizedElement.label} ${localizedPolarity.label}` }),
    element("p", { className: "day-master-card__copy", text: localizedElement.description }),
  );
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
  head.append(element("p", { className: "product-eyebrow", text: t("bazi.ui.natalStructure") }), element("h2", { text: t("bazi.labels.fourPillars") }), element("p", { text: t("bazi.ui.pillarsIntro") }));
  const grid = element("div", { className: "pillar-grid" });
  grid.append(
    pillarCard(t("bazi.pillars.year"), result.pillars.year), pillarCard(t("bazi.pillars.month"), result.pillars.month),
    pillarCard(t("bazi.pillars.day"), result.pillars.day, true), pillarCard(t("bazi.pillars.hour"), result.pillars.hour),
  );
  section.append(head, grid);
  return section;
}

function elements(result) {
  const section = element("section", { className: "product-card" });
  const head = element("header", { className: "product-section__header" });
  head.append(element("p", { className: "product-eyebrow", text: t("bazi.ui.natalBalance") }), element("h2", { text: t("bazi.labels.fiveElements") }), element("p", { text: t("bazi.ui.elementsIntro") }));
  const list = element("div", { className: "element-bars" });
  for (const item of Object.values(result.elements)) {
    const localized = elementData(item.key);
    const row = element("div", { className: `element-row element-row--${item.key}` });
    const label = element("div", { className: "element-row__label" });
    label.append(element("strong", { text: localized.label }), element("span", { text: t(item.count > 1 ? "bazi.ui.components" : "bazi.ui.component", { count: item.count }) }));
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
  const localizedReading = [
    t("bazi.ui.readingMaster", { master: `${master.french} — ${master.label}` }),
    t(strongest.length > 1 ? "bazi.ui.readingStrongestMany" : "bazi.ui.readingStrongestOne", { elements: strongest.join(" et ") }),
    t(weakest.length > 1 ? "bazi.ui.readingWeakestMany" : "bazi.ui.readingWeakestOne", { elements: weakest.join(" et "), tendency }),
  ];
  const labels = [t("bazi.ui.readingNature"), t("bazi.ui.readingResources"), t("bazi.ui.readingBalance")];
  localizedReading.forEach((paragraph, index) => {
    const group = element("div");
    group.append(element("h3", { text: labels[index] ?? "Manière d’avancer" }), element("p", { text: paragraph }));
    section.append(group);
  });
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
    root.replaceChildren(header(profile), dayMaster(result), pillars(result), elements(result), yinYang(result), reading(result), cycle(), glossaryDisclosure(["dayMaster", "fourPillars", "heavenlyStem", "earthlyBranch", "fiveElements", "yinYang", "tenGods", "hiddenStems"], "Glossaire de TAO"));
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
  if (location.hash === "#theme") renderActiveBaziTheme();
});
window.addEventListener("tao:profile-changed", () => {
  if (location.hash === "#theme") renderActiveBaziTheme();
});
if (location.hash === "#theme") renderActiveBaziTheme();
