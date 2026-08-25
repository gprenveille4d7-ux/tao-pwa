import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { familyTechnicalLabel, humanizeFamilyCalculation, listFamilyLexiconEntries } from "../family-constellation-lexicon.mjs";

test("le lexique familial traduit les clés techniques visibles", () => {
  assert.equal(familyTechnicalLabel("dateDigitSum"), "somme des chiffres de la date");
  assert.equal(humanizeFamilyCalculation("Alice · timeDigitSum = 13"), "Alice · somme des chiffres de l’heure = 13");
  assert.ok(listFamilyLexiconEntries().every(({ label }) => label.trim()));
});

test("la constellation utilise un inventaire progressif et une feuille de détail mobile", async () => {
  const [view, css] = await Promise.all([
    readFile(new URL("../family-constellation-view.js", import.meta.url), "utf8"),
    readFile(new URL("../product-experience.css", import.meta.url), "utf8"),
  ]);
  for (const label of ["Synthèse", "Inventaire", "Famille", "Chronologie", "Explorer", "Voir le détail", "Où apparaît-il", "Particularités liées"]) assert.match(view, new RegExp(label));
  assert.match(view, /data-pattern-id/);
  assert.doesNotMatch(view, /reading\.primaryCards\.forEach\(\(card\) => primary\.append/);
  assert.match(view, /openTaoSheet/);
  assert.match(view, /createTaoSegmentedControl/);
  assert.match(view, /createTaoCarousel/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("la constellation contient ses cartes et son carrousel dans la largeur iPhone", async () => {
  const css = await readFile(new URL("../product-experience.css", import.meta.url), "utf8");
  assert.match(css, /\.family-results[^}]*max-width:\s*100%[^}]*overflow-x:\s*clip/s);
  assert.match(css, /\.family-result-hero[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.family-primary-carousel \.tao-carousel[^}]*margin-inline:\s*0/s);
  assert.match(css, /\.family-result-hero h2[^{]*\{[^}]*overflow-wrap:\s*anywhere/s);
});
