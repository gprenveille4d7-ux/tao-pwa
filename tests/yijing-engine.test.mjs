import test from "node:test";
import assert from "node:assert/strict";
import { HEXAGRAMS, HEXAGRAM_BY_SIGNATURE, TRIGRAMS } from "../yijing-data.mjs";
import { castThreeCoins, createCasting, interpretLineValue, resolveCasting } from "../yijing-engine.mjs";
import { createYijingGuidance } from "../yijing-guidance.mjs";

test("les 8 trigrammes, 64 hexagrammes et 384 lignes sont couverts", () => {
  assert.equal(Object.keys(TRIGRAMS).length, 8);
  assert.equal(HEXAGRAMS.length, 64);
  assert.equal(HEXAGRAM_BY_SIGNATURE.size, 64);
  assert.equal(HEXAGRAMS.reduce((total, hexagram) => total + hexagram.lineReadings.length, 0), 384);
  for (const hexagram of HEXAGRAMS) {
    assert.equal(hexagram.lines.length, 6);
    assert.ok(hexagram.french && hexagram.hanzi && hexagram.pinyin && hexagram.summary && hexagram.reflection);
    assert.ok(hexagram.lineReadings.every(({ text }) => text.length > 80));
  }
});

test("6, 7, 8 et 9 conservent la convention traditionnelle", () => {
  assert.deepEqual(interpretLineValue(6), { value: 6, polarity: "yin", changing: true, label: "Yin mutant", transformed: 1, binary: 0 });
  assert.deepEqual(interpretLineValue(7), { value: 7, polarity: "yang", changing: false, label: "Yang stable", transformed: 1, binary: 1 });
  assert.deepEqual(interpretLineValue(8), { value: 8, polarity: "yin", changing: false, label: "Yin stable", transformed: 0, binary: 0 });
  assert.deepEqual(interpretLineValue(9), { value: 9, polarity: "yang", changing: true, label: "Yang mutant", transformed: 0, binary: 1 });
});

test("les trois pièces produisent les quatre sommes possibles", () => {
  assert.equal(castThreeCoins(() => 0.1).value, 6);
  assert.equal(castThreeCoins(() => 0.9).value, 9);
  const values = [0.9, 0.1, 0.1]; let index = 0;
  assert.equal(castThreeCoins(() => values[index++]).value, 7);
  const valuesEight = [0.9, 0.9, 0.1]; index = 0;
  assert.equal(castThreeCoins(() => valuesEight[index++]).value, 8);
  assert.equal(createCasting(() => 0.1).length, 6);
});

test("la première ligne est bien la ligne du bas", () => {
  const result = resolveCasting([7, 8, 8, 8, 7, 8]);
  assert.equal(result.primary.number, 3);
  assert.deepEqual(result.primary.lines, [1, 0, 0, 0, 1, 0]);
});

test("aucune mutation ne produit pas de second hexagramme", () => {
  const yang = resolveCasting([7, 7, 7, 7, 7, 7]);
  const yin = resolveCasting([8, 8, 8, 8, 8, 8]);
  assert.equal(yang.primary.number, 1);
  assert.equal(yin.primary.number, 2);
  assert.equal(yang.transformed, null);
  assert.deepEqual(yang.changingLines, []);
});

test("une, plusieurs et six mutations transforment seulement les traits concernés", () => {
  const one = resolveCasting([9, 7, 7, 7, 7, 7]);
  assert.deepEqual(one.changingLines, [1]);
  assert.deepEqual(one.transformed.lines, [0, 1, 1, 1, 1, 1]);
  const many = resolveCasting([6, 7, 9, 8, 6, 7]);
  assert.deepEqual(many.changingLines, [1, 3, 5]);
  const six = resolveCasting([9, 9, 9, 9, 9, 9]);
  assert.equal(six.primary.number, 1);
  assert.equal(six.transformed.number, 2);
  assert.deepEqual(six.changingLines, [1, 2, 3, 4, 5, 6]);
});

test("la guidance contient tous les niveaux demandés", () => {
  const result = resolveCasting([6, 7, 8, 9, 7, 8]);
  const guidance = createYijingGuidance({ question: "Comment aborder cette situation ?", result, profileContext: { dayMaster: { element: "wood", label: "Bois Yang" } } });
  assert.ok(guidance.essential.length >= 2);
  assert.ok(guidance.movement);
  assert.ok(guidance.supports.length >= 2);
  assert.ok(guidance.cautions.length >= 2);
  assert.ok(guidance.actions.length >= 2);
  assert.ok(guidance.reflection && guidance.rhythm && guidance.profile);
  assert.equal(guidance.lineReadings.length, 2);
});

