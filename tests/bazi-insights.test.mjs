import test from "node:test";
import assert from "node:assert/strict";
import { branchRelations, tenGodFor, visibleTenGods } from "../bazi-insights.mjs";

test("les Dix Dieux sont déterminés relativement au Maître du Jour", () => {
  const master = { element: "wood", polarity: "yang" };
  assert.equal(tenGodFor(master, { element: "wood", polarity: "yang" }), "friend");
  assert.equal(tenGodFor(master, { element: "fire", polarity: "yin" }), "hurting_officer");
  assert.equal(tenGodFor(master, { element: "earth", polarity: "yin" }), "direct_wealth");
  assert.equal(tenGodFor(master, { element: "metal", polarity: "yin" }), "direct_officer");
  assert.equal(tenGodFor(master, { element: "water", polarity: "yin" }), "direct_resource");
});

test("les relations de Branches n’affichent que les paires réellement présentes", () => {
  const result = { dayMaster: { element: "wood", polarity: "yang" }, pillars: {
    year: { determined: true, stem: { key: "jia", element: "wood", polarity: "yang" }, branch: { key: "zi" } },
    month: { determined: true, stem: { key: "bing", element: "fire", polarity: "yang" }, branch: { key: "wu" } },
    day: { determined: true, stem: { key: "jia", element: "wood", polarity: "yang" }, branch: { key: "chou" } },
    hour: { determined: false },
  } };
  assert.equal(visibleTenGods(result).length, 3);
  assert.deepEqual(branchRelations(result).map(({ type }) => type).sort(), ["clash", "combination"]);
});
