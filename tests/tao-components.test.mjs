import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../tao-components.js", import.meta.url);
const cssUrl = new URL("../tao-components.css", import.meta.url);

test("TaoCarousel limite les cartes et reste utilisable sans swipe", async () => {
  const [source, css] = await Promise.all([readFile(sourceUrl, "utf8"), readFile(cssUrl, "utf8")]);
  assert.match(source, /limit = 5/);
  assert.match(source, /cards\.filter\(Boolean\)\.slice\(0, limit\)/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /Afficher la carte/);
  assert.match(source, /aria-current/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("TaoSegmentedControl expose la sélection et le clavier", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /role:\s*"tablist"/);
  assert.match(source, /role:\s*"tab"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /Home/);
  assert.match(source, /End/);
  assert.match(source, /onChange\?\.\(id\)/);
});

test("TaoSheet gère dialogue, Escape, focus trap et retour du focus", async () => {
  const [source, css] = await Promise.all([readFile(sourceUrl, "utf8"), readFile(cssUrl, "utf8")]);
  assert.match(source, /role:\s*"dialog"/);
  assert.match(source, /"aria-modal":\s*"true"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /opener\?\.focus/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /overflow-y:\s*auto/);
});

test("les largeurs mobiles prioritaires utilisent une mise en page fluide", async () => {
  const css = await readFile(cssUrl, "utf8");
  assert.match(css, /max-width:\s*360px/);
  assert.match(css, /calc\(100% - 2\.25rem\)/);
  assert.match(css, /width:\s*min\(100%, 43rem\)/);
});
