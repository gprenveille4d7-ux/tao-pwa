import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeFamilyConstellation } from "../family-number-engine.mjs";
import { buildFamilyConstellationReading } from "../family-constellation-semantic.mjs";
import { exactAgeDetailed, isoWeekNumber } from "../family-deep-engine.mjs";

const place = (id, city, country = "France") => ({ id, city, region: "", country, latitude: 49, longitude: -1, timezone: "Europe/Paris" });
const profiles = [
  { id: "g", firstName: "Guillaume", birthDate: "1985-09-11", birthTimeKnown: true, birthTime: "13:50", birthPlace: place("avranches", "Avranches") },
  { id: "l", firstName: "Lucile", birthDate: "1987-05-11", birthTimeKnown: true, birthTime: "14:08", birthPlace: place("granville", "Granville") },
  { id: "a", firstName: "Alice", birthDate: "2019-11-22", birthTimeKnown: true, birthTime: "02:38", birthPlace: place("caen", "Caen") },
  { id: "m", firstName: "Marcel", birthDate: "2023-11-09", birthTimeKnown: true, birthTime: "06:16", birthPlace: place("caen", "Caen") },
];
const roles = { g: "parent", l: "parent", a: "child", m: "child" };
const events = [{ id: "birth-a", title: "Naissance Alice", date: "2019-11-22", time: "02:38", place: "Caen", type: "birth", profileIds: ["g", "l", "a"] }];

test("les caractéristiques étendues restent factuelles et l’âge exact conserve années, mois et jours", () => {
  assert.deepEqual(exactAgeDetailed("1985-09-11", "2019-11-22"), { years: 34, months: 2, days: 11 });
  assert.equal(isoWeekNumber("2019-11-22"), 47);
  const analysis = analyzeFamilyConstellation({ profiles, roles, events });
  const alice = analysis.deepAnalysis.extendedSignatures.find(({ profileId }) => profileId === "a");
  assert.equal(alice.dayMonthSum, 33);
  assert.equal(alice.hourMinuteSum, 40);
  assert.equal(alice.minutesSinceMidnight, 158);
  assert.equal(alice.place.city, "Caen");
});

test("la famille de référence retrouve les structures humaines majeures sans règle nominale", () => {
  const analysis = analyzeFamilyConstellation({ profiles, roles, events });
  const types = new Set(analysis.displayObservations.map(({ type }) => type));
  assert.ok(types.has("CROSS_GENERATION_TRANSFER"));
  assert.ok(types.has("DATE_MIRROR"));
  assert.ok(types.has("ORDINAL_MIRROR"));
  assert.ok(types.has("SIBLING_MULTI_DOMAIN_ECHO"));
  assert.ok(types.has("MULTI_EVENT_AGE_ECHO"));
  assert.ok(types.has("INTERVAL_MATCHES_SIGNATURE"));
  assert.ok(types.has("SHARED_BIRTH_PLACE"));
  const siblings = analysis.displayObservations.find(({ type }) => type === "SIBLING_MULTI_DOMAIN_ECHO");
  assert.deepEqual(siblings.values, [18, 13, 31]);
  assert.equal(siblings.independentPathCount, 2, "31 dépend de 18 + 13 et ne compte pas comme troisième preuve");
  const eventEcho = analysis.displayObservations.find(({ type }) => type === "MULTI_EVENT_AGE_ECHO");
  assert.deepEqual(eventEcho.values, [34, 32]);
});

test("le graphe familial distingue personnes, événements, filiation, couple et fratrie", () => {
  const { familyGraph, evidenceGraph } = analyzeFamilyConstellation({ profiles, roles, events });
  assert.equal(familyGraph.nodes.filter(({ type }) => type === "PERSON").length, 4);
  assert.ok(familyGraph.edges.some(({ type }) => type === "PARTNER"));
  assert.equal(familyGraph.edges.filter(({ type }) => type === "PARENT_CHILD").length, 4);
  assert.ok(familyGraph.edges.some(({ type }) => type === "SIBLING"));
  assert.ok(familyGraph.edges.some(({ type }) => type === "PARTICIPATES_IN"));
  assert.ok(familyGraph.nodes.some(({ type }) => type === "PLACE"));
  assert.ok(familyGraph.edges.some(({ type }) => type === "BORN_AT"));
  assert.ok(evidenceGraph.nodes.some(({ type }) => type === "MOTIF"));
});

test("une relation parent-enfant n'est pas classée comme motif de fratrie", () => {
  const analysis = analyzeFamilyConstellation({
    profiles: profiles.slice(0, 2),
    events: [],
    roles: { g: "parent", l: "child" },
  });
  assert.equal(analysis.sections.siblings.length, 0);
  assert.ok(analysis.sections.parentChild.length > 0);
});

test("la synthèse de référence hiérarchise les structures et explique les dépendances", () => {
  const analysis = analyzeFamilyConstellation({ profiles, roles, events });
  const reading = buildFamilyConstellationReading({ analysis, profiles, events });
  assert.match(reading.headline, /motifs? ressort/i);
  assert.match(reading.overview, /circulent entre personnes, dates, heures et événements/i);
  assert.ok(reading.sections.siblings.some(({ description }) => /troisième preuve indépendante/i.test(description)));
  assert.ok(reading.sections.events.some(({ description }) => /âge/i.test(description)));
  assert.ok(reading.sections.places.some(({ description }) => /lieu de naissance/i.test(description)));
  assert.ok(reading.sections.generations.filter(({ title }) => /valeurs parentales/i.test(title)).every(({ description }) => /génération suivante/i.test(description)));
  assert.match(reading.disclaimer, /ne prouvent ni causalité, ni destin/i);
});

test("une variation réelle invalide automatiquement le motif horaire de fratrie", () => {
  const changed = profiles.map((profile) => profile.id === "a" ? { ...profile, birthTime: "02:39" } : profile);
  const analysis = analyzeFamilyConstellation({ profiles: changed, roles, events });
  assert.equal(analysis.displayObservations.some(({ type }) => type === "SIBLING_MULTI_DOMAIN_ECHO"), false);
});

test("le moteur profond ne contient aucune règle dépendant des noms ou nombres de la fixture", async () => {
  const source = await readFile(new URL("../family-deep-engine.mjs", import.meta.url), "utf8");
  for (const name of ["Guillaume", "Lucile", "Alice", "Marcel"]) assert.doesNotMatch(source, new RegExp(name, "i"));
  for (const number of [11, 13, 18, 22, 31, 34, 32]) {
    assert.doesNotMatch(source, new RegExp(`(?:value|target|number)\\s*={2,3}\\s*${number}\\b`, "i"));
  }
});
