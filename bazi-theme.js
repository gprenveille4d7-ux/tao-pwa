import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { element, formatBirthDate, formatPlace } from "./tao-ui.js";
import { setTaoNarrativeState } from "./tao-narrative.js";

const root = document.querySelector("[data-bazi-root]");
const debugEnabled = new URLSearchParams(location.search).get("debug") === "bazi";

const MASTER_COPY = Object.freeze({
  wood: "Le Bois évoque la croissance, l’élan et la faculté d’ouvrir un chemin. Il gagne en justesse lorsqu’il reste souple.",
  fire: "Le Feu évoque la clarté, l’expression et la capacité à mettre les choses en mouvement. Sa mesure protège sa lumière.",
  earth: "La Terre évoque la stabilité, l’accueil et le sens du concret. Elle avance par continuité et par soin.",
  metal: "Le Métal évoque le discernement, la structure et l’art de choisir l’essentiel. Sa précision s’équilibre avec la douceur.",
  water: "L’Eau évoque l’écoute, l’adaptation et la profondeur. Elle trouve son chemin sans avoir besoin de forcer.",
});

function header(profile) {
  const node = element("header", { className: "product-header theme-header" });
  node.append(
    element("p", { className: "product-eyebrow", text: "MON THÈME" }),
    element("h1", { text: profile.firstName }),
    element("p", { className: "product-lead", text: "Une lecture structurée de tes repères de naissance." }),
  );
  const details = element("dl", { className: "profile-facts" });
  for (const [label, value] of [
    ["Naissance", formatBirthDate(profile.birthDate)],
    ["Lieu", formatPlace(profile.birthPlace)],
    ["Heure locale", profile.birthTimeKnown ? profile.birthTime : "Heure inconnue"],
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
  const card = element("section", { className: `product-card day-master-card element-accent--${master.element}` });
  card.append(
    element("p", { className: "product-eyebrow", text: "TON MAÎTRE DU JOUR" }),
    element("span", { className: "day-master-card__glyph", text: master.chinese }),
    element("p", { className: "day-master-card__name", text: master.name.toUpperCase() }),
    element("h2", { text: `${master.elementLabel.toUpperCase()} ${master.polarity === "yang" ? "YANG" : "YIN"}` }),
    element("p", { className: "day-master-card__copy", text: MASTER_COPY[master.element] }),
  );
  return card;
}

function pillarCard(name, pillar, highlighted = false) {
  const card = element("article", { className: `pillar-card${highlighted ? " pillar-card--day" : ""}${pillar.determined ? "" : " pillar-card--unknown"}` });
  card.append(element("p", { className: "product-eyebrow", text: name }));
  if (!pillar.determined) {
    card.append(element("h3", { text: "Non déterminée" }), element("p", { text: pillar.reason }));
    return card;
  }
  const signs = element("div", { className: "pillar-card__signs" });
  for (const [kind, sign, extra] of [
    ["Tronc céleste", pillar.stem, `${pillar.stem.elementLabel} · ${pillar.stem.polarity === "yang" ? "Yang" : "Yin"}`],
    ["Branche terrestre", pillar.branch, `${pillar.branch.elementLabel} · ${pillar.branch.animal}`],
  ]) {
    const item = element("div");
    item.append(element("span", { text: kind }), element("strong", { text: sign.chinese }), element("b", { text: sign.name }), element("small", { text: extra }));
    signs.append(item);
  }
  card.append(signs);
  return card;
}

function pillars(result) {
  const section = element("section", { className: "product-section" });
  const head = element("header", { className: "product-section__header" });
  head.append(element("p", { className: "product-eyebrow", text: "STRUCTURE NATALE" }), element("h2", { text: "TES QUATRE PILIERS" }), element("p", { text: "Chaque pilier associe un Tronc céleste et une Branche terrestre." }));
  const grid = element("div", { className: "pillar-grid" });
  grid.append(
    pillarCard("ANNÉE", result.pillars.year), pillarCard("MOIS", result.pillars.month),
    pillarCard("JOUR", result.pillars.day, true), pillarCard("HEURE", result.pillars.hour),
  );
  section.append(head, grid);
  return section;
}

function elements(result) {
  const section = element("section", { className: "product-card" });
  const head = element("header", { className: "product-section__header" });
  head.append(element("p", { className: "product-eyebrow", text: "ÉQUILIBRE NATAL" }), element("h2", { text: "TES CINQ ÉLÉMENTS" }), element("p", { text: "Répartition des composantes visibles dans les piliers déterminés." }));
  const list = element("div", { className: "element-bars" });
  for (const item of Object.values(result.elements)) {
    const row = element("div", { className: `element-row element-row--${item.key}` });
    const label = element("div", { className: "element-row__label" });
    label.append(element("strong", { text: item.label }), element("span", { text: `${item.count} composante${item.count > 1 ? "s" : ""}` }));
    const meter = element("div", { className: "element-meter", attributes: { role: "meter", "aria-label": `${item.label} : ${item.percent}%`, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(item.percent) } });
    const fill = element("span", { className: "element-meter__fill" });
    fill.style.width = `${item.percent}%`;
    meter.append(fill);
    row.append(label, meter, element("span", { className: "element-row__value", text: `${item.percent}%` }));
    list.append(row);
  }
  section.append(head, list);
  return section;
}

function yinYang(result) {
  const section = element("section", { className: "product-card yin-yang-card" });
  section.append(element("p", { className: "product-eyebrow", text: "ÉQUILIBRE YIN / YANG" }), element("h2", { text: `${result.yinYang.yinPercent}% Yin · ${result.yinYang.yangPercent}% Yang` }));
  const bar = element("div", { className: "yin-yang-meter", attributes: { role: "img", "aria-label": `${result.yinYang.yinPercent}% Yin et ${result.yinYang.yangPercent}% Yang` } });
  const yin = element("span", { className: "yin-yang-meter__yin" });
  yin.style.width = `${result.yinYang.yinPercent}%`;
  const yang = element("span", { className: "yin-yang-meter__yang" });
  yang.style.width = `${result.yinYang.yangPercent}%`;
  bar.append(yin, yang);
  const labels = element("div", { className: "yin-yang-labels" });
  labels.append(element("span", { text: "Yin · intériorité" }), element("span", { text: "Yang · expression" }));
  section.append(bar, labels);
  return section;
}

function cycle() {
  const details = element("details", { className: "product-disclosure" });
  details.append(element("summary", { text: "Comprendre le cycle des cinq éléments" }));
  const content = element("div", { className: "product-disclosure__content" });
  const flow = element("ol", { className: "element-cycle", attributes: { "aria-label": "Cycle d’engendrement des cinq éléments" } });
  for (const item of ["Bois", "Feu", "Terre", "Métal", "Eau"]) flow.append(element("li", { text: item }));
  content.append(flow, element("p", { text: "Dans le cycle d’engendrement, chaque élément nourrit le suivant. Cette représentation aide à lire les relations internes sans les réduire à une notion de bon ou de mauvais." }));
  details.append(content);
  return details;
}

function reading(result) {
  const section = element("section", { className: "product-card tao-reading" });
  section.append(element("p", { className: "product-eyebrow", text: "LECTURE DE TAO" }), element("h2", { text: "Ta structure en quelques repères" }));
  const labels = ["Nature dominante", "Ressources présentes", "Points à équilibrer"];
  result.reading.forEach((paragraph, index) => {
    const group = element("div");
    group.append(element("h3", { text: labels[index] ?? "Manière d’avancer" }), element("p", { text: paragraph }));
    section.append(group);
  });
  return section;
}

function renderError(message) {
  root.replaceChildren();
  const panel = element("section", { className: "product-card product-error", attributes: { role: "alert" } });
  panel.append(element("p", { className: "product-eyebrow", text: "MON THÈME" }), element("h1", { text: "Le thème ne peut pas encore être établi" }), element("p", { text: message }), element("a", { text: "Vérifier le profil", attributes: { href: "#profiles" } }));
  root.append(panel);
}

export async function renderActiveBaziTheme() {
  if (!root) return null;
  const profile = getActiveProfile();
  if (!profile) {
    renderError("Certaines informations de naissance sont nécessaires pour calculer ce thème.");
    return null;
  }
  try {
    const result = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
    root.replaceChildren(header(profile), dayMaster(result), pillars(result), elements(result), yinYang(result), reading(result), cycle());
    if (result.warnings.length) {
      const warning = element("aside", { className: "product-card product-warning", attributes: { role: "note" } });
      result.warnings.forEach((message) => warning.append(element("p", { text: message })));
      root.append(warning);
    }
    root.append(element("p", { className: "method-note", text: `Convention ${result.calculationVersion} · année à Li Chun · mois aux Jie · heure civile locale (${result.metadata.timezone}) · jour à minuit.` }));
    if (debugEnabled) {
      const details = element("details", { className: "product-disclosure" });
      details.append(element("summary", { text: "Données brutes BaZi" }), element("pre", { text: JSON.stringify({ profile, result }, null, 2) }));
      root.append(details);
    }
    await setTaoNarrativeState("explaining");
    root.dispatchEvent(new CustomEvent("tao:bazi-rendered", { detail: { profileId: profile.id, result } }));
    return result;
  } catch (error) {
    console.error("[TAO] Calcul BaZi impossible.", error);
    renderError("Les données enregistrées ne permettent pas un calcul fiable. Vérifie la date, l’heure et le fuseau du lieu de naissance.");
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
