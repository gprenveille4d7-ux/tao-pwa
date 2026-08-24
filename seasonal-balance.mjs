import { getSolarTermInstant } from "./bazi-engine.mjs";
import { CONTROLS, GENERATES, JIE_QI, MOVEMENT_KEYS, MOVEMENTS } from "./seasonal-knowledge.mjs?v=1.0.0";

export const SEASONAL_BALANCE_VERSION = "tao-seasonal-1.2.0";
export const ELEMENTS = MOVEMENT_KEYS;
export { CONTROLS, GENERATES };

export const FIVE_MOVEMENTS = Object.freeze({
  wood: Object.freeze({ season: "spring", organ: "liver", bowel: "gallbladder", climate: "wind" }),
  fire: Object.freeze({ season: "summer", organ: "heart", bowel: "smallIntestine", climate: "heat" }),
  earth: Object.freeze({ season: "transitions", organ: "spleen", bowel: "stomach", climate: "humidity" }),
  metal: Object.freeze({ season: "autumn", organ: "lung", bowel: "largeIntestine", climate: "dryness" }),
  water: Object.freeze({ season: "winter", organ: "kidney", bowel: "bladder", climate: "cold" }),
});

export const SOLAR_TERMS = Object.freeze(JIE_QI.map((item) => Object.freeze({ ...item, description: item.beginner })));

function daysBetween(a, b) { return Math.max(0, Math.ceil((b - a) / 86_400_000)); }

export function getSeasonalPeriod(epochMs, civilYear) {
  civilYear ??= new Date(epochMs).getUTCFullYear();
  const candidates = [];
  for (const year of [civilYear - 1, civilYear, civilYear + 1]) {
    for (const item of SOLAR_TERMS) candidates.push({ ...item, epochMs: getSolarTermInstant(year, item.longitude) });
  }
  candidates.sort((a, b) => a.epochMs - b.epochMs);
  let index = -1;
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    if (candidates[candidateIndex].epochMs <= epochMs) index = candidateIndex;
    else break;
  }
  const current = candidates[Math.max(0, index)];
  const next = candidates[Math.max(0, index) + 1];
  const duration = Math.max(1, next.epochMs - current.epochMs);
  const progress = Math.max(0, Math.min(1, (epochMs - current.epochMs) / duration));
  const daysUntilNext = daysBetween(epochMs, next.epochMs);
  const daysSinceCurrent = Math.floor(Math.max(0, epochMs - current.epochMs) / 86_400_000);
  return Object.freeze({
    ...current,
    instant: new Date(current.epochMs).toISOString(),
    next: Object.freeze({ ...next, instant: new Date(next.epochMs).toISOString() }),
    progress,
    daysUntilNext,
    daysSinceCurrent,
    transitionWindow: daysUntilNext <= 5 || daysSinceCurrent <= 2,
    correspondence: FIVE_MOVEMENTS[current.movement],
  });
}

const EARTH_TRANSITION_MS = 18 * 86_400_000;
const SEASON_ANCHORS = Object.freeze([
  [315, "spring", "wood"], [45, "summer", "fire"], [135, "autumn", "metal"], [225, "winter", "water"],
]);

function seasonIntervals(civilYear) {
  const anchors = [];
  for (const year of [civilYear - 1, civilYear, civilYear + 1]) {
    for (const [longitude, seasonId, movement] of SEASON_ANCHORS) anchors.push({ epochMs: getSolarTermInstant(year, longitude), seasonId, movement });
  }
  anchors.sort((a, b) => a.epochMs - b.epochMs);
  const intervals = [];
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const current = anchors[index];
    const next = anchors[index + 1];
    const transitionStart = next.epochMs - EARTH_TRANSITION_MS;
    intervals.push(Object.freeze({ id: current.seasonId, movement: current.movement, startEpochMs: current.epochMs, endEpochMs: transitionStart }));
    intervals.push(Object.freeze({ id: "transitions", movement: "earth", transitionTo: next.seasonId, startEpochMs: transitionStart, endEpochMs: next.epochMs }));
  }
  return intervals;
}

function seasonPhase(progress, isEarth) {
  if (isEarth) return progress < 0.5 ? "transition entrante" : "transition vers la saison suivante";
  if (progress < 0.15) return "début";
  if (progress < 0.4) return "montée";
  if (progress < 0.65) return "cœur";
  if (progress < 0.85) return "déclin";
  return "transition";
}

