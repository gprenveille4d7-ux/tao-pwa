import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("la page Yi Jing remplace le placeholder et charge son contrôleur", async () => {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  assert.match(html, /data-yijing-root/);
  assert.match(html, /yijing-view\.js\?v=navigation-2/);
  assert.doesNotMatch(html, /Consultation future|Aucun tirage, pièce/);
});

test("le parcours comprend question, tirage, transformation, guidance et historique", async () => {
  const source = await readFile(resolve(root, "yijing-view.js"), "utf8");
  assert.match(source, /function render\(\)\s*\{\s*renderYijingView\(\);/);
  for (const marker of ["questionCard", "confirmationCard", "castingCard", "hexagramCard", "guidanceSection", "historySection", "learningSection"]) assert.match(source, new RegExp(marker));
  assert.match(source, /TAO_POSE_05_YI_JING/);
  assert.match(source, /TAO_POSE_03_REFLEXION/);
  assert.match(source, /TAO_POSE_07_EXPLICATION/);
});

test("le module reste local et ne dépend d’aucune API réseau", async () => {
  const files = ["yijing-view.js", "yijing-engine.mjs", "yijing-guidance.mjs", "yijing-history.js", "yijing-data.mjs"];
  for (const file of files) {
    const source = await readFile(resolve(root, file), "utf8");
    assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|https?:\/\//, `Accès réseau détecté dans ${file}`);
  }
});
