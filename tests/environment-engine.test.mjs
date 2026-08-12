import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateSolarTimes, determineDayPeriod } from "../solar-engine.mjs";
import { composeEnvironment } from "../environment-engine.mjs";
import { getZonedParts, localDateTimeToEpoch } from "../time-zone.mjs";

const LOCATION = { latitude: 48.8566, longitude: 2.3522, timeZone: "Europe/Paris" };

test("les heures solaires locales remplacent les seuils fixes", () => {
  const solar = calculateSolarTimes({ date: "2026-08-12", ...LOCATION });
  const sunrise = getZonedParts(solar.sunrise, LOCATION.timeZone);
  const sunset = getZonedParts(solar.sunset, LOCATION.timeZone);
  assert.ok(sunrise.hour >= 6 && sunrise.hour <= 7);
  assert.ok(sunset.hour >= 20 && sunset.hour <= 22);
  const at = (hour, minute = 0) => localDateTimeToEpoch({ year: 2026, month: 8, day: 12, hour, minute }, LOCATION.timeZone);
  assert.equal(determineDayPeriod(at(6), solar).state, "DAWN");
  assert.equal(determineDayPeriod(at(9), solar).state, "MORNING");
  assert.equal(determineDayPeriod(at(12), solar).state, "DAY");
  assert.equal(determineDayPeriod(at(22), solar).state, "NIGHT");
  assert.equal(determineDayPeriod(at(2), solar).state, "NIGHT");
});

test("la priorité temps puis météo reste physiquement cohérente", () => {
  const nightRain = composeEnvironment({ period: { state: "NIGHT", progress: 0.5 }, weatherState: "RAIN", latitude: 48, month: 8 });
  assert.equal(nightRain.assetId, "OUTSIDE_PLUIE_DOUCE_VILLAGE_FJORDIQUE");
  assert.equal(nightRain.starsVisible, false);
  const nightClear = composeEnvironment({ period: { state: "NIGHT", progress: 0.5 }, weatherState: "CLEAR", latitude: 48, month: 8 });
  assert.equal(nightClear.assetId, "OUTSIDE_NUIT_ETOILEE_FJORD_ALPIN");
  assert.equal(nightClear.starsVisible, true);
  const nightCloudy = composeEnvironment({ period: { state: "NIGHT", progress: 0.5 }, weatherState: "OVERCAST", latitude: 48, month: 8 });
  assert.equal(nightCloudy.assetId, "OUTSIDE_JOUR_NUAGEUX_FJORD_ALPIN");
  assert.equal(nightCloudy.starsVisible, false);
  assert.equal(nightCloudy.celestialEvent, null);
});

test("les six moments et les six météos de debug disposent d’un rendu", () => {
  for (const state of ["DAWN", "MORNING", "DAY", "LATE_AFTERNOON", "TWILIGHT", "NIGHT"]) {
    for (const weather of ["CLEAR", "CLOUDY", "FOG", "RAIN", "SNOW", "STORM"]) {
      assert.match(composeEnvironment({ period: { state, progress: 0.5 }, weatherState: weather, latitude: 48, month: 8 }).assetId, /^OUTSIDE_/);
    }
  }
});

test("le rendu utilise deux calques en fondu sans toucher au cadrage", async () => {
  const [controller, styles] = await Promise.all([readFile(new URL("../exterior-states.js", import.meta.url), "utf8"), readFile(new URL("../styles.css", import.meta.url), "utf8")]);
  assert.match(controller, /standbyLayer/);
  assert.match(styles, /transition:\s*opacity 2\.2s ease/);
  assert.match(styles, /--outside-x, 8%/);
  assert.doesNotMatch(controller, /geolocation/);
});
