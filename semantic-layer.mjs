import { semantics } from "./locales/fr/semantics.js";

export const SEMANTIC_LAYER_VERSION = semantics.version;
const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function inDevelopment() {
  return typeof location !== "undefined" && (DEV_HOSTS.has(location.hostname) || new URLSearchParams(location.search).has("debug"));
}

function fallback(category) {
  return Object.freeze({
    humanTitle: "Une dynamique à observer",
    humanLabel: "Une dynamique à observer",
    humanDescription: "Cette notion demande encore une explication vérifiée dans le vocabulaire de TAO.",
    technicalLabel: "Information traditionnelle",
    traditionalLabel: "Terme traditionnel non documenté",
    category,
  });
}

export function getSemanticConcept(category, id) {
  const value = semantics[category]?.[id];
  if (value) return value;
  if (inDevelopment()) console.warn(`[TAO semantics] Notion absente : ${category}.${id}`);
  return fallback(category);
}

export function createSemanticTrace({ text, semanticKey, sourceFacts = [], interpretationRules = [], confidence = "contextual" }) {
  return Object.freeze({ text, semanticKey, sourceFacts: Object.freeze([...sourceFacts]), interpretationRules: Object.freeze([...interpretationRules]), confidence });
}

export function describeElementRelation(dailyElement, masterElement) {
  const generates = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
  const controls = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
  if (dailyElement === masterElement) return Object.freeze({ id: "same", humanLabel: "Une énergie familière", explanation: "L’énergie de la journée rejoint directement ton énergie fondamentale. Elle peut rendre certains réflexes plus présents.", rule: "daily.element === natal.dayMaster.element" });
  if (generates[dailyElement] === masterElement) return Object.freeze({ id: "nourishes", humanLabel: "Un soutien disponible", explanation: "Dans le cycle des Cinq Éléments, l’énergie de la journée nourrit symboliquement ton énergie fondamentale.", rule: "daily.element generates natal.dayMaster.element" });
  if (generates[masterElement] === dailyElement) return Object.freeze({ id: "expresses", humanLabel: "Une invitation à exprimer", explanation: "Ton énergie fondamentale alimente symboliquement celle de la journée. Cela peut favoriser la mise en forme et l’expression.", rule: "natal.dayMaster.element generates daily.element" });
  if (controls[dailyElement] === masterElement) return Object.freeze({ id: "daily_controls", humanLabel: "Un besoin de cadre plus présent", explanation: "Dans le cycle de contrôle, l’énergie du jour agit sur ton énergie fondamentale. Cette lecture peut accentuer le besoin de structure, de décision ou de mesure.", rule: "daily.element controls natal.dayMaster.element" });
  if (controls[masterElement] === dailyElement) return Object.freeze({ id: "master_controls", humanLabel: "Une réalisation à mesurer", explanation: "Ton énergie fondamentale agit symboliquement sur celle de la journée. La tradition y lit un rapport aux moyens concrets et à la réalisation.", rule: "natal.dayMaster.element controls daily.element" });
  return Object.freeze({ id: "neutral", humanLabel: "Une rencontre sans dominante", explanation: "Aucune relation élémentaire directe ne domine. Les autres composantes du jour et du thème conservent leur importance.", rule: "no direct five-elements relation" });
}

export function buildDailySemanticReading({ result, natalTheme, firstName }) {
  const dailyStem = getSemanticConcept("stems", result.dayEnergy.stem.key);
  const masterStem = getSemanticConcept("stems", natalTheme.dayMaster.key);
  const element = getSemanticConcept("elements", result.dayEnergy.stem.element);
  const relation = describeElementRelation(result.dayEnergy.stem.element, natalTheme.dayMaster.element);
  const outward = result.dayEnergy.stem.polarity === "yang";
  const lead = outward
    ? `Aujourd’hui, ${element.humanTitle.toLocaleLowerCase("fr-FR")} sans disperser ton élan.`
    : `Aujourd’hui, prends le temps de ${element.humanTitle.toLocaleLowerCase("fr-FR")}.`;
  const personal = `${relation.explanation} Chez toi, cette rencontre se lit à partir de l’archétype « ${masterStem.humanTitle} ».`;
  const trace = createSemanticTrace({
    text: `${lead} ${personal}`,
    semanticKey: `daily.${relation.id}`,
    sourceFacts: [
      `today.stem=${result.dayEnergy.stem.key}`,
      `today.element=${result.dayEnergy.stem.element}`,
      `today.polarity=${result.dayEnergy.stem.polarity}`,
      `natal.dayMaster=${natalTheme.dayMaster.key}`,
      `relation=${relation.id}`,
    ],
    interpretationRules: [relation.rule, `daily.polarity=${result.dayEnergy.stem.polarity}`],
    confidence: "symbolic-rule",
  });
  return Object.freeze({ firstName, lead, personal, dailyStem, masterStem, element, relation, trace });
}
