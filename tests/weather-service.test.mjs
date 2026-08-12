import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenMeteoUrl, getWeatherState, normalizeWeather } from "../weather-service.mjs";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

const location = { latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" };

test("les codes WMO deviennent des états indépendants du fournisseur", () => {
  assert.equal(normalizeWeather({ weatherCode: 0, cloudCover: 5 }), "CLEAR");
  assert.equal(normalizeWeather({ weatherCode: 2, cloudCover: 50 }), "CLOUDY");
  assert.equal(normalizeWeather({ weatherCode: 45 }), "FOG");
  assert.equal(normalizeWeather({ weatherCode: 61, rain: 1 }), "RAIN");
  assert.equal(normalizeWeather({ weatherCode: 65, rain: 6 }), "HEAVY_RAIN");
  assert.equal(normalizeWeather({ weatherCode: 75, snowfall: 2 }), "SNOW");
  assert.equal(normalizeWeather({ weatherCode: 95 }), "STORM");
});

test("la requête ne transmet que lieu, fuseau et variables météo", () => {
  const url = new URL(buildOpenMeteoUrl(location));
  assert.equal(url.hostname, "api.open-meteo.com");
  assert.equal(url.searchParams.get("timezone"), "Europe/Paris");
  assert.match(url.searchParams.get("current"), /weather_code/);
  assert.match(url.searchParams.get("daily"), /sunrise/);
  assert.doesNotMatch(url.href, /firstName|birthDate|profile/);
});

test("le cache récent évite un appel et le cache ancien protège le hors-ligne", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ current: { weather_code: 61, cloud_cover: 90, precipitation: 1, rain: 1, snowfall: 0, wind_speed_10m: 12 }, daily: { time: ["2026-08-12"], sunrise: ["2026-08-12T06:40"], sunset: ["2026-08-12T21:14"] } }) };
  };
  const online = await getWeatherState(location, { now: 1_786_500_000_000, fetcher, storage });
  assert.equal(online.state, "RAIN");
  assert.equal(online.solar.date, "2026-08-12");
  const cached = await getWeatherState(location, { now: 1_786_500_300_000, fetcher, storage });
  assert.equal(cached.source, "fresh-cache");
  assert.equal(calls, 1);
  const offline = await getWeatherState(location, { now: 1_786_503_600_000, fetcher: async () => { throw new Error("offline"); }, storage, force: true });
  assert.equal(offline.source, "stale-cache");
  assert.equal(offline.state, "RAIN");
});

test("sans réseau ni cache, l’heure solaire reste utilisable sans fausse météo", async () => {
  const result = await getWeatherState(location, { fetcher: async () => { throw new Error("offline"); }, storage: memoryStorage() });
  assert.equal(result.state, null);
  assert.equal(result.source, "unavailable");
});
