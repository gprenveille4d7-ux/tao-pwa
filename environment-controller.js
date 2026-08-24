import { getActiveProfile } from "./profile-store.js";
import { resolveEnvironmentLocation } from "./environment-location.mjs?v=1.0.0";
import { composeEnvironment } from "./environment-engine.mjs?v=1.0.2";
import { determineDayPeriod, getSolarContext } from "./solar-engine.mjs?v=1.0.0";
import { getZonedParts, localDateTimeToEpoch } from "./time-zone.mjs";
import { getWeatherState } from "./weather-service.mjs?v=1.1.0";
import { calculateCelestialContext } from "./celestial-engine.mjs?v=1.0.0";

const LIGHT_REFRESH_MS = 60_000;
const WEATHER_REFRESH_MS = 30 * 60_000;
const scene = document.querySelector(".pavilion-scene");
const weatherAttribution = document.querySelector("[data-environment-attribution]");
const celestialLayer = document.querySelector("[data-celestial-event-layer]");
const debugHost = document.querySelector("[data-environment-debug]");
const params = new URLSearchParams(location.search);
const debugEnabled = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) && params.get("debug") === "environment";
const manualExteriorMode = ["outside", "scene"].includes(params.get("debug"));

const debugState = { simulatedTime: "AUTO", forcedPeriod: "AUTO", forcedWeather: "AUTO" };
let exterior = window.taoExterior ?? null;
let weatherReading = null;
let lastEnvironment = null;
let requestVersion = 0;
let debugOutput = null;
let activeLocationKey = null;
let authorizedCurrentPosition = null;

const TIME_OPTIONS = Object.freeze([
  ["AUTO", "Heure réelle"], ["06:00", "06:00"], ["09:00", "09:00"], ["12:00", "12:00"], ["17:00", "17:00"],
  ["SUNRISE", "Lever du Soleil"], ["SUNSET", "Coucher du Soleil"], ["TWILIGHT", "Crépuscule"], ["22:00", "22:00"], ["02:00", "02:00"],
]);
const PERIOD_OPTIONS = Object.freeze([
  ["AUTO", "Automatique"], ["DAWN", "Aube"], ["MORNING", "Matin"], ["DAY", "Jour"],
  ["LATE_AFTERNOON", "Fin d’après-midi"], ["TWILIGHT", "Crépuscule"], ["NIGHT", "Nuit"],
]);
const WEATHER_OPTIONS = Object.freeze([
  ["AUTO", "Météo réelle"], ["CLEAR", "Dégagé"], ["PARTLY_CLOUDY", "Partiellement nuageux"],
  ["CLOUDY", "Nuageux"], ["OVERCAST", "Couvert"], ["FOG", "Brouillard"], ["RAIN", "Pluie"],
  ["HEAVY_RAIN", "Forte pluie"], ["SNOW", "Neige"], ["STORM", "Orage"],
]);

function waitForExterior() {
  if (window.taoExterior) return Promise.resolve(window.taoExterior);
  return new Promise((resolve) => window.addEventListener("tao:exterior-ready", (event) => resolve(event.detail.controller), { once: true }));
}

function profileLocation() {
  const location = resolveEnvironmentLocation({
    profile: getActiveProfile(),
    mode: authorizedCurrentPosition ? "current-position" : "residence",
    currentPosition: authorizedCurrentPosition,
  });
  return location.available ? location : null;
}

function simulatedEpoch(realNow, context, timeZone) {
  const choice = debugEnabled ? debugState.simulatedTime : "AUTO";
  if (choice === "AUTO") return realNow;
  if (choice === "SUNRISE" && context.solar.sunrise) return context.solar.sunrise;
  if (choice === "SUNSET" && context.solar.sunset) return context.solar.sunset;
  if (choice === "TWILIGHT" && context.solar.sunset) return context.solar.sunset + 25 * 60_000;
  const match = /^(\d{2}):(\d{2})$/.exec(choice);
  if (!match) return realNow;
  const local = context.local;
  return localDateTimeToEpoch({ year: local.year, month: local.month, day: local.day, hour: Number(match[1]), minute: Number(match[2]) }, timeZone);
}

function solarWithOnlineValues(context, weather, now) {
  const online = weather?.solar;
  const solar = online?.date === context.solar.date && online?.sunrise && online?.sunset
    ? { ...context.solar, sunrise: online.sunrise, sunset: online.sunset, solarNoon: (online.sunrise + online.sunset) / 2, source: "open-meteo" }
    : context.solar;
  return { ...context, now, local: getZonedParts(now, context.timeZone), solar, period: determineDayPeriod(now, solar) };
}

function formatClock(epochMs, timeZone) {
  if (!epochMs) return "—";
  return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(epochMs));
}

function updateDebugOutput(context, environment) {
  if (!debugOutput) return;
  debugOutput.textContent = [
    `${String(context.local.hour).padStart(2, "0")}:${String(context.local.minute).padStart(2, "0")} · ${environment.timeState}`,
    `${environment.weatherState} · ${weatherReading?.source ?? "sans météo"}`,
    `Soleil ${formatClock(context.solar.sunrise, context.timeZone)} → ${formatClock(context.solar.sunset, context.timeZone)}`,
    environment.assetId,
    `Lune ${environment.celestial?.moon?.phaseAngle?.toFixed?.(1) ?? "—"}° · ${environment.celestial?.moon?.illuminatedPercent ?? "—"} %`,
    `Altitude ${environment.celestial?.moon?.altitude?.toFixed?.(1) ?? "—"}° · Soleil ${environment.celestial?.sky?.sunAltitude?.toFixed?.(1) ?? "—"}°`,
    environment.celestial?.recommendation?.reason ?? "",
  ].join("\n");
}

