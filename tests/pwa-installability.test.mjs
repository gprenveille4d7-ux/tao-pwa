import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("le manifeste Android ouvre TAO en standalone dans le scope GitHub Pages", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.id, "/tao-pwa/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/tao-pwa/");
  assert.ok(manifest.start_url.startsWith(manifest.scope));
  assert.equal(manifest.start_url, "/tao-pwa/#pavilion");
  assert.ok(manifest.icons.some(({ sizes, purpose }) => sizes === "192x192" && purpose === "any"));
  assert.ok(manifest.icons.some(({ sizes, purpose }) => sizes === "512x512" && purpose === "maskable"));
});

test("toutes les icônes déclarées existent et sont de vrais PNG", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "manifest.webmanifest"), "utf8"));
  for (const icon of manifest.icons) {
    const path = resolve(root, icon.src.replace(/^\.\//, ""));
    assert.ok((await stat(path)).size > 1000);
    const bytes = await readFile(path);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test("index charge réellement le manifeste et conserve les métadonnées iOS", async () => {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /name="theme-color" content="#07111f"/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="TAO"/);
});

test("le service worker couvre le sous-répertoire et précache les ressources PWA", async () => {
  const [bootstrap, worker] = await Promise.all([readFile(resolve(root, "tao-bootstrap.js"), "utf8"), readFile(resolve(root, "sw.js"), "utf8")]);
  assert.match(bootstrap, /serviceWorker\.register\("\.\/sw\.js", \{ scope: "\.\/"/);
  assert.match(worker, /\.\/manifest\.webmanifest/);
  assert.match(worker, /\.\/public\/icons\/icon-512-maskable\.png/);
  assert.match(worker, /request\.method !== "GET"/);
});

test("les cinq destinations principales restent des routes hash compatibles standalone", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "manifest.webmanifest"), "utf8"));
  for (const hash of ["#pavilion", "#today", "#theme", "#yijing", "#profiles"]) {
    const url = new URL(`${manifest.scope}${hash}`, "https://gprenveille4d7-ux.github.io");
    assert.equal(url.pathname, "/tao-pwa/");
    assert.equal(url.hash, hash);
  }
});
