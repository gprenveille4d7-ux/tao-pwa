import test from "node:test";
import assert from "node:assert/strict";
import { calculateBazi } from "../bazi-engine.mjs";
import { calculateDaYun, directionFor } from "../da-yun-engine.mjs";

const place = { id: "avranches", city: "Avranches", country: "France", latitude: 48.6844, longitude: -1.3569, timezone: "Europe/Paris" };
const profile = { id: "g", firstName: "Guillaume", relationship: "self", birthDate: "1985-09-11", birthTimeKnown: true, birthTime: "13:50", birthPlace: place, daYunConvention: "masculine" };

test("les quatre conventions canoniques déterminent la direction", () => {
  assert.equal(directionFor("yang", "masculine"), "FORWARD");
  assert.equal(directionFor("yin", "feminine"), "FORWARD");
  assert.equal(directionFor("yin", "masculine"), "BACKWARD");
  assert.equal(directionFor("yang", "feminine"), "BACKWARD");
});

test("les Da Yun dérivent du Pilier du Mois et se suivent sans trou", () => {
  const natalTheme = calculateBazi(profile);
  const result = calculateDaYun({ profile, natalTheme, now: Date.parse("2026-08-24T12:00:00Z") });
  assert.equal(result.available, true);
  assert.equal(result.cycles.length, 10);
  const step = result.direction === "FORWARD" ? 1 : 59;
  const monthIndex = Array.from({ length: 60 }, (_, index) => index).find((index) => index % 10 === natalTheme.pillars.month.stem.index && index % 12 === natalTheme.pillars.month.branch.index);
  assert.equal(result.cycles[0].pillar.sexagenaryIndex, (monthIndex + step) % 60);
  result.cycles.slice(1).forEach((cycle, index) => {
    assert.equal(cycle.startEpochMs, result.cycles[index].endEpochMs);
    assert.equal(cycle.pillar.sexagenaryIndex, (result.cycles[index].pillar.sexagenaryIndex + step) % 60);
  });
  assert.equal(result.cycles.filter(({ temporalStatus }) => temporalStatus === "current").length, 1);
});

test("TAO n’invente ni heure ni convention manquante", () => {
  const natalTheme = calculateBazi(profile);
  assert.equal(calculateDaYun({ profile: { ...profile, daYunConvention: null }, natalTheme }).reason, "convention-required");
  const unknown = { ...profile, birthTimeKnown: false, birthTime: null };
  assert.equal(calculateDaYun({ profile: unknown, natalTheme: calculateBazi(unknown) }).reason, "birth-time-required");
});
