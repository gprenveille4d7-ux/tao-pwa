import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

globalThis.Astronomy = createRequire(import.meta.url)("../vendor/astronomy.browser.min.js");
const { calculateCelestialContext, classifyMoonPhase } = await import("../celestial-engine.mjs");

test("les huit phases lunaires et le passage 359° sont classés sans ambiguïté", () => {
  assert.equal(classifyMoonPhase(0).key, "new");
  assert.equal(classifyMoonPhase(45).key, "waxing_crescent");
  assert.equal(classifyMoonPhase(90).key, "first_quarter");
  assert.equal(classifyMoonPhase(135).key, "waxing_gibbous");
  assert.equal(classifyMoonPhase(180).key, "full");
  assert.equal(classifyMoonPhase(225).key, "waning_gibbous");
  assert.equal(classifyMoonPhase(270).key, "last_quarter");
  assert.equal(classifyMoonPhase(315).key, "waning_crescent");
  assert.equal(classifyMoonPhase(359).key, "new");
});

test("le ciel réel expose phase, éclairage, horizon, événements et source locale", () => {
  const context = calculateCelestialContext({ now: Date.parse("2026-08-24T20:00:00Z"), latitude: 43.2965, longitude: 5.3698, timezone: "Europe/Paris", label: "Marseille", weather: { state: "CLEAR", source: "test" } });
  assert.equal(context.observer.label, "Marseille");
  assert.ok(context.moon.illuminatedFraction >= 0 && context.moon.illuminatedFraction <= 1);
  assert.ok(Number.isFinite(context.moon.altitude));
  assert.ok(Number.isFinite(context.moon.distanceKm));
  assert.ok(context.events.some(({ type }) => type === "moon_phase"));
  assert.match(context.sources.astronomy, /Astronomy Engine 2\.1\.19/);
});

test("la météo nuance l’observation sans modifier les faits astronomiques", () => {
  const input = { now: Date.parse("2026-08-24T20:00:00Z"), latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" };
  const clear = calculateCelestialContext({ ...input, weather: { state: "CLEAR" } });
  const covered = calculateCelestialContext({ ...input, weather: { state: "OVERCAST" } });
  assert.equal(clear.moon.phaseAngle, covered.moon.phaseAngle);
  assert.equal(clear.moon.altitude, covered.moon.altitude);
  if (covered.moon.aboveHorizon) assert.equal(covered.visibility.level, "unfavorable");
});
