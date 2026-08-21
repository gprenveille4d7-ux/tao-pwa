import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSeasonalProfile, getSeasonalPeriod, normalizeSeasonalWeather, selectCareAdvice } from "../seasonal-balance.mjs";

const day = (element = "metal", polarity = "yang") => ({ dayEnergy: { stem: { element, polarity } } });
const theme = (master, counts) => ({ dayMaster: { element: master }, elements: Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, { count }])) });

test("le terme, le Mouvement et la prochaine transition restent déterministes", () => {
  const period = getSeasonalPeriod(Date.parse("2026-08-12T12:00:00Z"), 2026);
  assert.equal(period.pinyin, "Li Qiu");
  assert.equal(period.movement, "metal");
  assert.equal(period.correspondence.season, "autumn");
  assert.ok(period.daysUntilNext >= 8 && period.daysUntilNext <= 13);
  assert.ok(period.progress > 0 && period.progress < 1);
});

test("la fenêtre de transition J-5 à J+2 est calculée et testable", () => {
  const before = getSeasonalPeriod(Date.parse("2026-08-20T12:00:00Z"), 2026);
  const after = getSeasonalPeriod(before.next.epochMs + 24 * 60 * 60_000, 2026);
  assert.equal(before.transitionWindow, true);
  assert.equal(after.transitionWindow, true);
  assert.ok(after.daysSinceCurrent <= 2);
});

test("deux profils différents ne reçoivent pas la même relation saisonnière", () => {
  const period = getSeasonalPeriod(Date.parse("2026-08-12T12:00:00Z"), 2026);
  const counts = { wood: 1, fire: 2, earth: 2, metal: 1, water: 2 };
  const metalProfile = buildSeasonalProfile({ period, natalTheme: theme("metal", counts), dailyResult: day(), weather: null });
  const woodProfile = buildSeasonalProfile({ period, natalTheme: theme("wood", counts), dailyResult: day(), weather: null });
  assert.equal(metalProfile.relation, "same");
  assert.equal(woodProfile.relation, "tension");
  assert.notDeepEqual(metalProfile, woodProfile);
});

test("froid, chaud, humide, sec, vent et météo absente sont normalisés sans blocage", () => {
  const weather = (raw, state = "CLEAR") => normalizeSeasonalWeather({ raw, state, source: "test" });
  assert.ok(weather({ temperature: 5, apparentTemperature: 4, humidity: 50, windSpeed: 5 }).trends.includes("cold"));
  assert.ok(weather({ temperature: 32, apparentTemperature: 35, humidity: 50, windSpeed: 5 }).trends.includes("heat"));
  assert.ok(weather({ temperature: 18, apparentTemperature: 18, humidity: 82, windSpeed: 5 }).trends.includes("humidity"));
  assert.ok(weather({ temperature: 18, apparentTemperature: 18, humidity: 28, windSpeed: 5 }).trends.includes("potentialDryness"));
  assert.ok(weather({ temperature: 18, apparentTemperature: 18, humidity: 50, windSpeed: 30 }).trends.includes("wind"));
  assert.equal(normalizeSeasonalWeather(null).available, false);
});

test("les conseils sont courts, déterministes et généraux", () => {
  const period = getSeasonalPeriod(Date.parse("2026-08-12T12:00:00Z"), 2026);
  const profile = buildSeasonalProfile({ period, natalTheme: theme("wood", { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 }), dailyResult: day(), weather: { state: "CLEAR", source: "test", raw: { temperature: 33, apparentTemperature: 35, humidity: 30, windSpeed: 3 } } });
  const advice = selectCareAdvice(profile);
  assert.ok(advice.length >= 2 && advice.length <= 4);
  assert.deepEqual(advice, selectCareAdvice(profile));
});

test("aucun texte saisonnier n’emploie une formulation diagnostique interdite", async () => {
  const text = `${await readFile(new URL("../seasonal-balance.mjs", import.meta.url), "utf8")}\n${await readFile(new URL("../locales/fr/seasonal.js", import.meta.url), "utf8")}`.toLocaleLowerCase("fr-FR");
  for (const forbidden of ["vos poumons sont faibles", "votre foie est malade", "vous allez tomber malade", "vous empêchera d’être malade", "votre rein manque d’énergie"]) assert.equal(text.includes(forbidden), false);
});
