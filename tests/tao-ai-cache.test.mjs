import test from "node:test";
import assert from "node:assert/strict";
import { createTaoAICacheKey, getCachedTaoAI, setCachedTaoAI } from "../tao-ai-cache.mjs";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

test("la synthèse quotidienne est stable pour le même profil, date, faits et prompt", () => {
  const input = { profileId: "P1", localDate: "2026-08-13", facts: [{ id: "F1" }], promptVersion: "v1" };
  assert.equal(createTaoAICacheKey(input), createTaoAICacheKey(input));
  assert.notEqual(createTaoAICacheKey(input), createTaoAICacheKey({ ...input, localDate: "2026-08-14" }));
  assert.notEqual(createTaoAICacheKey(input), createTaoAICacheKey({ ...input, profileId: "P2" }));
});

test("une réponse quotidienne peut être relue sans nouvel appel", () => {
  const memory = storage();
  setCachedTaoAI("K", { response: { speech: "Bonjour" }, model: "gemini" }, memory);
  assert.equal(getCachedTaoAI("K", memory).response.speech, "Bonjour");
});

test("la mémoire IA d’un profil peut être effacée localement", async () => {
  const values = new Map();
  const memory = { get length() { return values.size; }, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), key: (index) => [...values.keys()][index] ?? null };
  const { updateTaoAIContinuity, clearTaoAIMemory, getTaoAIContinuity } = await import(`../tao-ai-memory.js?clear=${Date.now()}`);
  updateTaoAIContinuity("P1", { recentTopics: ["conversation"] }, memory);
  memory.setItem("tao.ai.daily.v1.P1.2026-08-13.hash", "cached");
  clearTaoAIMemory("P1", memory);
  assert.deepEqual(getTaoAIContinuity("P1", memory).recentTopics, []);
  assert.equal(memory.getItem("tao.ai.daily.v1.P1.2026-08-13.hash"), null);
});
