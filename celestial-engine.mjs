const astronomy = () => {
  if (!globalThis.Astronomy) throw new Error("Astronomy Engine n’est pas chargé.");
  return globalThis.Astronomy;
};

export const CELESTIAL_ENGINE_VERSION = "tao-celestial-1.0.0-astronomy-engine-2.1.19";
const DAY_MS = 86_400_000;
const PHASES = Object.freeze([
  ["new", "Nouvelle Lune"], ["waxing_crescent", "Premier croissant"],
  ["first_quarter", "Premier quartier"], ["waxing_gibbous", "Gibbeuse croissante"],
  ["full", "Pleine Lune"], ["waning_gibbous", "Gibbeuse décroissante"],
  ["last_quarter", "Dernier quartier"], ["waning_crescent", "Dernier croissant"],
]);

export function classifyMoonPhase(angle) {
  const normalized = ((Number(angle) % 360) + 360) % 360;
  const index = Math.floor((normalized + 22.5) / 45) % 8;
  return Object.freeze({ key: PHASES[index][0], name: PHASES[index][1], index, angle: normalized, waxing: normalized > 0 && normalized < 180 });
}

function position(body, date, observer) {
  const A = astronomy();
  const equator = A.Equator(body, date, observer, true, true);
  const horizon = A.Horizon(date, observer, equator.ra, equator.dec, "normal");
  return Object.freeze({ altitude: horizon.altitude, azimuth: horizon.azimuth, aboveHorizon: horizon.altitude > 0 });
}

function searchRiseSet(observer, date, direction) {
  const A = astronomy();
  const found = A.SearchRiseSet(A.Body.Moon, observer, direction, date, 2, 0);
  return found?.date?.getTime?.() ?? null;
}

function phaseEvent(target, key, name, date) {
  const A = astronomy();
  const event = A.SearchMoonPhase(target, date, 40);
  return event ? Object.freeze({ type: "moon_phase", key, name, epochMs: event.date.getTime(), source: "Astronomy Engine 2.1.19" }) : null;
}

function visibilityFor(weather, moon, sky) {
  const state = weather?.state ?? null;
  if (!moon.aboveHorizon) return Object.freeze({ astronomicalState: "below_horizon", weatherState: state, confidence: "certain", level: "none", explanation: "La Lune est actuellement sous l’horizon." });
  if (["OVERCAST", "FOG", "RAIN", "HEAVY_RAIN", "SNOW", "STORM"].includes(state)) return Object.freeze({ astronomicalState: "above_horizon", weatherState: state, confidence: "indicative", level: "unfavorable", explanation: "La Lune est au-dessus de l’horizon, mais les conditions météo sont défavorables à son observation." });
  if (["CLOUDY", "PARTLY_CLOUDY"].includes(state)) return Object.freeze({ astronomicalState: "above_horizon", weatherState: state, confidence: "indicative", level: "variable", explanation: "La Lune est au-dessus de l’horizon ; son observation dépend des passages nuageux." });
  if (!weather || !state) return Object.freeze({ astronomicalState: "above_horizon", weatherState: null, confidence: "astronomical-only", level: "unknown", explanation: "La Lune est au-dessus de l’horizon. Les conditions météo sont indisponibles." });
  return Object.freeze({ astronomicalState: "above_horizon", weatherState: state, confidence: "indicative", level: sky.astronomicalNight ? "favorable" : "possible", explanation: "Les conditions sont assez favorables, sans garantir l’observation depuis votre emplacement exact." });
}

function assetRecommendation({ phase, illumination, moon, sky, weather }) {
  const compatible = !["OVERCAST", "FOG", "RAIN", "HEAVY_RAIN", "SNOW", "STORM"].includes(weather?.state);
  if (!sky.night || !moon.aboveHorizon || !compatible) return Object.freeze({ eligible: false, assetId: null, reason: "Ciel, horizon ou météo incompatibles." });
  if (phase.key === "full" && illumination >= 0.96) return Object.freeze({ eligible: true, priority: 90, assetId: "OUTSIDE_PLEINE_LUNE_VILLAGE_FJORDIQUE", reason: "Pleine Lune levée et ciel compatible." });
  if (["waxing_crescent", "waning_crescent"].includes(phase.key) && illumination <= 0.45) return Object.freeze({ eligible: true, priority: 70, assetId: "OUTSIDE_NUIT_ETOILEE_CROISSANT_VILLAGE_NORDIQUE", reason: "Croissant réellement levé et ciel compatible." });
  if (sky.darkSkyPotential === "high") return Object.freeze({ eligible: true, priority: 50, assetId: "OUTSIDE_VOIE_LACTEE_FJORD_ALPIN", reason: "Nuit astronomique, faible gêne lunaire et ciel compatible." });
  return Object.freeze({ eligible: false, assetId: null, reason: "Aucun décor céleste spécialisé n’est justifié." });
}

