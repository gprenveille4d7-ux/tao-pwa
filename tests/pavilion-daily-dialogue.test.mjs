import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("le lancement présente une attente utile et prépare le cache des visites suivantes", async () => {
  const [html, bootstrap, worker] = await Promise.all([
    readFile(resolve(root, "index.html"), "utf8"),
    readFile(resolve(root, "tao-bootstrap.js"), "utf8"),
    readFile(resolve(root, "sw.js"), "utf8"),
  ]);
  assert.match(html, /TAO ouvre le Nebula/);
  assert.match(html, /data-boot-critical/);
  assert.match(bootstrap, /serviceWorker\.register/);
  assert.match(worker, /cacheFirst/);
  assert.doesNotMatch(html, /\ssrc="\.\/public\/assets\/tao\/pavilion\/desk\/BUREAU_BASE_CARTE_CELESTE\.png"/);
});

test("le dialogue quotidien possède quatre informations et des commandes accessibles", async () => {
  const [html, view] = await Promise.all([
    readFile(resolve(root, "index.html"), "utf8"),
    readFile(resolve(root, "today-view.js"), "utf8"),
  ]);
  assert.match(html, /data-dialogue-previous/);
  assert.match(html, /data-dialogue-next/);
  for (const key of ["dailyBrief.energy", "dailyBrief.season", "dailyBrief.advice", "dailyBrief.resonance"]) {
    assert.match(view, new RegExp(key.replace(".", "\\.")));
  }
});

test("la scène ne définit aucune transition sur le personnage", async () => {
  const css = await readFile(resolve(root, "styles.css"), "utf8");
  const rule = css.match(/\.tao-character__image\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.doesNotMatch(rule, /transition|animation|opacity/);
});