function applyCurrentEnvironment(realNow = Date.now()) {
  const location = profileLocation();
  if (!location || !exterior || !scene) return null;
  const base = getSolarContext({ now: realNow, ...location });
  const now = simulatedEpoch(realNow, base, location.timezone);
  let context = solarWithOnlineValues(base, weatherReading, now);
  if (debugEnabled && debugState.forcedPeriod !== "AUTO") context = { ...context, period: { state: debugState.forcedPeriod, progress: 0.5 } };
  const weatherState = debugEnabled && debugState.forcedWeather !== "AUTO" ? debugState.forcedWeather : weatherReading?.state;
  const effectiveWeather = weatherReading ? { ...weatherReading, state: weatherState } : null;
  const celestial = calculateCelestialContext({ now, ...location, weather: effectiveWeather, source: location.source, label: location.label });
  const environment = composeEnvironment({ period: context.period, weatherState, latitude: location.latitude, month: context.local.month, celestial });
  exterior.setState(environment.assetId, { source: "environment" });
  scene.dataset.environmentTime = environment.timeState;
  scene.dataset.environmentWeather = environment.weatherState;
  scene.dataset.environmentSeason = environment.season;
  scene.dataset.environmentStars = environment.starsVisibility;
  if (weatherAttribution) weatherAttribution.hidden = !weatherReading || weatherReading.source === "unavailable";
  celestialLayer.hidden = !celestial.recommendation.eligible;
  celestialLayer.dataset.celestialAsset = celestial.recommendation.assetId ?? "none";
  lastEnvironment = Object.freeze({ ...environment, celestial, location, solar: context.solar, local: context.local, weatherSource: weatherReading?.source ?? "unavailable" });
  globalThis.taoEnvironmentState = lastEnvironment;
  updateDebugOutput(context, environment);
  window.dispatchEvent(new CustomEvent("tao:environment-change", { detail: lastEnvironment }));
  return lastEnvironment;
}

async function refreshEnvironment({ forceWeather = false } = {}) {
  if (manualExteriorMode) return null;
  const location = profileLocation();
  if (!location) return null;
  const locationKey = `${location.latitude}:${location.longitude}:${location.timezone}`;
  if (activeLocationKey !== locationKey) {
    activeLocationKey = locationKey;
    weatherReading = null;
  }
  const version = ++requestVersion;
  applyCurrentEnvironment();
  weatherReading = await getWeatherState(location, { force: forceWeather });
  if (version !== requestVersion) return null;
  return applyCurrentEnvironment();
}

function control(label, options, key) {
  const row = document.createElement("label");
  row.textContent = label;
  const select = document.createElement("select");
  options.forEach(([value, text]) => select.append(new Option(text, value)));
  select.value = debugState[key];
  select.addEventListener("change", () => { debugState[key] = select.value; applyCurrentEnvironment(); });
  row.append(select);
  return row;
}

function enableDebugPanel() {
  if (!debugEnabled || !debugHost) return;
  debugHost.hidden = false;
  const header = document.createElement("header");
  header.innerHTML = "<strong>TAO ENVIRONMENT DEBUG</strong><small>Simulation locale · production toujours en AUTO</small>";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = "Réduire";
  toggle.setAttribute("aria-expanded", "true");
  toggle.addEventListener("click", () => {
    const collapsed = debugHost.classList.toggle("environment-debug--collapsed");
    toggle.textContent = collapsed ? "Afficher" : "Réduire";
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });
  header.append(toggle);
  debugOutput = document.createElement("output");
  debugOutput.className = "environment-debug__output";
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.textContent = "Actualiser la météo";
  refresh.addEventListener("click", () => refreshEnvironment({ forceWeather: true }));
  debugHost.append(header, control("Heure simulée", TIME_OPTIONS, "simulatedTime"), control("Moment forcé", PERIOD_OPTIONS, "forcedPeriod"), control("Météo", WEATHER_OPTIONS, "forcedWeather"), debugOutput, refresh);
}

async function initializeEnvironment() {
  exterior = await waitForExterior();
  if (manualExteriorMode) return;
  enableDebugPanel();
  await refreshEnvironment();
  window.setInterval(() => applyCurrentEnvironment(), LIGHT_REFRESH_MS);
  window.setInterval(() => refreshEnvironment(), WEATHER_REFRESH_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshEnvironment(); });
}

window.addEventListener("tao:profile-created", () => refreshEnvironment({ forceWeather: true }));
window.addEventListener("tao:profile-changed", () => refreshEnvironment({ forceWeather: true }));

window.taoEnvironment = Object.freeze({
  refresh: (options) => refreshEnvironment(options),
  getState: () => lastEnvironment,
  getWeatherState: () => weatherReading,
  useCurrentPosition: () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("La géolocalisation n’est pas disponible."));
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      authorizedCurrentPosition = Object.freeze({ latitude: coords.latitude, longitude: coords.longitude, elevation: coords.altitude ?? 0, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, label: "Position actuelle" });
      await refreshEnvironment({ forceWeather: true });
      resolve(lastEnvironment);
    }, reject, { enableHighAccuracy: false, maximumAge: 15 * 60_000, timeout: 10_000 });
  }),
});

initializeEnvironment().catch((error) => console.error("[TAO] Environnement extérieur indisponible.", error));
