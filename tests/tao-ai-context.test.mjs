import test from "node:test";
import assert from "node:assert/strict";

function memoryStorage() {
  const values = new Map();
  return { get length() { return values.size; }, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), key: (index) => [...values.keys()][index] ?? null };
}

const profile = {
  schemaVersion: 1, id: "profile-ai", firstName: "Alice", relationship: "self", birthDate: "1985-09-11", birthTime: "14:32", birthTimeKnown: true,
  birthPlace: { id: "paris", city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z",
};

test("le context builder envoie les résultats et jamais les données natales brutes", async () => {
  globalThis.localStorage = memoryStorage();
  localStorage.setItem("tao.profiles.v1", JSON.stringify([profile]));
  localStorage.setItem("tao.activeProfileId.v1", profile.id);
  const { buildTaoAIContext } = await import(`../tao-ai-context.mjs?privacy=${Date.now()}`);
  const context = buildTaoAIContext("daily_synthesis");
  const serialized = JSON.stringify(context);
  assert.equal(context.profile.profileId, profile.id);
  assert.ok(context.bazi.dayMaster.key);
  for (const forbidden of [profile.birthDate, profile.birthTime, "48.8566", "2.3522", "Paris"]) assert.equal(serialized.includes(forbidden), false, `Donnée privée transmise : ${forbidden}`);
  assert.ok(context.today.dominantFacts.length >= 6);
});

test("le contexte Yi Jing reprend le tirage fourni sans lancer le moteur", async () => {
  globalThis.localStorage = memoryStorage();
  localStorage.setItem("tao.profiles.v1", JSON.stringify([profile]));
  localStorage.setItem("tao.activeProfileId.v1", profile.id);
  const { buildTaoAIContext } = await import(`../tao-ai-context.mjs?yijing=${Date.now()}`);
  const context = buildTaoAIContext("yijing", { yijing: { question: "Comment avancer ?", primaryHexagram: { number: 1 }, changingLines: [3], resultingHexagram: { number: 10 } } });
  assert.equal(context.yijing.primaryHexagram.number, 1);
  assert.deepEqual(context.yijing.changingLines, [3]);
});

test("le contexte constellation transmet uniquement les observations vérifiées", async () => {
  globalThis.localStorage = memoryStorage();
  localStorage.setItem("tao.profiles.v1", JSON.stringify([profile]));
  localStorage.setItem("tao.activeProfileId.v1", profile.id);
  const { buildTaoAIContext } = await import(`../tao-ai-context.mjs?family=${Date.now()}`);
  const familyConstellation = {
    familyMembers: [{ id: "p1", displayName: "Alice", relationship: "parent", birthDate: "1985-09-11" }],
    observations: [{ id: "obs_1", type: "DATE_MIRROR", interest: "HIGH", participantIds: ["p1", "p2"], values: [11, 9], independentPathCount: 3, sourceDiversity: 2, birthDate: "1985-09-11" }],
    statistics: { estimatedRandomFrequency: 0.03, simulationCount: 5_000, model: "FAMILY_CONDITIONAL", constellationDensity: 72, motifs: [{ observationId: "obs_1", estimatedRandomFrequency: 0.03, category: "UNCOMMON" }] },
  };
  const context = buildTaoAIContext("family_constellation", { familyConstellation, facts: [{ id: "obs_1", type: "FAMILY_DATE_MIRROR", value: "11/9", label: "11/09 ↔ 09/11" }] });
  assert.equal(context.familyConstellation.observations[0].id, "obs_1");
  assert.equal(context.today.dominantFacts.some(({ id }) => id === "obs_1"), true);
  assert.equal(context.familyConstellation.statistics.simulationCount, 5_000);
  assert.equal(context.familyConstellation.observations[0].independentPathCount, 3);
  assert.doesNotMatch(JSON.stringify(context.familyConstellation), /1985-09-11|birthDate/);
});
