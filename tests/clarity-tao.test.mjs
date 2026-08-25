import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("les composants de provenance et de repères sont factorisés", async () => {
  const source = await readFile(new URL("../tao-components.js", import.meta.url), "utf8");
  assert.match(source, /createSourceBadge/);
  assert.match(source, /createContextBreadcrumb/);
  assert.match(source, /createReadingReferenceCard/);
  assert.match(source, /Jour × thème natal/);
});

test("retoucher un onglet actif revient à sa racine et en haut", async () => {
  const [source, sections] = await Promise.all([
    readFile(new URL("../app-navigation.js", import.meta.url), "utf8"),
    readFile(new URL("../section-navigation.js", import.meta.url), "utf8"),
  ]);
  assert.match(source, /route\.view !== targetView/);
  assert.match(source, /view\?\.scrollTo/);
  assert.match(source, /scrollViewToTop\(targetView\)/);
  assert.match(sections, /currentRoute\.view !== view \|\| currentRoute\.section !== item\.id/);
  assert.match(sections, /scrollHost\?\.scrollTo/);
});

test("les écrans séparent astronomie, environnement et Yi Jing", async () => {
  const today = await readFile(new URL("../today-view.js", import.meta.url), "utf8");
  const yijing = await readFile(new URL("../yijing-view.js", import.meta.url), "utf8");
  assert.match(today, /createSourceBadge\("astronomy"/);
  assert.match(today, /createSourceBadge\("environment"/);
  assert.match(yijing, /createSourceBadge\("yijing"/);
});

test("les restitutions quotidiennes reprennent la phrase grammaticale du moteur", async () => {
  const today = await readFile(new URL("../today-view.js", import.meta.url), "utf8");
  assert.equal((today.match(/dayEnergy\.summary/g) ?? []).length >= 4, true);
  assert.doesNotMatch(today, /dailySummaryYin/);
});

test("Profils propose une navigation mobile illustrée et un nombre illimité de proches", async () => {
  const [profiles, navigation, styles] = await Promise.all([
    readFile(new URL("../profiles-view.js", import.meta.url), "utf8"),
    readFile(new URL("../section-navigation.js", import.meta.url), "utf8"),
    readFile(new URL("../tao-components.css", import.meta.url), "utf8"),
  ]);
  assert.match(profiles, /limit:\s*Number\.POSITIVE_INFINITY/);
  assert.match(profiles, /profile-add-action/);
  assert.match(navigation, /section-navigation__icon/);
  assert.match(styles, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});
