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

test("la guidance détaillée expose des tendances sans score arbitraire", () => {
  const result = calculateDailyTao(input());
  assert.equal("score" in result.resonance, false);
  assert.ok(["high", "moderate", "gentle"].includes(result.resonance.level));
  assert.ok(["favorable", "balanced", "prudence"].includes(result.domains.action));
  assert.ok(["fluid", "sensitive", "observing"].includes(result.domains.relations));
  assert.ok(result.domains.dominantElement);
  assert.ok(result.domains.quieterElement);
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

test("deux profils reçoivent une signature réellement différente le même jour", () => {
  const aliceInput = input();
  const lucile = { ...profile("profile-b"), firstName: "Lucile", birthDate: "1987-05-11", birthTime: "14:08" };
  const lucileInput = input({ profile: lucile });
  const alice = calculateDailyTao(aliceInput);
  const other = calculateDailyTao(lucileInput);
  assert.notEqual(alice.personalSignature.fingerprint, other.personalSignature.fingerprint);
  assert.notEqual(`${alice.personalSignature.tenGod}|${alice.personalSignature.interactions.map(({ type, pillarId }) => `${type}:${pillarId}`).join(",")}`, `${other.personalSignature.tenGod}|${other.personalSignature.interactions.map(({ type, pillarId }) => `${type}:${pillarId}`).join(",")}`);
  assert.ok(alice.personalSignature.facts.every(({ label }) => !label.includes(aliceInput.profile.birthDate)));
});

test("un même profil change de signature lorsque le pilier du jour change", () => {
  const first = calculateDailyTao(input({ date: "2026-08-12" }));
  const next = calculateDailyTao(input({ date: "2026-08-13" }));
  assert.notEqual(first.personalSignature.fingerprint, next.personalSignature.fingerprint);
  assert.notEqual(first.personalSignature.facts.find(({ type }) => type === "DAY_STEM").value, next.personalSignature.facts.find(({ type }) => type === "DAY_STEM").value);
});

test("les cinq Mouvements utilisent une préposition française correcte", () => {
  const summaries = [];
  for (let day = 1; day <= 12; day += 1) {
    summaries.push(calculateDailyTao(input({ date: `2026-08-${String(day).padStart(2, "0")}` })).dayEnergy.summary);
  }
  assert.doesNotMatch(summaries.join(" "), /\bde le\b|\bde lEau\b/i);
  for (const expected of ["du Bois", "du Feu", "de la Terre", "du Métal", "de l’Eau"]) {
    assert.ok(summaries.some((summary) => summary.includes(expected)), `${expected} doit apparaître`);
  }
});
