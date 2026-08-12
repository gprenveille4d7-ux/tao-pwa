export const ENVIRONMENT_ENGINE_VERSION = "tao-environment-1.0.0";

const CLEAR_BY_PERIOD = Object.freeze({
  DAWN: "OUTSIDE_CREPUSCULE_ROSE_VILLAGE_FJORDIQUE",
  MORNING: "OUTSIDE_JOUR_ENSOLEILLE_VILLAGE_FJORDIQUE",
  DAY: "OUTSIDE_JOUR_CLAIR_FJORD_ALPIN",
  LATE_AFTERNOON: "OUTSIDE_APRES_MIDI_ENSOLEILLE_FJORD_ALPIN",
  TWILIGHT: "OUTSIDE_CREPUSCULE_ROSE_VILLAGE_FJORDIQUE",
  NIGHT: "OUTSIDE_NUIT_ETOILEE_FJORD_ALPIN",
});

const WEATHER_ASSETS = Object.freeze({
  CLOUDY: "OUTSIDE_JOUR_NUAGEUX_FJORD_ALPIN",
  OVERCAST: "OUTSIDE_JOUR_NUAGEUX_FJORD_ALPIN",
  FOG: "OUTSIDE_BROUILLARD_VILLAGE_FJORDIQUE",
  RAIN: "OUTSIDE_PLUIE_DOUCE_VILLAGE_FJORDIQUE",
  HEAVY_RAIN: "OUTSIDE_FORTE_PLUIE_VILLAGE_FJORDIQUE",
  SNOW: "OUTSIDE_NEIGE_VILLAGE_FJORDIQUE",
  STORM: "OUTSIDE_ORAGE_VILLAGE_FJORDIQUE",
});

export function seasonFor(latitude, month) {
  const north = latitude >= 0;
  const index = Math.floor(((month % 12) / 3));
  const northern = ["WINTER", "SPRING", "SUMMER", "AUTUMN"];
  return northern[(index + (north ? 0 : 2)) % 4];
}

export function composeEnvironment({ period, weatherState = null, latitude = 0, month = 1 }) {
  const timeState = period?.state ?? "DAY";
  const weather = weatherState ?? "UNKNOWN";
  let assetId;
  if (weather === "PARTLY_CLOUDY" || weather === "CLEAR" || weather === "UNKNOWN") assetId = CLEAR_BY_PERIOD[timeState];
  else assetId = WEATHER_ASSETS[weather] ?? CLEAR_BY_PERIOD[timeState];
  if (timeState === "TWILIGHT" && weather === "CLEAR" && (period?.progress ?? 0) < 0.62) assetId = "OUTSIDE_COUCHER_DE_SOLEIL_VILLAGE_FJORDIQUE";
  return Object.freeze({
    version: ENVIRONMENT_ENGINE_VERSION,
    timeState, weatherState: weather, assetId,
    season: seasonFor(latitude, month),
    starsVisibility: timeState !== "NIGHT" ? "none" : weather === "CLEAR" ? "full" : weather === "PARTLY_CLOUDY" ? "partial" : "none",
    starsVisible: timeState === "NIGHT" && ["CLEAR", "PARTLY_CLOUDY"].includes(weather),
    celestialEvent: null,
  });
}
