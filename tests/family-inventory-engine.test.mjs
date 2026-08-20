import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFamilyConstellation } from "../family-number-engine.mjs";
import { deduplicateOccurrences, deduplicateRelatedFeatures } from "../family-inventory-engine.mjs";
import { buildFamilyConstellationReading, familyObservationFacts } from "../family-constellation-semantic.mjs";

const place = (id, city) => ({ id, city, region: "", country: "France", latitude: 49, longitude: -1, timezone: "Europe/Paris" });
const golden = [
  { id: "a", firstName: "Guillaume", birthDate: "1985-09-11", birthTimeKnown: true, birthTime: "13:50", birthPlace: place("avranches", "Avranches") },
  { id: "b", firstName: "Lucile", birthDate: "1987-05-11", birthTimeKnown: true, birthTime: "14:08", birthPlace: place("argenteuil", "Argenteuil") },
  { id: "c", firstName: "Alice", birthDate: "2019-11-22", birthTimeKnown: true, birthTime: "02:38", birthPlace: place("caen", "Caen") },
  { id: "d", firstName: "Marcel", birthDate: "2023-11-09", birthTimeKnown: true, birthTime: "06:16", birthPlace: place("caen", "Caen") },
];
const roles = { a: "parent", b: "parent", c: "child", d: "child" };

test("une occurrence exacte n’est conservée qu’une fois", () => {
  const occurrence = { personId: "p1", personName: "A", sourceType: "birthDay", sourceLabel: "Jour", sourceValue: 11 };
  assert.equal(deduplicateOccurrences([occurrence, { ...occurrence }]).length, 1);
});

test("deux formulations sémantiquement équivalentes deviennent une seule particularité", () => {
  const base = { participantIds: ["a", "b"], values: [11], interestScore: 70 };
  const result = deduplicateRelatedFeatures([
    { ...base, id: "x", type: "SHARED_VALUE" },
    { ...base, id: "y", type: "MULTI_PERSON_CLUSTER", interestScore: 90 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "y");
});

test("le 11 familial est un seul motif canonique avec quatre occurrences", () => {
  const analysis = analyzeFamilyConstellation({ profiles: golden, roles });
  const matches = analysis.patternInventory.patterns.filter(({ canonicalPatternId }) => canonicalPatternId === "number:11");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].occurrenceCount, 4);
  assert.equal(matches[0].personCount, 4);
  assert.equal(matches[0].generationCount, 2);
  assert.deepEqual(new Set(matches[0].occurrences.map(({ sourceType }) => sourceType)), new Set(["birthDay", "birthMonth"]));
});

test("la fixture complète devient huit motifs sans carte redondante", () => {
  const inventory = analyzeFamilyConstellation({ profiles: golden, roles }).patternInventory;
  assert.equal(inventory.total, 8);
  assert.deepEqual(inventory.importance, { major: 3, notable: 5, curiosity: 0 });
});

test("les totaux dépendants des enfants restent dans un seul motif de signature", () => {
  const analysis = analyzeFamilyConstellation({ profiles: golden, roles });
  const signature = analysis.patternInventory.patterns.find(({ canonicalPatternId }) => canonicalPatternId === "signature:c:d");
  assert.ok(signature);
  assert.deepEqual([...signature.values].sort((a, b) => a - b), [13, 18, 31]);
  assert.equal(analysis.patternInventory.patterns.filter(({ canonicalPatternId }) => ["number:18", "number:31"].includes(canonicalPatternId)).length, 0);
});

test("les âges de plusieurs parents au même événement forment un seul motif", () => {
  const events = [{ id: "birth-c", title: "Naissance Alice", date: "2019-11-22", type: "birth", profileIds: ["a", "b", "c"] }];
  const inventory = analyzeFamilyConstellation({ profiles: golden, roles, events }).patternInventory;
  const agePatterns = inventory.patterns.filter(({ canonicalPatternId }) => canonicalPatternId === "event:birth-c:age");
  assert.equal(agePatterns.length, 1);
  assert.ok(agePatterns[0].relatedFeatures.some(({ type }) => type === "MULTI_EVENT_AGE_ECHO"));
});

test("l’inventaire et les faits IA partagent exactement les mêmes identités canoniques", () => {
  const analysis = analyzeFamilyConstellation({ profiles: golden, roles });
  const reading = buildFamilyConstellationReading({ analysis, profiles: golden });
  const ids = reading.cards.map(({ canonicalPatternId }) => canonicalPatternId);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(familyObservationFacts(analysis).map(({ canonicalPatternId }) => canonicalPatternId), ids);
  assert.equal(reading.cards.filter(({ canonicalPatternId }) => canonicalPatternId === "number:11").length, 1);
  assert.equal((reading.synthesis.match(/11/g) ?? []).length, 1);
  assert.equal(familyObservationFacts(analysis).find(({ canonicalPatternId }) => canonicalPatternId === "number:11").occurrences.length, 4);
});

test("les niveaux sont ordonnés majeur, notable, curiosité", () => {
  const analysis = analyzeFamilyConstellation({ profiles: golden, roles });
  const ranks = { major: 0, notable: 1, curiosity: 2 };
  const values = analysis.patternInventory.patterns.map(({ importance }) => ranks[importance]);
  assert.deepEqual(values, [...values].sort((a, b) => a - b));
});

test("une famille sans motif fort reste sobre", () => {
  const profiles = [
    { id: "p1", firstName: "A", birthDate: "1971-02-03", birthTimeKnown: false, birthTime: null },
    { id: "p2", firstName: "B", birthDate: "1998-07-19", birthTimeKnown: false, birthTime: null },
  ];
  const analysis = analyzeFamilyConstellation({ profiles });
  assert.equal(analysis.patternInventory.importance.major, 0);
  assert.ok(analysis.patternInventory.total <= 4);
});

test("les familles de 2, 4, 6 et 10 personnes restent dédupliquées", () => {
  const pool = Array.from({ length: 10 }, (_, index) => ({
    id: `p${index + 1}`,
    firstName: `P${index + 1}`,
    birthDate: `${1970 + index * 3}-${String((index * 5) % 12 + 1).padStart(2, "0")}-${String((index * 7) % 27 + 1).padStart(2, "0")}`,
    birthTimeKnown: index % 2 === 0,
    birthTime: index % 2 === 0 ? `${String((index * 3) % 24).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}` : null,
  }));
  for (const size of [2, 4, 6, 10]) {
    const inventory = analyzeFamilyConstellation({ profiles: pool.slice(0, size) }).patternInventory;
    assert.equal(inventory.patterns.length, new Set(inventory.patterns.map(({ canonicalPatternId }) => canonicalPatternId)).size);
    for (const pattern of inventory.patterns) assert.equal(pattern.occurrences.length, new Set(pattern.occurrences.map(({ personId, sourceType, sourceValue }) => `${personId}|${sourceType}|${sourceValue}`)).size);
  }
});
