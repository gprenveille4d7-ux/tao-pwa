import { analyzeFamilyConstellation, familyConstellationEngineVersion } from "./family-number-engine.mjs?v=3.1.0";

export const FAMILY_RARITY_ENGINE_VERSION = "tao-family-rarity-2.0.0";
export const FAMILY_RARITY_MODELS = Object.freeze({
  conditional: "FAMILY_CONDITIONAL",
  simple: "SIMPLE_CALENDAR",
});

const DEFAULT_SIMULATION_COUNT = 2_000;
const MAX_SIMULATION_COUNT = 50_000;

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function daysInYear(year) {
  return new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365;
}

function dateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) throw new TypeError(`Date invalide : ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (day < 1 || day > daysInMonth(year, month)) throw new TypeError(`Date invalide : ${value}`);
  return { year, month, day };
}

function isoDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function canonicalDataset({ profiles, events = [], roles = {} }) {
  return JSON.stringify({
    profiles: [...profiles].map((profile) => ({
      id: String(profile.id),
      birthDate: String(profile.birthDate),
      birthTimeKnown: profile.birthTimeKnown === true,
      birthTime: profile.birthTimeKnown === true ? profile.birthTime : null,
      role: roles[profile.id] ?? "other",
    })).sort((left, right) => left.id.localeCompare(right.id)),
    events: [...events].map((event) => ({
      id: String(event.id),
      date: String(event.date),
      time: event.time ?? null,
      type: event.type ?? "other",
      profileIds: [...(event.profileIds ?? [])].map(String).sort(),
    })).sort((left, right) => left.id.localeCompare(right.id)),
  });
}

function fnv1a(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash >>> 0;
}

export function buildFamilyDatasetHash(input) {
  return fnv1a(canonicalDataset(input)).toString(16).padStart(8, "0");
}

export function createSeededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomInteger(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function randomDate(random, year) {
  const month = randomInteger(random, 1, 12);
  const day = randomInteger(random, 1, daysInMonth(year, month));
  return isoDate(year, month, day);
}

function randomTime(random) {
  return `${String(randomInteger(random, 0, 23)).padStart(2, "0")}:${String(randomInteger(random, 0, 59)).padStart(2, "0")}`;
}

export function randomizeFamilyDataset({ profiles, events = [], roles = {} }, random, model = FAMILY_RARITY_MODELS.conditional) {
  const profileYears = profiles.map(({ birthDate }) => dateParts(birthDate).year);
  const minimumYear = Math.min(...profileYears);
  const maximumYear = Math.max(...profileYears);
  const simulatedProfiles = profiles.map((profile) => {
    const realYear = dateParts(profile.birthDate).year;
    const year = model === FAMILY_RARITY_MODELS.simple ? randomInteger(random, minimumYear, maximumYear) : realYear;
    const timeKnown = profile.birthTimeKnown === true && typeof profile.birthTime === "string";
    return {
      ...profile,
      birthDate: randomDate(random, year),
      birthTimeKnown: timeKnown,
      birthTime: timeKnown ? randomTime(random) : null,
    };
  });
  const eventYears = events.map(({ date }) => dateParts(date).year);
  const eventMinimum = eventYears.length ? Math.min(...eventYears) : minimumYear;
  const eventMaximum = eventYears.length ? Math.max(...eventYears) : maximumYear;
  const simulatedEvents = events.map((event) => {
    const realYear = dateParts(event.date).year;
    const year = model === FAMILY_RARITY_MODELS.simple ? randomInteger(random, eventMinimum, eventMaximum) : realYear;
    return { ...event, date: randomDate(random, year), time: event.time ? randomTime(random) : null };
  });
  return { profiles: simulatedProfiles, events: simulatedEvents, roles };
}

export function exactDateMirrorFrequency(leftYear, rightYear) {
  let favorable = 0;
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= daysInMonth(leftYear, month); day += 1) {
      if (day === month || day > 12) continue;
      const mirroredMonth = day;
      const mirroredDay = month;
      if (mirroredDay <= daysInMonth(rightYear, mirroredMonth)) favorable += 1;
    }
  }
  return favorable / (daysInYear(leftYear) * daysInYear(rightYear));
}

export function rarityCategory(frequency) {
  if (frequency < 0.01) return "VERY_RARE";
  if (frequency < 0.03) return "RARE";
  if (frequency < 0.10) return "UNCOMMON";
  if (frequency < 0.20) return "FAIRLY_COMMON";
  return "COMMON";
}

function normalizedSimulationCount(value) {
  const count = Number(value ?? DEFAULT_SIMULATION_COUNT);
  if (!Number.isInteger(count) || count < 100) throw new TypeError("Le nombre de simulations doit être un entier d’au moins 100.");
  return Math.min(MAX_SIMULATION_COUNT, count);
}

function candidatesForComparison(analysis) {
  return analysis.displayObservations ?? analysis.clusteredObservations ?? analysis.selectedObservations ?? [];
}

export function estimateFamilyRarity(input, options = {}) {
  const simulationCount = normalizedSimulationCount(options.simulationCount);
  const model = Object.values(FAMILY_RARITY_MODELS).includes(options.model) ? options.model : FAMILY_RARITY_MODELS.conditional;
  const datasetHash = buildFamilyDatasetHash(input);
  const seed = Number.isInteger(options.seed) ? options.seed >>> 0 : fnv1a(`${datasetHash}|${familyConstellationEngineVersion}|${model}|${simulationCount}`);
  const random = createSeededRandom(seed);
  const realAnalysis = analyzeFamilyConstellation(input);
  const realPatterns = candidatesForComparison(realAnalysis).slice(0, 24);
  const motifHits = new Map(realPatterns.map(({ id }) => [id, 0]));
  let densityHits = 0;
  let simulationsWithAnyStrongMotif = 0;
  const progressEvery = Math.max(25, Math.floor(simulationCount / 100));

  for (let index = 0; index < simulationCount; index += 1) {
    const simulatedInput = randomizeFamilyDataset(input, random, model);
    const simulated = analyzeFamilyConstellation(simulatedInput);
    const simulatedCandidates = candidatesForComparison(simulated);
    const maximumScore = simulatedCandidates.reduce((maximum, item) => Math.max(maximum, item.interestScore ?? 0), 0);
    if (maximumScore >= 82) simulationsWithAnyStrongMotif += 1;
    if ((simulated.density?.rawDensity ?? 0) >= (realAnalysis.density?.rawDensity ?? 0)) densityHits += 1;
    for (const pattern of realPatterns) {
      if (maximumScore >= pattern.interestScore) motifHits.set(pattern.id, motifHits.get(pattern.id) + 1);
    }
    if (typeof options.onProgress === "function" && ((index + 1) % progressEvery === 0 || index + 1 === simulationCount)) {
      options.onProgress(Object.freeze({ completed: index + 1, total: simulationCount, ratio: (index + 1) / simulationCount }));
    }
  }

  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  const motifs = realPatterns.map((pattern) => {
    const estimatedRandomFrequency = (motifHits.get(pattern.id) + 1) / (simulationCount + 1);
    let exactRandomFrequency = null;
    if (pattern.type === "DATE_MIRROR" && pattern.participantIds.length === 2) {
      const left = profileById.get(pattern.participantIds[0]);
      const right = profileById.get(pattern.participantIds[1]);
      if (left && right) exactRandomFrequency = exactDateMirrorFrequency(dateParts(left.birthDate).year, dateParts(right.birthDate).year);
    }
    return Object.freeze({
      observationId: pattern.id,
      estimatedRandomFrequency,
      exactRandomFrequency,
      category: rarityCategory(estimatedRandomFrequency),
      comparableOrStrongerCount: motifHits.get(pattern.id),
      independentPathCount: pattern.independentPathCount ?? 1,
      sourceDiversity: pattern.sourceDiversity ?? 1,
    });
  });
  const globalFrequency = (densityHits + 1) / (simulationCount + 1);
  return Object.freeze({
    version: FAMILY_RARITY_ENGINE_VERSION,
    engineVersion: familyConstellationEngineVersion,
    datasetHash,
    seed,
    model,
    simulationCount,
    motifs: Object.freeze(motifs),
    global: Object.freeze({
      estimatedRandomFrequency: globalFrequency,
      category: rarityCategory(globalFrequency),
      comparableOrDenserCount: densityHits,
      constellationDensity: realAnalysis.density?.constellationDensity ?? 0,
      rawDensity: realAnalysis.density?.rawDensity ?? 0,
      simulationsWithAnyStrongMotif,
    }),
    methodology: Object.freeze({
      lookElsewhereAdjusted: true,
      exactEngineReplay: true,
      preservesProfileYears: model === FAMILY_RARITY_MODELS.conditional,
      disclaimer: "Cette estimation dépend du modèle de génération utilisé et ne représente pas la distribution exacte des naissances humaines.",
    }),
  });
}
