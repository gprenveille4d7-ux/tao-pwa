import test from "node:test";
import assert from "node:assert/strict";
import { compareBaziProfiles, crossBranchRelations, elementRelation } from "../relationship-engine.mjs";
import { buildRelationshipSemanticReading } from "../relationship-semantic.mjs";

const stem = (key, name, chinese, element, polarity) => ({ key, name, chinese, element, polarity });
const branch = (key, name, chinese) => ({ key, name, chinese });
const elementSnapshot = (dominant) => Object.fromEntries(["wood", "fire", "earth", "metal", "water"].map((key) => [key, { ratio: key === dominant ? 0.5 : 0.125 }]));
const profile = (id, firstName) => ({ id, firstName, birthDate: "1985-09-11", birthTime: "14:32", birthPlace: { city: "Paris" } });

function theme(dayMaster, dayBranch, extra = {}) {
  return {
    dayMaster,
    elements: elementSnapshot(dayMaster.element),
    pillars: {
      year: { determined: true, stem: dayMaster, branch: extra.yearBranch ?? branch("chen", "Chen", "辰") },
      month: { determined: true, stem: dayMaster, branch: extra.monthBranch ?? branch("mao", "Mao", "卯") },
      day: { determined: true, stem: dayMaster, branch: dayBranch },
      hour: extra.unknownHour ? { determined: false } : { determined: true, stem: dayMaster, branch: extra.hourBranch ?? branch("hai", "Hai", "亥") },
    },
  };
}

const alice = profile("profile-a", "Alice");
const marcel = profile("profile-b", "Marcel");
const jia = stem("jia", "Jia", "甲", "wood", "yang");
const ji = stem("ji", "Ji", "己", "earth", "yin");

test("la relation élémentaire reste déterministe et directionnelle", () => {
  assert.equal(elementRelation("wood", "fire"), "left_generates_right");
  assert.equal(elementRelation("earth", "wood"), "right_controls_left");
  assert.equal(elementRelation("water", "water"), "same");
});

test("les deux sens de lecture des Dix Dieux restent distincts", () => {
  const comparison = compareBaziProfiles({
    leftProfile: alice,
    rightProfile: marcel,
    leftTheme: theme(jia, branch("zi", "Zi", "子")),
    rightTheme: theme(ji, branch("wu", "Wu", "午"), { unknownHour: true }),
    relationshipType: "friendship",
    focus: "communication",
  });
  assert.equal(comparison.tenGods.leftToRight, "direct_wealth");
  assert.equal(comparison.tenGods.rightToLeft, "direct_officer");
  assert.notEqual(comparison.tenGods.leftToRight, comparison.tenGods.rightToLeft);
});

test("une opposition croisée des Branches du Jour est identifiée sans verdict", () => {
  const interactions = crossBranchRelations(
    theme(jia, branch("zi", "Zi", "子"), { unknownHour: true }),
    theme(ji, branch("wu", "Wu", "午"), { unknownHour: true }),
  );
  const dayClash = interactions.find(({ type, relationalFocus }) => type === "clash" && relationalFocus);
  assert.ok(dayClash);
  assert.equal(dayClash.left.pillarId, "day");
  assert.equal(dayClash.right.pillarId, "day");
});

test("la lecture française ne contient aucun score numérique de compatibilité", () => {
  const comparison = compareBaziProfiles({
    leftProfile: alice,
    rightProfile: marcel,
    leftTheme: theme(jia, branch("zi", "Zi", "子")),
    rightTheme: theme(ji, branch("wu", "Wu", "午"), { unknownHour: true }),
    relationshipType: "couple",
    focus: "general",
  });
  const reading = buildRelationshipSemanticReading({ comparison, leftProfile: alice, rightProfile: marcel });
  assert.equal(reading.axes.length, 5);
  assert.ok(reading.axes.every(({ levelLabel }) => typeof levelLabel === "string"));
  assert.doesNotMatch(JSON.stringify(reading), /\b\d{1,3}\s*%|score|sur 100/i);
  assert.doesNotMatch(reading.summary, /de Alice/i);
  assert.match(reading.disclaimer, /ne mesure ni la valeur/i);
});

test("le contexte choisi modifie les conseils sans inventer de cycle", () => {
  const base = {
    leftProfile: alice,
    rightProfile: marcel,
    leftTheme: theme(jia, branch("zi", "Zi", "子")),
    rightTheme: theme(ji, branch("wu", "Wu", "午"), { unknownHour: true }),
    focus: "better_together",
  };
  const couple = buildRelationshipSemanticReading({ comparison: compareBaziProfiles({ ...base, relationshipType: "couple" }), leftProfile: alice, rightProfile: marcel });
  const work = buildRelationshipSemanticReading({ comparison: compareBaziProfiles({ ...base, relationshipType: "work" }), leftProfile: alice, rightProfile: marcel });
  assert.notDeepEqual(couple.recommendations, work.recommendations);
  assert.match(couple.cyclesNote, /ne sont pas inclus/i);
});

test("les faits destinés à TAO sont minimisés", () => {
  const comparison = compareBaziProfiles({
    leftProfile: alice,
    rightProfile: marcel,
    leftTheme: theme(jia, branch("zi", "Zi", "子")),
    rightTheme: theme(ji, branch("wu", "Wu", "午")),
  });
  const payload = JSON.stringify(comparison.facts);
  assert.doesNotMatch(payload, /1985|birthDate|birthTime|Paris|latitude|longitude/i);
  assert.ok(comparison.facts.every(({ id, type }) => id && type));
});

test("un profil ne peut pas être comparé avec lui-même", () => {
  assert.throws(() => compareBaziProfiles({
    leftProfile: alice,
    rightProfile: alice,
    leftTheme: theme(jia, branch("zi", "Zi", "子")),
    rightTheme: theme(jia, branch("zi", "Zi", "子")),
  }), /deux profils distincts/i);
});
