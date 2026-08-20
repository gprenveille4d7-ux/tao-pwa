import test from "node:test";
import assert from "node:assert/strict";
import { calculateBazi } from "../bazi-engine.mjs";
import {
  compareBaziProfiles,
  normalizeRelationshipGoal,
  RELATIONSHIP_GOALS,
} from "../relationship-engine.mjs";
import { buildRelationshipSemanticReading } from "../relationship-semantic.mjs";
import {
  clearRelationshipReadingCache,
  getCachedRelationshipReading,
  getRelationshipReadingCacheSize,
  setCachedRelationshipReading,
} from "../relationship-cache.mjs";

function profile({ id, firstName, birthDate, birthTime, city, latitude, longitude }) {
  return {
    id,
    firstName,
    relationship: id === "guillaume" ? "self" : "partner",
    birthDate,
    birthTime,
    birthTimeKnown: true,
    birthPlace: { id: `place-${id}`, city, country: "France", latitude, longitude, timezone: "Europe/Paris" },
  };
}

const guillaume = profile({ id: "guillaume", firstName: "Guillaume", birthDate: "1985-09-11", birthTime: "13:50", city: "Avranches", latitude: 48.6844, longitude: -1.3569 });
const lucile = profile({ id: "lucile", firstName: "Lucile", birthDate: "1987-05-11", birthTime: "14:08", city: "Argenteuil", latitude: 48.9472, longitude: 2.2467 });
const themes = { leftTheme: calculateBazi(guillaume), rightTheme: calculateBazi(lucile) };

function comparison(relationshipGoal) {
  return compareBaziProfiles({
    leftProfile: guillaume,
    rightProfile: lucile,
    ...themes,
    relationshipType: "couple",
    relationshipGoal,
  });
}

function reading(relationshipGoal) {
  return buildRelationshipSemanticReading({ comparison: comparison(relationshipGoal), leftProfile: guillaume, rightProfile: lucile });
}

function words(value) {
  return new Set(JSON.stringify(value).toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? []);
}

function similarity(left, right) {
  const a = words(left);
  const b = words(right);
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.max(1, new Set([...a, ...b]).size);
}

test("les cinq objectifs canoniques traversent le pipeline jusqu’au rendu et aux faits IA", () => {
  assert.deepEqual(RELATIONSHIP_GOALS, ["overview", "differences", "communication", "difficult_period", "cooperation"]);
  for (const goal of RELATIONSHIP_GOALS) {
    const result = comparison(goal);
    const semantic = reading(goal);
    assert.equal(result.relationshipGoal, goal);
    assert.equal(result.facts.find(({ type }) => type === "RELATIONSHIP_GOAL")?.value, goal);
    assert.equal(semantic.relationshipGoal, goal);
    assert.match(semantic.aiPrompt, new RegExp(goal === "difficult_period" ? "période difficile" : semantic.goalLabel.split(" ").slice(-1)[0], "i"));
  }
  assert.equal(normalizeRelationshipGoal("general"), "overview");
  assert.equal(normalizeRelationshipGoal("better_together"), "cooperation");
});

test("les faits BaZi stables restent strictement identiques pour les cinq objectifs", () => {
  const snapshots = RELATIONSHIP_GOALS.map((goal) => comparison(goal).stableFacts.map(({ id, type, value, label, dimensions, role }) => ({ id, type, value, label, dimensions, role })));
  snapshots.slice(1).forEach((snapshot) => assert.deepEqual(snapshot, snapshots[0]));
});

test("la hiérarchisation change réellement selon l’objectif sans changer les faits", () => {
  const ranked = RELATIONSHIP_GOALS.map((goal) => comparison(goal).priorityFacts.slice(0, 8).map(({ id, priorityScore }) => `${id}:${priorityScore}`).join("|"));
  assert.equal(new Set(ranked).size, RELATIONSHIP_GOALS.length);
});

test("les cinq lectures répondent à cinq questions reconnaissables", () => {
  const readings = RELATIONSHIP_GOALS.map(reading);
  const fingerprints = readings.map(({ summary, sections, conclusion }) => JSON.stringify({ summary, sectionTitles: sections.map(({ title }) => title), conclusion }));
  assert.equal(new Set(fingerprints).size, RELATIONSHIP_GOALS.length);
  for (let left = 0; left < readings.length; left += 1) {
    for (let right = left + 1; right < readings.length; right += 1) {
      assert.ok(similarity(readings[left].sections, readings[right].sections) < 0.82, `${RELATIONSHIP_GOALS[left]} et ${RELATIONSHIP_GOALS[right]} restent trop proches`);
    }
  }
});

test("la clé et le cache distinguent communication et période difficile", () => {
  clearRelationshipReadingCache();
  const communication = comparison("communication");
  const difficult = comparison("difficult_period");
  assert.notEqual(communication.analysisKey, difficult.analysisKey);
  setCachedRelationshipReading(communication.analysisKey, reading("communication"));
  setCachedRelationshipReading(difficult.analysisKey, reading("difficult_period"));
  assert.equal(getRelationshipReadingCacheSize(), 2);
  assert.equal(getCachedRelationshipReading(communication.analysisKey).relationshipGoal, "communication");
  assert.equal(getCachedRelationshipReading(difficult.analysisKey).relationshipGoal, "difficult_period");
});

test("un changement rapide d’objectif ne peut pas rendre une lecture sous la mauvaise clé", () => {
  clearRelationshipReadingCache();
  const sequence = ["communication", "difficult_period", "overview", "cooperation"];
  for (const goal of sequence) {
    const result = comparison(goal);
    setCachedRelationshipReading(result.analysisKey, reading(goal));
    assert.equal(getCachedRelationshipReading(result.analysisKey).relationshipGoal, goal);
  }
  assert.equal(getRelationshipReadingCacheSize(), sequence.length);
});

test("la lecture déterministe reste complète lorsque Gemini est indisponible", () => {
  const result = reading("communication");
  assert.ok(result.sections.length >= 4);
  assert.ok(result.sections.every(({ values }) => values.length > 0));
  assert.match(result.conclusion, /désaccord|reformulez/i);
});
