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
  const source = await readFile(new URL("../app-navigation.js", import.meta.url), "utf8");
  assert.match(source, /route\.view !== targetView/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
});

test("les écrans séparent astronomie, environnement et Yi Jing", async () => {
  const today = await readFile(new URL("../today-view.js", import.meta.url), "utf8");
  const yijing = await readFile(new URL("../yijing-view.js", import.meta.url), "utf8");
  assert.match(today, /createSourceBadge\("astronomy"/);
  assert.match(today, /createSourceBadge\("environment"/);
  assert.match(yijing, /createSourceBadge\("yijing"/);
});
