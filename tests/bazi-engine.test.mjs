import test from "node:test";
import assert from "node:assert/strict";
import {
  CALCULATION_VERSION,
  calculateBazi,
  getSolarTermInstant,
  localDateTimeToInstant,
} from "../bazi-engine.mjs";
import {
  createBaziFingerprint,
  getCachedBazi,
  setCachedBazi,
} from "../bazi-cache.mjs";

function profile(overrides = {}) {
  return {
    id: overrides.id ?? "profile-a",
    firstName: overrides.firstName ?? "Alice",
    relationship: "self",
    birthDate: overrides.birthDate ?? "1985-09-11",
    birthTime: overrides.birthTime === undefined ? "14:32" : overrides.birthTime,
    birthTimeKnown: overrides.birthTimeKnown ?? true,
    birthPlace: {
      id: "place-a",
      city: "Paris",
      country: "France",
      latitude: 48.8566,
      longitude: 2.3522,
      timezone: overrides.timezone ?? "Europe/Paris",
    },
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("fixture complète : quatre piliers reproductibles", () => {
  const result = calculateBazi(profile());
  assert.equal(result.calculationVersion, CALCULATION_VERSION);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.pillars).map(([key, pillar]) => [key, pillar.label])),
    { year: "Yi Chou", month: "Yi You", day: "Gui Chou", hour: "Ji Wei" },
  );
  assert.equal(result.dayMaster.name, "Gui");
  assert.equal(result.yinYang.total, 8);
});

test("heure inconnue : trois piliers et aucune heure inventée", () => {
  const result = calculateBazi(profile({ birthTimeKnown: false, birthTime: null }));
  assert.equal(result.pillars.year.label, "Yi Chou");
  assert.equal(result.pillars.month.label, "Yi You");
  assert.equal(result.pillars.day.label, "Gui Chou");
  assert.equal(result.pillars.hour.determined, false);
  assert.equal(result.metadata.birthTime, null);
  assert.equal(result.yinYang.total, 6);
});

test("jour de référence sexagésimal : 7 janvier 2000 = Jia Zi", () => {
  const result = calculateBazi(profile({ birthDate: "2000-01-07", birthTime: "12:00", timezone: "UTC" }));
  assert.equal(result.pillars.day.label, "Jia Zi");
});

test("Li Chun 2024 est proche de l’éphéméride officielle", () => {
  const computed = getSolarTermInstant(2024, 315);
  const reference = Date.UTC(2024, 1, 4, 8, 27);
  assert.ok(Math.abs(computed - reference) < 20 * 60_000);
});

test("la frontière de Li Chun change année et mois", () => {
  const before = calculateBazi(profile({ birthDate: "2024-02-04", birthTime: "08:20", timezone: "UTC" }));
  const after = calculateBazi(profile({ birthDate: "2024-02-04", birthTime: "08:22", timezone: "UTC" }));
  assert.equal(before.pillars.year.label, "Gui Mao");
  assert.equal(before.pillars.month.label, "Yi Chou");
  assert.equal(after.pillars.year.label, "Jia Chen");
  assert.equal(after.pillars.month.label, "Bing Yin");
});

test("une heure inconnue le jour de Li Chun ne force pas un résultat", () => {
  const result = calculateBazi(
    profile({ birthDate: "2024-02-04", birthTimeKnown: false, birthTime: null, timezone: "UTC" }),
  );
  assert.equal(result.pillars.year.determined, false);
  assert.equal(result.pillars.month.determined, false);
  assert.equal(result.pillars.day.determined, true);
  assert.equal(result.pillars.hour.determined, false);
});

test("la frontière Jing Zhe change le mois solaire", () => {
  const before = calculateBazi(profile({ birthDate: "2024-03-05", birthTime: "02:14", timezone: "UTC" }));
  const after = calculateBazi(profile({ birthDate: "2024-03-05", birthTime: "02:15", timezone: "UTC" }));
  assert.equal(before.pillars.month.label, "Bing Yin");
  assert.equal(after.pillars.month.label, "Ding Mao");
});

test("année bissextile et changement de jour conservent le cycle", () => {
  const leapDay = calculateBazi(profile({ birthDate: "2024-02-29", birthTime: "12:00", timezone: "UTC" }));
  const nextDay = calculateBazi(profile({ birthDate: "2024-03-01", birthTime: "12:00", timezone: "UTC" }));
  assert.equal(leapDay.pillars.day.label, "Gui Hai");
  assert.equal(nextDay.pillars.day.label, "Jia Zi");
});

test("frontières des heures doubles", () => {
  const cases = [
    ["00:59", "Zi"],
    ["01:00", "Chou"],
    ["22:59", "Hai"],
    ["23:00", "Zi"],
  ];
  for (const [birthTime, branch] of cases) {
    const result = calculateBazi(profile({ birthDate: "2024-01-15", birthTime, timezone: "UTC" }));
    assert.equal(result.pillars.hour.branch.name, branch);
  }
});

test("le fuseau IANA applique l’historique DST et refuse une heure inexistante", () => {
  const winter = localDateTimeToInstant(
    { year: 2024, month: 1, day: 15, hour: 12, minute: 0 },
    "Europe/Paris",
  );
  assert.equal(new Date(winter.epochMs).toISOString(), "2024-01-15T11:00:00.000Z");
  assert.throws(
    () =>
      localDateTimeToInstant(
        { year: 2024, month: 3, day: 31, hour: 2, minute: 30 },
        "Europe/Paris",
      ),
    (error) => error.code === "BAZI_INVALID_LOCAL_TIME",
  );
});

test("deux profils produisent deux résultats indépendants", () => {
  const first = calculateBazi(profile({ id: "first" }));
  const second = calculateBazi(
    profile({ id: "second", birthDate: "2000-01-07", birthTime: "12:00", timezone: "UTC" }),
  );
  assert.equal(first.profileId, "first");
  assert.equal(second.profileId, "second");
  assert.notEqual(first.pillars.day.label, second.pillars.day.label);
});

test("le cache est séparé par profil et invalidé par les données natales", () => {
  const storage = memoryStorage();
  const firstProfile = profile({ id: "first" });
  const secondProfile = profile({ id: "second", birthDate: "2000-01-07", timezone: "UTC" });
  const firstResult = calculateBazi(firstProfile);
  const secondResult = calculateBazi(secondProfile);
  setCachedBazi(firstProfile, firstResult, storage);
  setCachedBazi(secondProfile, secondResult, storage);
  assert.equal(getCachedBazi(firstProfile, storage).profileId, "first");
  assert.equal(getCachedBazi(secondProfile, storage).profileId, "second");

  const modified = { ...firstProfile, birthDate: "1985-09-12" };
  assert.notEqual(createBaziFingerprint(modified), createBaziFingerprint(firstProfile));
  assert.equal(getCachedBazi(modified, storage), null);
});
