import test from "node:test";
import assert from "node:assert/strict";
import {
  clearFamilyRarityCache,
  familyRarityCacheKey,
  getCachedFamilyRarity,
  setCachedFamilyRarity,
} from "../family-rarity-client.js";
import { FAMILY_RARITY_ENGINE_VERSION, FAMILY_RARITY_MODELS } from "../family-rarity-engine.mjs";
import { familyConstellationEngineVersion } from "../family-number-engine.mjs";

function memoryStorage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

const input = { profiles: [
  { id: "a", firstName: "A", birthDate: "1990-01-02", birthTimeKnown: false, birthTime: null },
  { id: "b", firstName: "B", birthDate: "1993-04-05", birthTimeKnown: false, birthTime: null },
], events: [], roles: {} };

test("le cache statistique dépend du dataset, du moteur, du modèle et du nombre de simulations", () => {
  const options = { simulationCount: 2_000, model: FAMILY_RARITY_MODELS.conditional };
  const key = familyRarityCacheKey(input, options);
  assert.match(key, /tao\.familyRarity\.v2/);
  assert.match(key, /2000$/);
  const storage = memoryStorage();
  const value = { version: FAMILY_RARITY_ENGINE_VERSION, engineVersion: familyConstellationEngineVersion, simulationCount: 2_000 };
  setCachedFamilyRarity(input, options, value, storage);
  assert.deepEqual(getCachedFamilyRarity(input, options, storage), value);
  assert.equal(clearFamilyRarityCache(storage), 1);
  assert.equal(getCachedFamilyRarity(input, options, storage), null);
});