export function getSeasonCycle(epochMs, civilYear) {
  civilYear ??= new Date(epochMs).getUTCFullYear();
  const intervals = seasonIntervals(civilYear);
  let index = intervals.findIndex(({ startEpochMs, endEpochMs }) => epochMs >= startEpochMs && epochMs < endEpochMs);
  if (index < 0) index = Math.max(0, intervals.findIndex(({ startEpochMs }) => startEpochMs > epochMs) - 1);
  const current = intervals[index];
  const duration = Math.max(1, current.endEpochMs - current.startEpochMs);
  const progress = Math.max(0, Math.min(1, (epochMs - current.startEpochMs) / duration));
  const daysElapsed = Math.floor(Math.max(0, epochMs - current.startEpochMs) / 86_400_000);
  const daysRemaining = Math.max(0, Math.ceil((current.endEpochMs - epochMs) / 86_400_000));
  return Object.freeze({
    ...current,
    progress,
    phase: seasonPhase(progress, current.movement === "earth"),
    daysElapsed,
    daysRemaining,
    start: new Date(current.startEpochMs).toISOString(),
    end: new Date(current.endEpochMs).toISOString(),
    previous: intervals[index - 1] ? Object.freeze({ id: intervals[index - 1].id, movement: intervals[index - 1].movement }) : null,
    next: intervals[index + 1] ? Object.freeze({ id: intervals[index + 1].id, movement: intervals[index + 1].movement, epochMs: current.endEpochMs }) : null,
    knowledge: MOVEMENTS[current.movement],
    model: "four-earth-transitions-18-days",
  });
}

export function normalizeSeasonalWeather(weather) {
  const raw = weather?.raw;
  if (!raw) return Object.freeze({ available: false, trends: Object.freeze(["neutral"]), primary: "neutral" });
  const trends = [];
  if (Number(raw.temperature) >= 30 || Number(raw.apparentTemperature) >= 32) trends.push("heat");
  if (Number(raw.temperature) <= 8 || Number(raw.apparentTemperature) <= 6) trends.push("cold");
  if (Number(raw.humidity) >= 75) trends.push("humidity");
  if (Number(raw.humidity) <= 35) trends.push("potentialDryness");
  if (Number(raw.windSpeed) >= 25) trends.push("wind");
  if (["RAIN", "HEAVY_RAIN", "STORM"].includes(weather.state) || Number(raw.precipitation) > 0) trends.push("rain");
  if (Number(raw.temperatureMax) - Number(raw.temperatureMin) >= 12) trends.push("thermalRange");
  if (!trends.length) trends.push("neutral");
  return Object.freeze({ available: true, trends: Object.freeze(trends), primary: trends[0], raw, source: weather.source });
}

function relationBetween(seasonal, master) {
  if (seasonal === master) return "same";
  if (GENERATES[seasonal] === master) return "supportsProfile";
  if (GENERATES[master] === seasonal) return "profileFeedsSeason";
  if (CONTROLS[seasonal] === master || CONTROLS[master] === seasonal) return "tension";
  return "neutral";
}

export function buildSeasonalProfile({ period, natalTheme, dailyResult, weather = null }) {
  const movement = period.movement;
  const counts = Object.fromEntries(ELEMENTS.map((key) => [key, Number(natalTheme.elements?.[key]?.count ?? 0)]));
  const ordered = ELEMENTS.slice().sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const natalPresence = movement === ordered[0] ? "marked" : movement === ordered[ordered.length - 1] ? "quiet" : "present";
  const relation = relationBetween(movement, natalTheme.dayMaster.element);
  const dailyRelation = relationBetween(movement, dailyResult.dayEnergy.stem.element);
  const weatherReading = normalizeSeasonalWeather(weather);
  const axes = [movement === "metal" ? "breathing" : movement === "water" ? "recovery" : movement === "fire" ? "rhythm" : movement === "wood" ? "movement" : "regularity"];
  if (["tension", "profileFeedsSeason"].includes(relation)) axes.push("recovery");
  if (weatherReading.trends.includes("heat") || weatherReading.trends.includes("potentialDryness")) axes.push("hydration");
  if (weatherReading.trends.includes("cold")) axes.push("thermalComfort");
  if (dailyResult.dayEnergy.stem.polarity === "yin") axes.push("sleep");
  return Object.freeze({
    movement, relation, dailyRelation, natalPresence, weather: weatherReading,
    axes: Object.freeze([...new Set(axes)].slice(0, 3)),
  });
}

export function selectCareAdvice(profileReading) {
  const advice = [];
  const trends = profileReading.weather.trends;
  if (trends.includes("heat")) advice.push("hydrate", "gentleHotHours", "seekCool");
  if (trends.includes("cold")) advice.push("thermalComfort", "progressiveWarmup", "recover");
  if (trends.includes("humidity")) advice.push("airIfSuitable", "dryClothes", "moderateActivity");
  if (trends.includes("potentialDryness")) advice.push("hydrate", "roomComfort", "avoidDryHeating");
  if (trends.includes("wind")) advice.push("adaptClothing", "limitWindExposure");
  if (!advice.length) advice.push(profileReading.axes.includes("recovery") ? "recover" : "daylightWalk", "gentleBreathing", "regularPauses");
  return Object.freeze([...new Set(advice)].slice(0, 4));
}
