import test from "node:test";
import assert from "node:assert/strict";
import { calculateBazi, calculateTemporalPillars } from "../bazi-engine.mjs";
import { DAILY_CALCULATION_VERSION, calculateDailyTao } from "../daily-tao-engine.mjs";
import { getCachedDaily, setCachedDaily } from "../daily-cache.mjs";

function profile(id = "profile-a") {
  return {
    id,
    firstName: "Alice",
    relationship: "self",
    birthDate: "1985-09-11",
    birthTime: "14:32",
    birthTimeKnown: true,
    birthPlace: { id: "paris", city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
    updatedAt: "2026-08-12T00:00:00.000Z",
  };
}

function input(overrides = {}) {
  const currentProfile = overrides.profile ?? profile();
  return {
    profile: currentProfile,
    natalTheme: calculateBazi(currentProfile),
    date: overrides.date ?? "2026-08-12",
    timeZone: overrides.timeZone ?? "Europe/Paris",
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
  };
}

test("la lecture quotidienne est déterministe et versionnée", () => {
  const first = calculateDailyTao(input());
  const second = calculateDailyTao(input());
  assert.deepEqual(first, second);
  assert.equal(first.calculationVersion, DAILY_CALCULATION_VERSION);
  assert.equal(first.pillars.day.determined, true);
  assert.equal(first.profileId, "profile-a");
});

test("le pilier du jour avance d’un rang sexagésimal le lendemain", () => {
  const first = calculateTemporalPillars({ date: "2026-08-12", timeZone: "Europe/Paris" });
  const next = calculateTemporalPillars({ date: "2026-08-13", timeZone: "Europe/Paris" });
  assert.equal(next.pillars.day.cycleIndex, (first.pillars.day.cycleIndex + 1) % 60);
});

test("le 12 août 2026 se situe dans le terme solaire Li Qiu", () => {
  const result = calculateDailyTao(input());
  assert.equal(result.solarTerm.pinyin, "Li Qiu");
  assert.equal(result.solarTerm.label, "Début de l’Automne");
});

test("la lecture combine les cinq éléments sans modifier le thème natal", () => {
  const currentInput = input();
  const natalCounts = Object.fromEntries(Object.entries(currentInput.natalTheme.elements).map(([key, value]) => [key, value.count]));
  const result = calculateDailyTao(currentInput);
  assert.equal(Object.values(result.elements).reduce((sum, item) => sum + item.combinedCount, 0), currentInput.natalTheme.yinYang.total + 2);
  assert.deepEqual(Object.fromEntries(Object.entries(currentInput.natalTheme.elements).map(([key, value]) => [key, value.count])), natalCounts);
});

test("le cache quotidien est isolé par date et profil", () => {
  const storage = memoryStorage();
  const firstInput = input();
  const first = calculateDailyTao(firstInput);
  setCachedDaily(firstInput, first, storage);
  assert.deepEqual(getCachedDaily(firstInput, storage), first);
  assert.equal(getCachedDaily(input({ date: "2026-08-13" }), storage), null);
  assert.equal(getCachedDaily(input({ profile: profile("profile-b") }), storage), null);
});
