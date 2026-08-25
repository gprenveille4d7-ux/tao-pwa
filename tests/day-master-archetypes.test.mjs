import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { dayMasterArchetypes, getDayMasterArchetype, listDayMasterArchetypes, personalizeDayMasterArchetype } from "../day-master-archetypes.mjs";

const expected = Object.freeze({
  jia: ["甲", "wood", "yang", "Grand Arbre"], yi: ["乙", "wood", "yin", "Plante souple"],
  bing: ["丙", "fire", "yang", "Soleil"], ding: ["丁", "fire", "yin", "Flamme"],
  wu: ["戊", "earth", "yang", "Montagne"], ji: ["己", "earth", "yin", "Terre fertile"],
  geng: ["庚", "metal", "yang", "Métal forgé"], xin: ["辛", "metal", "yin", "Métal précieux"],
  ren: ["壬", "water", "yang", "Grand Fleuve"], gui: ["癸", "water", "yin", "Pluie fine"],
});

test("les dix Troncs correspondent à dix archétypes français distincts", () => {
  assert.equal(listDayMasterArchetypes().length, 10);
  const taglines = new Set();
  for (const [key, [hanzi, element, polarity, name]] of Object.entries(expected)) {
    const item = getDayMasterArchetype(key);
    assert.ok(item, `${key} doit exister`);
    assert.equal(item.hanzi, hanzi);
    assert.equal(item.element, element);
    assert.equal(item.polarity, polarity);
    assert.match(item.name, new RegExp(name));
    assert.doesNotMatch(JSON.stringify(item), /\b(Day Master|Heavenly Stem|Yin Fire|Yang Fire)\b/);
    taglines.add(item.tagline);
  }
  assert.equal(taglines.size, 10);
});

test("chaque fiche possède toutes les couches pédagogiques demandées", () => {
  const prose = ["tagline", "naturalPhenomenon", "coreDynamic", "thinkingStyle", "emotionalStyle", "workStyle", "conflictStyle", "needs", "imbalanceFactors"];
  const lists = ["balancedTraits", "stressPatterns", "strengths", "excesses", "growthAxes"];
  for (const item of Object.values(dayMasterArchetypes)) {
    prose.forEach((key) => assert.ok(item[key].length > 60 || key === "tagline", `${item.id}.${key}`));
    lists.forEach((key) => assert.ok(item[key].length >= (key === "growthAxes" ? 3 : 5), `${item.id}.${key}`));
    assert.deepEqual(Object.keys(item.relationships), ["couple", "friendship", "parentChild", "family"]);
    assert.equal(Object.keys(item.dimensions).length, 5);
    assert.ok(item.comparison.question.startsWith("Pourquoi"));
    assert.notEqual(item.comparison.peer, item.id);
  }
});

function theme(strongest, quietest, yin = 4, yang = 4, birthTimeKnown = true) {
  const counts = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  counts[strongest] = 4;
  counts[quietest] = 0;
  return {
    dayMaster: { key: "ding" },
    elements: Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, { key, count }])),
    yinYang: { yin, yang },
    pillars: { year: { determined: true }, month: { determined: true }, day: { determined: true }, hour: { determined: birthTimeKnown } },
    metadata: { birthTimeKnown },
  };
}

test("un même Maître du Jour reçoit une expression différente selon le thème calculé", () => {
  const fire = personalizeDayMasterArchetype(theme("fire", "water", 2, 6));
  const water = personalizeDayMasterArchetype(theme("water", "fire", 6, 2, false));
  assert.notEqual(fire.summary, water.summary);
  assert.notEqual(fire.balance, water.balance);
  assert.match(fire.observation, /丁 Ding · Feu Yin/);
  assert.match(water.confidence, /heure de naissance n’est pas connue/);
});

test("l’interface présente les chapitres, la preuve et les garde-fous sur mobile", () => {
  const view = fs.readFileSync(new URL("../bazi-theme.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../tao-components.css", import.meta.url), "utf8");
  for (const label of ["Comprendre le symbole", "Votre fonctionnement", "Relations proches", "Travail et conflit", "Votre expression personnelle", "Pourquoi TAO me dit ça ?", "Comprendre les autres archétypes"]) assert.match(view, new RegExp(label.replace(/[?]/g, "\\?")));
  assert.match(view, /pas d’un profil psychologique scientifique/);
  assert.match(css, /@media \(max-width: 21rem\)/);
  assert.match(css, /safe-area|archetype-chapter/);
  assert.match(css, /:active \{ transform: scale\(\.985\)/);
});
