import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFamilyDatasetHash,
  createSeededRandom,
  estimateFamilyRarity,
  exactDateMirrorFrequency,
  FAMILY_RARITY_MODELS,
  randomizeFamilyDataset,
  rarityCategory,
} from "../family-rarity-engine.mjs";

const profiles = [
  { id: "x1", firstName: "A", birthDate: "1978-03-04", birthTimeKnown: true, birthTime: "05:12" },
  { id: "x2", firstName: "B", birthDate: "1984-09-10", birthTimeKnown: true, birthTime: "11:18" },
  { id: "x3", firstName: "C", birthDate: "2011-06-17", birthTimeKnown: false, birthTime: null },
];
const input = { profiles, roles: { x1: "parent", x2: "parent", x3: "child" }, events: [] };

test("la randomisation familiale conserve années, structure et présence des heures", () => {
  const randomized = randomizeFamilyDataset(input, createSeededRandom(12345), FAMILY_RARITY_MODELS.conditional);
  assert.deepEqual(randomized.profiles.map(({ birthDate }) => birthDate.slice(0, 4)), profiles.map(({ birthDate }) => birthDate.slice(0, 4)));
  assert.deepEqual(randomized.profiles.map(({ birthTimeKnown }) => birthTimeKnown), profiles.map(({ birthTimeKnown }) => birthTimeKnown));
  assert.equal(randomized.profiles[2].birthTime, null);
});

test("la probabilité exacte d’un miroir calendaire tient compte des années bissextiles", () => {
  const ordinary = exactDateMirrorFrequency(2023, 2023);
  const leap = exactDateMirrorFrequency(2024, 2024);
  assert.ok(ordinary > 0 && ordinary < 0.01);
  assert.ok(leap > 0 && leap < 0.01);
  assert.notEqual(ordinary, leap);
});

test("une même seed produit exactement la même estimation Monte-Carlo", () => {
  const first = estimateFamilyRarity(input, { simulationCount: 100, seed: 90210 });
  const second = estimateFamilyRarity(input, { simulationCount: 100, seed: 90210 });
  assert.deepEqual(first, second);
  assert.equal(first.datasetHash, buildFamilyDatasetHash(input));
  assert.ok(first.global.estimatedRandomFrequency > 0 && first.global.estimatedRandomFrequency <= 1);
  assert.equal(first.methodology.lookElsewhereAdjusted, true);
});

test("les catégories de rareté respectent les seuils UX documentés", () => {
  assert.equal(rarityCategory(0.25), "COMMON");
  assert.equal(rarityCategory(0.15), "FAIRLY_COMMON");
  assert.equal(rarityCategory(0.05), "UNCOMMON");
  assert.equal(rarityCategory(0.02), "RARE");
  assert.equal(rarityCategory(0.005), "VERY_RARE");
});
