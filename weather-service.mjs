import { parseLocalIso } from "./time-zone.mjs";

export const WEATHER_CACHE_VERSION = "tao-weather-cache-1.1.0";
export const WEATHER_STATES = Object.freeze(["CLEAR", "PARTLY_CLOUDY", "CLOUDY", "OVERCAST", "FOG", "RAIN", "HEAVY_RAIN", "SNOW", "STORM"]);
const CACHE_PREFIX = "tao.environment.weather.v1";
const FRESH_MS = 30 * 60_000;
const STALE_MS = 12 * 60 * 60_000;

export function normalizeWeather({ weatherCode, cloudCover = 0, precipitation = 0, rain = 0, snowfall = 0 }) {
  const code = Number(weatherCode);
  if ([95, 96, 99].includes(code)) return "STORM";
  if ([71, 73, 75, 77, 85, 86].includes(code) || Number(snowfall) > 0) return "SNOW";
  if ([65, 67, 82].includes(code) || Number(precipitation) >= 5 || Number(rain) >= 5) return "HEAVY_RAIN";
  if ([51, 53, 55, 56, 57, 61, 63, 66, 80, 81].includes(code) || Number(precipitation) > 0 || Number(rain) > 0) return "RAIN";
  if ([45, 48].includes(code)) return "FOG";
  if (code === 3 || Number(cloudCover) >= 85) return "OVERCAST";
  if (code === 2 || Number(cloudCover) >= 55) return "CLOUDY";
  if (code === 1 || Number(cloudCover) >= 20) return "PARTLY_CLOUDY";
  return "CLEAR";
}

function storageKey(location) {
  return `${CACHE_PREFIX}:${Number(location.latitude).toFixed(3)}:${Number(location.longitude).toFixed(3)}:${location.timezone}`;
}

function readCache(location, storage) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(storageKey(location)) ?? "null");
    return value?.version === WEATHER_CACHE_VERSION ? value : null;
  } catch { return null; }
}

function writeCache(location, value, storage) {
  try { storage?.setItem(storageKey(location), JSON.stringify(value)); } catch { /* mode privé ou quota */ }
}

export function buildOpenMeteoUrl(location) {
  const current = "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,precipitation,rain,snowfall,wind_speed_10m";
  const query = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude), current,
    daily: "sunrise,sunset,temperature_2m_max,temperature_2m_min", timezone: location.timezone, forecast_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${query}`;
}

function normalizeResponse(payload, location, fetchedAt) {
  const current = payload.current ?? {};
  const raw = Object.freeze({
    weatherCode: current.weather_code, cloudCover: current.cloud_cover ?? 0,
    precipitation: current.precipitation ?? 0, rain: current.rain ?? 0,
    snowfall: current.snowfall ?? 0, windSpeed: current.wind_speed_10m ?? 0,
    temperature: current.temperature_2m ?? null,
    apparentTemperature: current.apparent_temperature ?? null,
    humidity: current.relative_humidity_2m ?? null,
    temperatureMax: payload.daily?.temperature_2m_max?.[0] ?? null,
    temperatureMin: payload.daily?.temperature_2m_min?.[0] ?? null,
  });
  return Object.freeze({
    version: WEATHER_CACHE_VERSION, fetchedAt, source: "open-meteo",
    state: normalizeWeather(raw), raw,
    solar: Object.freeze({
      date: payload.daily?.time?.[0] ?? null,
      sunrise: parseLocalIso(payload.daily?.sunrise?.[0], location.timezone),
      sunset: parseLocalIso(payload.daily?.sunset?.[0], location.timezone),
    }),
  });
}

export async function getWeatherState(location, { now = Date.now(), fetcher = globalThis.fetch, storage = globalThis.localStorage, force = false } = {}) {
  const cached = readCache(location, storage);
  if (!force && cached && now - cached.fetchedAt < FRESH_MS) return Object.freeze({ ...cached, source: "fresh-cache" });
  try {
    if (typeof fetcher !== "function") throw new Error("Réseau indisponible");
    const response = await fetcher(buildOpenMeteoUrl(location), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const value = normalizeResponse(await response.json(), location, now);
    writeCache(location, value, storage);
    return value;
  } catch (error) {
    if (cached && now - cached.fetchedAt < STALE_MS) return Object.freeze({ ...cached, source: "stale-cache", stale: true });
    return Object.freeze({ version: WEATHER_CACHE_VERSION, fetchedAt: null, source: "unavailable", state: null, raw: null, solar: null, error: String(error?.message ?? error) });
  }
}
