import { tenGodFor } from "./bazi-insights.mjs";

export const DAILY_PERSONAL_SIGNATURE_VERSION = "tao-daily-personal-1.0.0";

const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const ELEMENT_LABELS = Object.freeze({ wood: "Bois", fire: "Feu", earth: "Terre", metal: "Métal", water: "Eau" });
const TEN_GOD_LABELS = Object.freeze({
  friend: "Compagnon", rob_wealth: "Compétiteur", eating_god: "Expression libre", hurting_officer: "Expression affirmée",
  direct_wealth: "Richesse directe", indirect_wealth: "Richesse indirecte", direct_officer: "Autorité juste",
  seven_killings: "Pression et défi", direct_resource: "Ressource directe", indirect_resource: "Ressource indirecte",
});
const BRANCH_RELATIONS = Object.freeze({
  combination: [["zi", "chou"], ["yin", "hai"], ["mao", "xu"], ["chen", "you"], ["si", "shen"], ["wu", "wei"]],
  clash: [["zi", "wu"], ["chou", "wei"], ["yin", "shen"], ["mao", "you"], ["chen", "xu"], ["si", "hai"]],
});

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36);
}

function relationBetweenElements(master, daily) {
  if (master === daily) return "same";
  if (GENERATES[daily] === master) return "nourishes";
  if (GENERATES[master] === daily) return "expresses";
  if (CONTROLS[master] === daily) return "masters";
  if (CONTROLS[daily] === master) return "pressures";
  return "neutral";
}

function branchRelation(dayKey, natalKey) {
  if (dayKey === natalKey) return "echo";
  for (const [type, pairs] of Object.entries(BRANCH_RELATIONS)) {
    if (pairs.some(([left, right]) => (dayKey === left && natalKey === right) || (dayKey === right && natalKey === left))) return type;
  }
  return null;
}

function determinedPillars(natalTheme) {
  return Object.entries(natalTheme?.pillars ?? {}).flatMap(([pillarId, pillar]) => pillar?.determined !== false && pillar?.stem && pillar?.branch ? [{ pillarId, pillar }] : []);
}

function createFact(id, type, label, value, source) {
  return Object.freeze({ id, type, label, value, source });
}

function wording({ relation, tenGod, interactions, dayElementLabel, masterElementLabel, scarce }) {
  const clash = interactions.find(({ type }) => type === "clash");
  const combination = interactions.find(({ type }) => type === "combination");
  const echo = interactions.find(({ type }) => type === "echo");
  const primary = clash
    ? `La journée touche un point sensible de ton thème et demande des ajustements conscients.`
    : combination
      ? `La journée rejoint ton thème par une combinaison qui favorise les rapprochements et les mises en relation.`
      : relation === "pressures"
        ? `L’énergie du ${dayElementLabel} exerce davantage de cadre sur ton ${masterElementLabel}.`
        : relation === "nourishes"
          ? `L’énergie du ${dayElementLabel} nourrit directement ton énergie fondamentale.`
          : relation === "same"
            ? `La journée amplifie une qualité déjà centrale dans ton thème.`
            : `La journée te propose une manière différente d’employer ton énergie habituelle.`;
  const support = combination
    ? "Les échanges simples et les alliances claires peuvent fluidifier ce qui semblait séparé."
    : relation === "nourishes" || relation === "same"
      ? "Tu peux t’appuyer sur ce qui est déjà stable en toi, sans chercher un effort supplémentaire."
      : `Le ${dayElementLabel} peut t’aider à mobiliser une ressource moins habituelle avec mesure.`;
  const attention = clash
    ? `Une opposition touche le pilier ${clash.pillarLabel.toLowerCase()} : évite les réactions immédiates et vérifie ce qui change réellement.`
    : echo
      ? `La Branche du jour répète celle du pilier ${echo.pillarLabel.toLowerCase()} : ce domaine peut prendre plus de place que prévu.`
      : `La relation « ${TEN_GOD_LABELS[tenGod] ?? "dynamique du jour"} » gagne à rester un repère, pas une obligation.`;
  const advice = clash
    ? "Choisis une action réversible, puis observe son effet avant d’aller plus loin."
    : scarce
      ? `Donne une place concrète au ${scarce} aujourd’hui : un geste simple suffit.`
      : "Clarifie une priorité et avance sans multiplier les fronts.";
  return { primary, support, attention, advice };
}

