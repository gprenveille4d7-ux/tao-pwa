import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("l’inventaire familial ouvre sa vue locale et aucune pseudo-route ne subsiste", async () => {
  const family = await source("family-constellation-view.js");
  assert.doesNotMatch(family, /href:\s*["']#family-all-observations/);
  assert.match(family, /data-segment-id=["']explore["']/);
  assert.match(family, /Voir tous les motifs/);
});

test("les sheets se ferment à chaque changement de contexte", async () => {
  const components = await source("tao-components.js");
  assert.match(components, /closeAllTaoSheets/);
  assert.match(components, /addEventListener\("hashchange"/);
  assert.match(components, /addEventListener\("tao:view-change"/);
  assert.match(components, /activeSheetClosers\.delete/);
});

test("les fonctions majeures ont un accès humain direct depuis leur parent", async () => {
  const [today, theme, profiles, yijing] = await Promise.all([source("today-view.js"), source("bazi-theme.js"), source("profiles-view.js"), source("yijing-view.js")]);
  assert.match(today, /id:\s*"season",\s*label:\s*"Ma saison"/);
  assert.match(theme, /Comprendre vos Cinq Mouvements/);
  assert.match(theme, /Comprendre vos relations internes/);
  assert.match(theme, /les Dix Dieux/i);
  assert.match(profiles, /id:\s*"compatibility"/);
  assert.match(profiles, /id:\s*"family"/);
  assert.match(yijing, /id:\s*"consult"/);
});

test("la conversation TAO conserve sa route de provenance", async () => {
  const ai = await source("tao-ai-conversation.js");
  assert.match(ai, /routeAtOpen\s*=\s*location\.hash/);
  assert.doesNotMatch(ai, /location\.hash\s*=\s*["']#pavilion\/tao/);
});

test("l’onboarding offre un retour qui préserve le brouillon", async () => {
  const onboarding = await source("onboarding.js");
  assert.match(onboarding, /PREVIOUS_STEP/);
  assert.match(onboarding, /Étape précédente/);
  assert.match(onboarding, /appendBackControl\(step\)/);
});

test("les cibles tactiles et le mouvement réduit sont harmonisés", async () => {
  const [components, styles] = await Promise.all([source("tao-components.css"), source("styles.css")]);
  assert.match(components, /\.tao-navigation-row[^}]*min-height:\s*3\.75rem/s);
  assert.match(components, /\.tao-carousel__dots button[^}]*2\.75rem/s);
  assert.match(components, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /\.tao-dialogue__control[^}]*2\.75rem/s);
});
