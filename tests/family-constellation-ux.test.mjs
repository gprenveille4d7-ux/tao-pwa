import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { familyTechnicalLabel, humanizeFamilyCalculation, listFamilyLexiconEntries } from "../family-constellation-lexicon.mjs";

test("le lexique familial traduit les clés techniques visibles", () => {
  assert.equal(familyTechnicalLabel("dateDigitSum"), "somme des chiffres de la date");
  assert.equal(humanizeFamilyCalculation("Alice · timeDigitSum = 13"), "Alice · somme des chiffres de l’heure = 13");
  assert.ok(listFamilyLexiconEntries().every(({ label }) => label.trim()));
});

test("la constellation utilise cinq vues progressives et une feuille de calcul mobile", async () => {
  const [view, css] = await Promise.all([
    readFile(new URL("../family-constellation-view.js", import.meta.url), "utf8"),
    readFile(new URL("../product-experience.css", import.meta.url), "utf8"),
  ]);
  for (const label of ["Synthèse", "Motifs", "Famille", "Chronologie", "Explorer"]) assert.match(view, new RegExp(label));
  assert.match(view, /family-calculation-sheet/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
});
