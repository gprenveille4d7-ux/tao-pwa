import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { fr } from "../locales/fr/index.js";
import { countTranslationStrings, formatDate, formatPercent, getTranslation, LOCALIZATION_VERSION } from "../locales/index.js";
import { calculateBazi } from "../bazi-engine.mjs";
import { calculateDailyTao } from "../daily-tao-engine.mjs";
import { getSemanticConcept, SEMANTIC_LAYER_VERSION } from "../semantic-layer.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function visit(value, path = "fr") {
  if (typeof value === "string") {
    assert.notEqual(value.trim(), "", `Traduction vide : ${path}`);
    assert.notEqual(value, "undefined", `Valeur undefined textuelle : ${path}`);
    assert.notEqual(value, "null", `Valeur null textuelle : ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    assert.ok(value.length, `Liste vide : ${path}`);
    value.forEach((item, index) => visit(item, `${path}.${index}`));
    return;
  }
  assert.ok(value && typeof value === "object", `Valeur non traduisible : ${path}`);
  for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
}

test("le catalogue français est versionné et ne contient aucune valeur vide", () => {
  assert.equal(LOCALIZATION_VERSION, "tao-localization-fr-1.5.1");
  visit(fr);
  assert.ok(countTranslationStrings(fr) >= 300);
});

test("la couche sémantique couvre les notions visibles à trois niveaux", () => {
  assert.equal(SEMANTIC_LAYER_VERSION, "tao-semantics-fr-1.0.0");
  assert.equal(Object.keys(fr.semantics.stems).length, 10);
  assert.equal(Object.keys(fr.semantics.elements).length, 5);
  assert.equal(Object.keys(fr.semantics.tenGods).length, 10);
  assert.equal(Object.keys(fr.semantics.tenGodFamilies).length, 5);
  for (const concept of Object.values(fr.semantics.stems)) {
    assert.ok(concept.humanTitle && concept.humanDescription && concept.technicalFrench && concept.traditionalLabel);
  }
  for (const concept of Object.values(fr.semantics.tenGods)) {
    assert.ok(concept.humanLabel && concept.humanDescription && concept.technicalFrench && concept.traditionalLabel);
  }
});

test("une notion sémantique absente produit une formulation humaine sûre", () => {
  const missing = getSemanticConcept("tenGods", "TEN_GOD_03");
  assert.equal(missing.humanLabel, "Une dynamique à observer");
  assert.doesNotMatch(JSON.stringify(missing), /TEN_GOD_03|undefined|translation_missing/i);
});

test("les ensembles BaZi canoniques sont intégralement couverts", () => {
  assert.equal(Object.keys(fr.bazi.heavenlyStems).length, 10);
  assert.equal(Object.keys(fr.bazi.earthlyBranches).length, 12);
  assert.equal(Object.keys(fr.bazi.elements).length, 5);
  assert.equal(Object.keys(fr.bazi.tenGods).length, 10);
  assert.equal(Object.keys(fr.bazi.hiddenStems.branches).length, 12);
  assert.equal(Object.keys(fr.bazi.naYin.entries).length, 30);
  assert.ok(Object.keys(fr.bazi.shenSha.entries).length >= 9);
  assert.equal(Object.keys(fr.bazi.lifeStages).length, 12);
  assert.equal(Object.keys(fr.calendar.solarTerms).length, 24);
  assert.deepEqual(new Set(Object.keys(fr.bazi.polarities).filter((key) => key !== "balance")), new Set(["yin", "yang"]));
});

test("les identifiants des catalogues ne sont pas dupliqués", () => {
  for (const [name, source] of Object.entries({
    stems: fr.bazi.heavenlyStems,
    branches: fr.bazi.earthlyBranches,
    tenGods: fr.bazi.tenGods,
    terms: fr.calendar.solarTerms,
    glossary: fr.glossary,
  })) {
    const keys = Object.keys(source);
    assert.equal(new Set(keys).size, keys.length, `Doublon dans ${name}`);
  }
  const glossaryIds = Object.values(fr.glossary).map(({ id }) => id);
  assert.equal(new Set(glossaryIds).size, glossaryIds.length, "Identifiant de glossaire dupliqué");
});

test("un terme absent produit un fallback français sûr", () => {
  assert.equal(getTranslation("fr", "bazi.tenGods.SHEN_SHA_14"), "Information traditionnelle");
  assert.doesNotMatch(getTranslation("fr", "bazi.tenGods.direct_wealth_unknown"), /direct_wealth|undefined|null/i);
});

test("les formats français respectent date et pourcentage", () => {
  assert.equal(formatDate("2026-08-12"), "12 août 2026");
  assert.match(formatPercent(63), /^63[\s\u00a0\u202f]%$/);
});

test("les vues principales ne contiennent aucun libellé anglais BaZi brut", async () => {
  const files = ["index.html", "bazi-theme.js", "today-view.js", "profiles-view.js", "app-navigation.js"];
  const forbidden = /\b(Day Master|Direct Wealth|Hidden Stems?|Wood|Fire|Earth|Metal|Water|Year Pillar|Month Pillar|Day Pillar|Hour Pillar)\b/;
  for (const file of files) {
    const source = await readFile(resolve(projectRoot, file), "utf8");
    assert.doesNotMatch(source, forbidden, `Terme anglais brut dans ${file}`);
  }
});

test("les écrans normaux commencent par le sens humain", async () => {
  const today = await readFile(resolve(projectRoot, "today-view.js"), "utf8");
  const theme = await readFile(resolve(projectRoot, "bazi-theme.js"), "utf8");
  const yiJing = await readFile(resolve(projectRoot, "yijing-view.js"), "utf8");
  assert.match(today, /Pourquoi TAO me dit ça/);
  assert.match(theme, /Ton énergie fondamentale/);
  assert.match(theme, /Les grandes dynamiques de ton thème/);
  assert.match(yiJing, /Ce que montre ton tirage/);
  assert.match(yiJing, /Découvrir le tirage traditionnel/);
});

test("tous les identifiants exposés par les moteurs actuels ont une entrée française", () => {
  const profile = {
    id: "localization-fixture", firstName: "Alice", relationship: "self", birthDate: "1985-09-11",
    birthTime: "14:32", birthTimeKnown: true, updatedAt: "2026-08-12T00:00:00.000Z",
    birthPlace: { id: "paris", city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  };
  const natal = calculateBazi(profile);
  const daily = calculateDailyTao({ profile, natalTheme: natal, date: "2026-08-12", timeZone: "Europe/Paris" });
  const pillars = [...Object.values(natal.pillars), ...Object.values(daily.pillars)].filter(({ determined }) => determined);
  for (const pillar of pillars) {
    assert.ok(fr.bazi.heavenlyStems[pillar.stem.key], `Tronc moteur non localisé : ${pillar.stem.key}`);
    assert.ok(fr.bazi.earthlyBranches[pillar.branch.key], `Branche moteur non localisée : ${pillar.branch.key}`);
  }
  for (const key of Object.keys(natal.elements)) assert.ok(fr.bazi.elements[key], `Élément moteur non localisé : ${key}`);
  const termId = daily.solarTerm.pinyin.toLowerCase().replace(/\s+/g, "_");
  assert.ok(fr.calendar.solarTerms[termId], `Terme solaire moteur non localisé : ${termId}`);
  assert.ok(fr.guidance.elementAdvice[daily.dayEnergy.stem.element], "Guidance de l’élément du jour absente");
  assert.ok(fr.guidance.detailed.actionCopy[daily.domains.action], "Tendance d’action non localisée");
  assert.ok(fr.guidance.detailed.relationshipCopy[daily.domains.relations], "Tendance relationnelle non localisée");
  assert.equal(fr.guidance.status.moderate, "Modérée");
  assert.ok(fr.yijing.guidance.essential && fr.yijing.history.confirmDelete, "Interface Yi Jing incomplète");
});
