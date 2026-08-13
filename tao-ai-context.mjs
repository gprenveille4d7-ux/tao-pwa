import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateDailyTao } from "./daily-tao-engine.mjs?v=1.1.0";
import { getCachedDaily, setCachedDaily } from "./daily-cache.mjs?v=1.1.0";
import { buildDailySemanticReading, SEMANTIC_LAYER_VERSION } from "./semantic-layer.mjs?v=1.0.1";
import { getYijingHistory } from "./yijing-history.js";
import { getTaoAIContinuity } from "./tao-ai-memory.js";
import { TAO_AI_CONTRACT_VERSION, TAO_AI_MODES } from "./shared/tao-ai-contract.mjs";

function localDateInZone(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function fact(id, type, value, label) {
  return Object.freeze({ id, type, value, label: String(label ?? value).slice(0, 240) });
}

function dailyData(profile) {
  const natalTheme = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
  const timeZone = profile.birthPlace.timezone;
  const date = localDateInZone(timeZone);
  const input = { profile, natalTheme, timeZone, date };
  const result = getCachedDaily(input) ?? setCachedDaily(input, calculateDailyTao(input));
  const semantic = buildDailySemanticReading({ result, natalTheme, firstName: profile.firstName });
  return { natalTheme, result, semantic, date, timeZone };
}

function normalizedYijing(yijing) {
  if (!yijing?.question || !yijing?.primaryHexagram) return null;
  return {
    question: String(yijing.question).slice(0, 500),
    primaryHexagram: yijing.primaryHexagram,
    changingLines: Array.isArray(yijing.changingLines) ? yijing.changingLines.slice(0, 6) : [],
    resultingHexagram: yijing.resultingHexagram ?? null,
    semanticGuidance: yijing.semanticGuidance ?? null,
  };
}

export function buildTaoAIContext(mode = "conversation", options = {}) {
  if (!TAO_AI_MODES.includes(mode)) throw new TypeError(`Mode IA inconnu : ${mode}`);
  const profile = getActiveProfile();
  if (!profile) throw new Error("Un profil actif est nécessaire.");
  const daily = dailyData(profile);
  const environment = options.environment ?? globalThis.taoEnvironmentState ?? null;
  const continuity = getTaoAIContinuity(profile.id);
  const recentConsultations = getYijingHistory({ profileId: profile.id }).slice(0, 3).map((entry) => ({
    createdAt: entry.createdAt,
    question: entry.question.slice(0, 180),
    primaryNumber: entry.primaryNumber,
    transformedNumber: entry.transformedNumber ?? null,
  }));
  const facts = [
    fact("fact_daymaster", "DAY_MASTER", daily.natalTheme.dayMaster.key, daily.semantic.masterStem.traditionalLabel),
    fact("fact_daymaster_element", "DAY_MASTER_ELEMENT", daily.natalTheme.dayMaster.element, daily.semantic.masterStem.technicalFrench),
    fact("fact_today_stem", "DAY_STEM", daily.result.dayEnergy.stem.key, daily.semantic.dailyStem.traditionalLabel),
    fact("fact_today_branch", "DAY_BRANCH", daily.result.dayEnergy.branch.key, daily.result.dayEnergy.branch.name),
    fact("fact_today_element", "DAY_ELEMENT", daily.result.dayEnergy.stem.element, daily.semantic.element.humanTitle),
    fact("fact_today_polarity", "DAY_POLARITY", daily.result.dayEnergy.stem.polarity, daily.result.dayEnergy.stem.polarity),
    fact("fact_today_relation", "ELEMENT_RELATION", daily.semantic.relation.id, daily.semantic.relation.explanation),
    fact("fact_today_solar_term", "SOLAR_TERM", daily.result.solarTerm.id, daily.result.solarTerm.name),
  ];
  if (mode === "explanation" && Array.isArray(options.facts)) {
    for (const supplied of options.facts.slice(0, 20)) {
      if (supplied?.id && supplied?.type) facts.push(fact(supplied.id, supplied.type, supplied.value, supplied.label));
    }
  }

  return Object.freeze({
    version: TAO_AI_CONTRACT_VERSION,
    semanticVersion: SEMANTIC_LAYER_VERSION,
    mode,
    moment: Object.freeze({
      localDate: daily.date,
      timeOfDay: environment?.timeState ?? null,
      season: environment?.season ?? daily.result.solarTerm?.name ?? null,
      weatherState: environment?.weatherState ?? null,
    }),
    profile: Object.freeze({ profileId: profile.id, displayName: profile.firstName, semanticArchetype: daily.semantic.masterStem.humanTitle }),
    bazi: Object.freeze({
      dayMaster: Object.freeze({ key: daily.natalTheme.dayMaster.key, element: daily.natalTheme.dayMaster.element, polarity: daily.natalTheme.dayMaster.polarity }),
      elements: Object.freeze(Object.fromEntries(Object.entries(daily.natalTheme.elements).map(([key, value]) => [key, value.count]))),
      relevantRelations: Object.freeze([daily.semantic.relation.id]),
    }),
    today: Object.freeze({ dominantFacts: Object.freeze(facts), recommendations: Object.freeze(daily.result.guidance.favor.slice(0, 3)), warnings: Object.freeze(daily.result.guidance.moderate.slice(0, 3)), sourceFacts: daily.semantic.trace.sourceFacts }),
    yijing: normalizedYijing(options.yijing),
    continuity: Object.freeze({ ...continuity, recentConsultations: Object.freeze(recentConsultations) }),
  });
}

export function getContextFactIds(context) {
  return (context?.today?.dominantFacts ?? []).map(({ id }) => id);
}