export function buildDailyPersonalSignature({ date, profile, natalTheme, dayPillar }) {
  if (!date || !profile?.id || !natalTheme?.dayMaster || !dayPillar?.stem || !dayPillar?.branch) throw new TypeError("Données quotidiennes et thème natal requis.");
  const pillars = determinedPillars(natalTheme);
  const relation = relationBetweenElements(natalTheme.dayMaster.element, dayPillar.stem.element);
  const tenGod = tenGodFor(natalTheme.dayMaster, dayPillar.stem);
  const facts = [
    createFact("daily.day_stem", "DAY_STEM", `${dayPillar.stem.name} · ${dayPillar.stem.elementLabel}`, dayPillar.stem.key, "day"),
    createFact("natal.day_master", "DAY_MASTER", `${natalTheme.dayMaster.name} · ${natalTheme.dayMaster.elementLabel}`, natalTheme.dayMaster.key, "natal"),
    createFact("daily.ten_god", "TEN_GOD", TEN_GOD_LABELS[tenGod] ?? "Relation non déterminée", tenGod, "derived"),
  ];
  const interactions = [];
  for (const { pillarId, pillar } of pillars) {
    const type = branchRelation(dayPillar.branch.key, pillar.branch.key);
    if (!type) continue;
    const pillarLabel = ({ year: "de l’Année", month: "du Mois", day: "du Jour", hour: "de l’Heure" })[pillarId] ?? pillarId;
    const interaction = Object.freeze({ type, pillarId, pillarLabel, dailyBranch: dayPillar.branch.key, natalBranch: pillar.branch.key });
    interactions.push(interaction);
    facts.push(createFact(`daily.branch.${type}.${pillarId}`, `BRANCH_${type.toUpperCase()}`, `${dayPillar.branch.name} et ${pillar.branch.name} · ${type === "combination" ? "combinaison" : type === "clash" ? "opposition" : "répétition"}`, `${dayPillar.branch.key}:${pillar.branch.key}`, "derived"));
  }
  const counts = Object.entries(natalTheme.elements ?? {}).map(([key, item]) => ({ key, count: Number(item.count) || 0 })).sort((a, b) => a.count - b.count || a.key.localeCompare(b.key));
  const scarceElement = counts[0]?.count < counts.at(-1)?.count ? ELEMENT_LABELS[counts[0].key] : null;
  const copy = wording({ relation, tenGod, interactions, dayElementLabel: dayPillar.stem.elementLabel, masterElementLabel: natalTheme.dayMaster.elementLabel, scarce: scarceElement });
  const dimensions = Object.freeze({
    relations: interactions.some(({ type }) => type === "clash") ? "sensitive" : interactions.some(({ type }) => type === "combination") ? "fluid" : "observing",
    action: relation === "pressures" || interactions.some(({ type }) => type === "clash") ? "prudence" : dayPillar.stem.polarity === "yang" ? "favorable" : "balanced",
    reflection: ["direct_resource", "indirect_resource"].includes(tenGod) ? "strong" : "moderate",
    rest: interactions.some(({ type }) => type === "clash") ? "priority" : dayPillar.stem.polarity === "yin" ? "useful" : "neutral",
  });
  const fingerprint = stableHash(JSON.stringify({ version: DAILY_PERSONAL_SIGNATURE_VERSION, date, profileId: profile.id, day: dayPillar.cycleIndex, master: natalTheme.dayMaster.key, interactions, tenGod }));
  return Object.freeze({
    version: DAILY_PERSONAL_SIGNATURE_VERSION,
    profileId: profile.id,
    date,
    fingerprint,
    relation,
    tenGod,
    tenGodLabel: TEN_GOD_LABELS[tenGod] ?? "Relation du jour",
    interactions: Object.freeze(interactions),
    facts: Object.freeze(facts),
    primarySignal: copy.primary,
    supports: Object.freeze([copy.support]),
    attentions: Object.freeze([copy.attention]),
    concreteAdvice: copy.advice,
    dimensions,
  });
}
