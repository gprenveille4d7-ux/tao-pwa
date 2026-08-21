import { getSolarTermInstant } from "./bazi-engine.mjs";

export const SEASONAL_BALANCE_VERSION = "tao-seasonal-1.0.0";
export const ELEMENTS = Object.freeze(["wood", "fire", "earth", "metal", "water"]);
export const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
export const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });

export const FIVE_MOVEMENTS = Object.freeze({
  wood: Object.freeze({ season: "spring", organ: "liver", bowel: "gallbladder", climate: "wind" }),
  fire: Object.freeze({ season: "summer", organ: "heart", bowel: "smallIntestine", climate: "heat" }),
  earth: Object.freeze({ season: "transitions", organ: "spleen", bowel: "stomach", climate: "humidity" }),
  metal: Object.freeze({ season: "autumn", organ: "lung", bowel: "largeIntestine", climate: "dryness" }),
  water: Object.freeze({ season: "winter", organ: "kidney", bowel: "bladder", climate: "cold" }),
});

const term = (longitude, pinyin, label, description, movement) => Object.freeze({ longitude, pinyin, label, description, movement });
export const SOLAR_TERMS = Object.freeze([
  term(285, "Xiao Han", "Petit Froid", "Le mouvement hivernal se concentre et invite à préserver les ressources.", "water"),
  term(300, "Da Han", "Grand Froid", "La saison atteint sa profondeur avant le retour progressif du mouvement.", "earth"),
  term(315, "Li Chun", "Début du Printemps", "Un nouveau cycle s’ouvre et favorise les premiers élans mesurés.", "wood"),
  term(330, "Yu Shui", "Eaux de Pluie", "Ce qui était retenu recommence doucement à circuler.", "wood"),
  term(345, "Jing Zhe", "Éveil des Insectes", "L’énergie se réveille et demande une attention souple.", "wood"),
  term(0, "Chun Fen", "Équinoxe de Printemps", "La lumière et l’ombre cherchent un équilibre passager.", "wood"),
  term(15, "Qing Ming", "Clarté Pure", "La période encourage la clarté, le tri et une vision plus nette.", "wood"),
  term(30, "Gu Yu", "Pluie des Grains", "La croissance se nourrit de régularité et de patience.", "earth"),
  term(45, "Li Xia", "Début de l’Été", "L’expansion s’affirme et invite à employer l’élan avec discernement.", "fire"),
  term(60, "Xiao Man", "Petite Plénitude", "Les choses se remplissent sans être encore arrivées à maturité.", "fire"),
  term(75, "Mang Zhong", "Grains en Épis", "Le moment soutient les gestes utiles et le soin porté à ce qui mûrit.", "fire"),
  term(90, "Xia Zhi", "Solstice d’Été", "Le Yang culmine ; ménager des espaces de calme aide à garder l’équilibre.", "fire"),
  term(105, "Xiao Shu", "Petite Chaleur", "L’intensité monte et gagne à être accompagnée avec mesure.", "fire"),
  term(120, "Da Shu", "Grande Chaleur", "La saison demande de préserver l’énergie au cœur de l’expansion.", "earth"),
  term(135, "Li Qiu", "Début de l’Automne", "Le mouvement commence à se recueillir et favorise le discernement.", "metal"),
  term(150, "Chu Shu", "Fin de la Chaleur", "L’intensité décroît et laisse place à une organisation plus posée.", "metal"),
  term(165, "Bai Lu", "Rosée Blanche", "La fraîcheur invite à simplifier et à observer les nuances.", "metal"),
  term(180, "Qiu Fen", "Équinoxe d’Automne", "Yin et Yang se répondent dans un équilibre temporaire.", "metal"),
  term(195, "Han Lu", "Rosée Froide", "La saison encourage le recentrage et la préparation.", "metal"),
  term(210, "Shuang Jiang", "Descente du Givre", "Le temps du tri s’approfondit avant l’entrée dans l’hiver.", "earth"),
  term(225, "Li Dong", "Début de l’Hiver", "L’énergie se tourne vers l’intérieur et valorise la conservation.", "water"),
  term(240, "Xiao Xue", "Petite Neige", "Le ralentissement progressif invite à protéger l’essentiel.", "water"),
  term(255, "Da Xue", "Grande Neige", "Le silence saisonnier soutient l’introspection et la stabilité.", "water"),
  term(270, "Dong Zhi", "Solstice d’Hiver", "Le Yin culmine tandis qu’un nouvel élan commence discrètement.", "water"),
]);

function daysBetween(a, b) { return Math.max(0, Math.ceil((b - a) / 86_400_000)); }

export function getSeasonalPeriod(epochMs, civilYear) {
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
