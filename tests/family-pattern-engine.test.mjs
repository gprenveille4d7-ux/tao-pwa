import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeFamilyConstellation } from "../family-number-engine.mjs";
import { buildNumericGraph, discoverDeepPatterns } from "../family-pattern-engine.mjs";

const profile = (id, birthDate, birthTime = null) => ({
  id,
  firstName: `Personne ${id}`,
  birthDate,
  birthTimeKnown: birthTime !== null,
  birthTime,
});

test("le graphe découvre un écart répété sans connaître sa valeur à l’avance", () => {
  const profiles = [
    profile("u1", "2000-02-05", "00:00"),
    profile("u2", "2006-08-11", "00:06"),
  ];
  const analysis = analyzeFamilyConstellation({ profiles });
  const repeated = analysis.discoveredPatterns.find(({ type, values }) => type === "REPEATED_DIFFERENCE" && values[0] === 6);
  assert.ok(repeated);
  assert.ok(repeated.independentPathCount >= 3);
  assert.ok(repeated.sourceDiversity >= 2);
  assert.ok(repeated.calculations.some((value) => value.includes("year")));
  assert.ok(repeated.calculations.some((value) => value.includes("timeDigitSum")));
});

test("les nœuds issus du même arbre de dérivation ne deviennent pas des chemins indépendants", () => {
  const signatures = analyzeFamilyConstellation({ profiles: [profile("d1", "1999-01-01"), profile("d2", "2001-02-02")] }).signatures;
  const graph = buildNumericGraph({ signatures });
  const patterns = discoverDeepPatterns({ graph });
  for (const pattern of patterns) {
    assert.equal(new Set(pattern.independentPaths).size, pattern.independentPathCount);
    assert.equal(new Set(pattern.dependencyGroups).size, pattern.dependencyGroups.length);
  }
});

test("le moteur accepte plus de six membres sans tronquer l’analyse", () => {
  const profiles = Array.from({ length: 9 }, (_, index) => profile(`p${index}`, `${1970 + index * 4}-${String((index % 12) + 1).padStart(2, "0")}-${String((index * 3) % 27 + 1).padStart(2, "0")}`));
  const analysis = analyzeFamilyConstellation({ profiles });
  assert.equal(analysis.signatures.length, 9);
  assert.equal(analysis.numericGraph.nodes.filter(({ kind }) => kind === "day").length, 9);
});

test("des centaines de familles générées ne produisent ni crash ni NaN", () => {
  let state = 0x51f15e;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  for (let familyIndex = 0; familyIndex < 220; familyIndex += 1) {
    const size = 2 + Math.floor(random() * 7);
    const profiles = Array.from({ length: size }, (_, profileIndex) => {
      const year = 1940 + Math.floor(random() * 80);
      const month = 1 + Math.floor(random() * 12);
      const day = 1 + Math.floor(random() * 27);
      const withTime = random() > 0.35;
      const time = withTime ? `${String(Math.floor(random() * 24)).padStart(2, "0")}:${String(Math.floor(random() * 60)).padStart(2, "0")}` : null;
      return profile(`f${familyIndex}p${profileIndex}`, `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, time);
    });
    const analysis = analyzeFamilyConstellation({ profiles });
    assert.ok(Number.isFinite(analysis.density.rawDensity));
    assert.ok(analysis.displayObservations.every(({ interestScore, values }) => Number.isFinite(interestScore) && values.every(Number.isFinite)));
  }
});

test("aucune règle de production ne compare une valeur aux nombres des fixtures", async () => {
  const source = `${await readFile(new URL("../family-number-engine.mjs", import.meta.url), "utf8")}\n${await readFile(new URL("../family-pattern-engine.mjs", import.meta.url), "utf8")}`;
  for (const number of [11, 13, 18, 22, 31, 33]) {
    assert.doesNotMatch(source, new RegExp(`(?:value|target|number)\\s*={2,3}\\s*${number}\\b`, "i"));
    assert.doesNotMatch(source, new RegExp(`(?:includes|has)\\(\\s*${number}\\s*\\)`, "i"));
  }
});