export function calculateCelestialContext({ now = Date.now(), latitude, longitude, timezone, elevation = 0, weather = null, source = "residence", label = "" }) {
  const A = astronomy();
  if (![latitude, longitude].every(Number.isFinite)) throw new TypeError("Coordonnées de l’observateur invalides.");
  const date = new Date(now);
  const observer = new A.Observer(latitude, longitude, Number(elevation) || 0);
  const phaseAngle = A.MoonPhase(date);
  const phase = classifyMoonPhase(phaseAngle);
  const illuminationInfo = A.Illumination(A.Body.Moon, date);
  const moonPosition = position(A.Body.Moon, date, observer);
  const sunPosition = position(A.Body.Sun, date, observer);
  const rise = searchRiseSet(observer, date, +1);
  const set = searchRiseSet(observer, date, -1);
  const moon = Object.freeze({
    ...phase, phaseAngle, illuminatedFraction: illuminationInfo.phase_fraction,
    illuminatedPercent: Math.round(illuminationInfo.phase_fraction * 100),
    distanceKm: illuminationInfo.geo_dist * A.KM_PER_AU,
    ...moonPosition, rise, set,
  });
  const astronomicalNight = sunPosition.altitude <= -18;
  const night = sunPosition.altitude < -6;
  const moonInterference = moon.aboveHorizon ? moon.illuminatedFraction : 0;
  const weatherCompatible = !["OVERCAST", "FOG", "RAIN", "HEAVY_RAIN", "SNOW", "STORM"].includes(weather?.state);
  const sky = Object.freeze({ sunAltitude: sunPosition.altitude, astronomicalNight, night, moonInterference, darkSkyPotential: astronomicalNight && weatherCompatible && moonInterference < 0.35 ? "high" : astronomicalNight && weatherCompatible ? "moderate" : "low" });
  const phases = [phaseEvent(0, "new", "Nouvelle Lune", date), phaseEvent(90, "first_quarter", "Premier quartier", date), phaseEvent(180, "full", "Pleine Lune", date), phaseEvent(270, "last_quarter", "Dernier quartier", date)].filter(Boolean).sort((a, b) => a.epochMs - b.epochMs);
  const apsisRaw = A.SearchLunarApsis(date);
  const apsis = Object.freeze({ type: apsisRaw.kind === A.ApsisKind.Pericenter ? "perigee" : "apogee", name: apsisRaw.kind === A.ApsisKind.Pericenter ? "Périgée lunaire" : "Apogée lunaire", epochMs: apsisRaw.time.date.getTime(), distanceKm: apsisRaw.dist_km, source: "Astronomy Engine 2.1.19" });
  const solarRaw = A.SearchLocalSolarEclipse(date, observer);
  const solarEclipse = solarRaw ? Object.freeze({ type: "solar_eclipse", kind: String(solarRaw.kind), name: "Éclipse solaire locale", epochMs: solarRaw.peak.time.date.getTime(), altitude: solarRaw.peak.altitude, visibleLocally: solarRaw.peak.altitude > 0, safety: "N’observez jamais directement le Soleil sans protection certifiée adaptée." }) : null;
  const lunarRaw = A.SearchLunarEclipse(date);
  const lunarPeak = lunarRaw?.peak?.date;
  const lunarPosition = lunarPeak ? position(A.Body.Moon, lunarPeak, observer) : null;
  const lunarEclipse = lunarRaw ? Object.freeze({ type: "lunar_eclipse", kind: String(lunarRaw.kind), name: "Éclipse lunaire", epochMs: lunarPeak.getTime(), visibleLocally: lunarPosition.aboveHorizon, altitude: lunarPosition.altitude }) : null;
  const events = [...phases, apsis, ...(solarEclipse && solarEclipse.epochMs - now <= 366 * DAY_MS ? [solarEclipse] : []), ...(lunarEclipse && lunarEclipse.epochMs - now <= 366 * DAY_MS ? [lunarEclipse] : [])].sort((a, b) => a.epochMs - b.epochMs);
  const visibility = visibilityFor(weather, moon, sky);
  const recommendation = assetRecommendation({ phase, illumination: moon.illuminatedFraction, moon, sky, weather });
  return Object.freeze({
    version: CELESTIAL_ENGINE_VERSION, calculatedAt: new Date(now).toISOString(),
    observer: Object.freeze({ latitude, longitude, timezone, elevation, source, label }),
    moon, sky, visibility, events: Object.freeze(events), nextMajorEvent: events[0] ?? null, recommendation,
    sources: Object.freeze({ astronomy: "Astronomy Engine 2.1.19 · calcul local", weather: weather?.source ?? "indisponible" }),
  });
}
