import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("le sheet mobile est porté par le viewport et recouvre la navigation", async () => {
  const [script, css] = await Promise.all([read("tao-ai-conversation.js"), read("product-experience.css")]);
  assert.match(script, /document\.body\.append\(backdrop, panel\)/);
  assert.doesNotMatch(script, /panel\.scrollIntoView/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.tao-ai-panel\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /--tao-ai-visual-height:\s*100dvh/);
  assert.match(css, /height:\s*min\(96dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /body\.tao-ai-panel-open \.main-navigation[\s\S]*?visibility:\s*hidden/);
});

test("visualViewport réduit le sheet sans déplacer le Pavillon", async () => {
  const script = await read("tao-ai-conversation.js");
  assert.match(script, /window\.visualViewport/);
  assert.match(script, /viewport\?\.height \?\? window\.innerHeight/);
  assert.match(script, /--tao-ai-visual-top/);
  assert.match(script, /tao-ai-keyboard-open/);
  assert.match(script, /rememberScrollPosition\(\)/);
  assert.match(script, /restoreScrollPosition\(\)/);
  assert.match(script, /focus\(\{ preventScroll: true \}\)/);
});

test("seuls les messages défilent et le composeur reste hors du scroll", async () => {
  const css = await read("product-experience.css");
  assert.match(css, /\.tao-ai-panel\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.tao-ai-session\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\) auto[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.tao-ai-messages\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /\.tao-ai-dock\s*\{/);
  assert.match(css, /\.tao-ai-message__content p[\s\S]*?color:\s*#eee6d5/);
});

test("le composeur est intégré et accessible", async () => {
  const [script, css] = await Promise.all([read("tao-ai-conversation.js"), read("product-experience.css")]);
  assert.match(script, /rows="1"/);
  assert.match(script, /Demander quelque chose à TAO/);
  assert.match(script, /aria-label="Envoyer le message"/);
  assert.doesNotMatch(script, />Envoyer<\/button>/);
  assert.doesNotMatch(script, /Intelligence conversationnelle : activée/);
  assert.match(script, /Math\.min\(input\.scrollHeight, 132\)/);
  assert.match(css, /\.tao-ai-form\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) 2\.75rem/);
});

test("le sheet piège le focus, ferme avec Échap et respecte les mouvements réduits", async () => {
  const [script, css] = await Promise.all([read("tao-ai-conversation.js"), read("product-experience.css")]);
  assert.match(script, /event\.key === "Escape"/);
  assert.match(script, /event\.key !== "Tab"/);
  assert.match(script, /focusBeforeOpen/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
