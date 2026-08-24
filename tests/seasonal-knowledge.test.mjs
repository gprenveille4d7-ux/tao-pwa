import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getSeasonCycle } from "../seasonal-balance.mjs";
import { JIE_QI, MOVEMENTS, MOVEMENT_KEYS, ORGAN_SYSTEMS, SEASON_MOVEMENT_INTERACTIONS, YIN_YANG_PAIRS } from "../seasonal-knowledge.mjs";

test("la source commune contient 5 Mouvements, 10 systèmes, 5 couples, 24 Jie Qi et 25 interactions", () => {
  assert.equal(MOVEMENT_KEYS.length, 5);
  assert.equal(Object.keys(MOVEMENTS).length, 5);
  assert.equal(Object.keys(ORGAN_SYSTEMS).length, 10);
  assert.equal(Object.keys(YIN_YANG_PAIRS).length, 5);
  assert.equal(JIE_QI.length, 24);
  assert.equal(Object.values(SEASON_MOVEMENT_INTERACTIONS).flatMap(Object.values).length, 25);
});

test("chaque fiche explique le pourquoi, la paire, la saison, le sens et la limite scientifique", () => {
  for (const system of Object.values(ORGAN_SYSTEMS)) {
    for (const field of ["whyMovement", "whySeason", "whyPair", "whySense", "science", "simple"]) assert.ok(system[field]?.length > 30, `${system.label}: ${field}`);
    assert.equal(ORGAN_SYSTEMS[system.pair].pair, Object.keys(ORGAN_SYSTEMS).find((key) => ORGAN_SYSTEMS[key] === system));
  }
});

test("les 25 interactions ont une nuance, un exemple et des renvois croisés", () => {
  for (const interaction of Object.values(SEASON_MOVEMENT_INTERACTIONS).flatMap(Object.values)) {
    assert.match(interaction.summary, /pas automatiquement|pas une garantie|sans épuiser|autant que|plutôt qu/i);
    assert.ok(interaction.example.length > 40);
    assert.ok(interaction.crossReferences.length >= 3);
  }
});

test("les intersaisons Terre occupent bien 18 jours avant chaque Li", () => {
  for (const date of ["2026-01-25", "2026-04-20", "2026-07-22", "2026-10-22"]) {
    const cycle = getSeasonCycle(Date.parse(`${date}T12:00:00Z`));
    assert.equal(cycle.movement, "earth", date);
    assert.equal(cycle.id, "transitions");
    assert.ok(cycle.daysRemaining <= 18 && cycle.daysRemaining >= 1);
  }
  assert.equal(getSeasonCycle(Date.parse("2026-08-24T20:00:00Z")).movement, "metal");
});

test("l’interface mobile expose la carte compacte, les 3 niveaux et des contrôles accessibles", async () => {
  const source = await readFile(new URL("../seasonal-library.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../tao-components.css", import.meta.url), "utf8");
  assert.match(html, /data-seasonal-pavilion/);
  for (const level of ["Je découvre", "Je comprends", "Mon thème"]) assert.match(source, new RegExp(level));
  assert.match(source, /aria-label/); assert.match(source, /role: "tablist"/); assert.match(source, /aria-selected/); assert.match(css, /@media \(max-width: 350px\)/);
});
