import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeFamilyConstellation,
  clusterObservations,
  dateInterval,
  dayOfYear,
  detectCrossGeneration,
  detectDateMirror,
  detectSharedValue,
  detectSimpleDifference,
  detectSimpleSum,
  exactAgeAtDate,
  isPalindrome,
  reverseDigits,
  scoreObservation,
  sumDateDigits,
  sumTimeDigits,
  timeDifference,
} from "../family-number-engine.mjs";

const people = [
  { id: "a", firstName: "Guillaume", birthDate: "1985-09-11", birthTimeKnown: true, birthTime: "13:50" },
  { id: "b", firstName: "Lucile", birthDate: "1987-05-11", birthTimeKnown: true, birthTime: "14:08" },
  { id: "c", firstName: "Alice", birthDate: "2019-11-22", birthTimeKnown: true, birthTime: "02:38" },
  { id: "d", firstName: "Marcel", birthDate: "2023-11-09", birthTimeKnown: true, birthTime: "06:16" },
];

test("les signatures numériques conservent valeurs brutes et réductions", () => {
  assert.equal(sumDateDigits("2019-11-22"), 18);
  assert.equal(sumTimeDigits("02:38"), 13);
  assert.equal(reverseDigits(13), 31);
  assert.equal(isPalindrome(131), true);
  assert.equal(dayOfYear("1987-05-11"), 131);
  assert.equal(dayOfYear("2023-11-09"), 313);
});

test("les calculs calendaires et horaires restent exacts", () => {
  assert.equal(exactAgeAtDate("1985-09-11", "2019-11-22"), 34);
  assert.equal(exactAgeAtDate("1985-09-11", "2019-09-10"), 33);
  assert.deepEqual(dateInterval("2019-01-31", "2020-03-01"), { years: 1, months: 1, days: 1, totalDays: 395 });
  assert.equal(timeDifference("13:50", "14:08"), 18);
});

test("les détecteurs élémentaires sont fermés et déterministes", () => {
  const analysis = analyzeFamilyConstellation({ profiles: people, roles: { a: "parent", b: "parent", c: "child", d: "child" } });
  const [a, b, c, d] = analysis.signatures;
  assert.equal(detectDateMirror(a, d), true);
  assert.equal(detectSimpleSum(c.day, d.day, 31), true);
  assert.equal(detectSimpleDifference(c.day, d.day, 13), true);
  assert.ok(detectSharedValue([c, d], "dateDigitSum").length === 1);
  assert.ok(detectCrossGeneration([a, b, c, d], { a: "parent", b: "parent", c: "child", d: "child" }).length === 1);
});

test("le fixture familial produit les huit motifs attendus", () => {
  const events = [{ id: "birth-c", title: "Naissance Alice", date: "2019-11-22", time: null, type: "birth", profileIds: ["a", "c"] }];
  const analysis = analyzeFamilyConstellation({ profiles: people, events, roles: { a: "parent", b: "parent", c: "child", d: "child" } });
  const types = new Set(analysis.selectedObservations.map(({ type }) => type));
  assert.ok(types.has("DATE_MIRROR"));
  assert.ok(types.has("CROSS_GENERATION_VALUE"));
  assert.ok(types.has("MULTI_SIGNATURE_MATCH"));
  assert.ok(types.has("SIMPLE_ARITHMETIC"));
  assert.ok(types.has("INTERVAL_MATCHES_SIGNATURE"));
  assert.ok(types.has("PALINDROME_VALUE"));
  assert.ok(types.has("SIMPLE_MULTIPLE"));
  assert.equal(analysis.intervals.length, 6);
  assert.ok(types.has("EVENT_AGE_MATCH"));
  const trio = analysis.selectedObservations.find(({ type }) => type === "MULTI_SIGNATURE_MATCH");
  assert.deepEqual(trio.values, [18, 13, 31]);
  assert.ok(analysis.clusters.some(({ observations }) => observations.length > 1));
});

test("le scoring favorise les faits directs et pénalise les transformations", () => {
  assert.ok(scoreObservation({ type: "DATE_MIRROR", participantIds: ["a", "b"], transformations: 0 }) > scoreObservation({ type: "SIMPLE_MULTIPLE", participantIds: ["a", "b"], transformations: 2 }));
  assert.equal(clusterObservations([]).length, 0);
});

test("une même famille produit exactement les mêmes observations", () => {
  const input = { profiles: people, roles: { a: "parent", b: "parent", c: "child", d: "child" } };
  assert.deepEqual(analyzeFamilyConstellation(input), analyzeFamilyConstellation(input));
});

test("une famille sans motif fort ne reçoit pas artificiellement des dizaines de grandes correspondances", () => {
  const randomFamily = [
    { id: "r1", firstName: "A", birthDate: "1974-02-03", birthTimeKnown: false, birthTime: null },
    { id: "r2", firstName: "B", birthDate: "1981-07-16", birthTimeKnown: false, birthTime: null },
    { id: "r3", firstName: "C", birthDate: "2008-12-27", birthTimeKnown: false, birthTime: null },
    { id: "r4", firstName: "D", birthDate: "2014-04-08", birthTimeKnown: false, birthTime: null },
  ];
  const analysis = analyzeFamilyConstellation({ profiles: randomFamily });
  assert.ok(analysis.summary.strong <= 5);
  assert.ok(analysis.selectedObservations.length <= 24);
});
