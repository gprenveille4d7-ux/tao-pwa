import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('le panneau mobile est porté par le viewport et non par la scène', async () => {
  const [script, css] = await Promise.all([
    read('tao-ai-conversation.js'),
    read('product-experience.css'),
  ]);

  assert.match(script, /document\.body\.append\(panel\)/);
  assert.doesNotMatch(script, /panel\.scrollIntoView/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.tao-ai-panel\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /--tao-ai-visual-height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('le clavier réduit le sheet via visualViewport sans déplacer le Pavillon', async () => {
  const script = await read('tao-ai-conversation.js');

  assert.match(script, /window\.visualViewport/);
  assert.match(script, /viewport\?\.height \?\? window\.innerHeight/);
  assert.match(script, /tao-ai-keyboard-open/);
  assert.match(script, /rememberScrollPosition\(\)/);
  assert.match(script, /restoreScrollPosition\(\)/);
  assert.match(script, /focus\(\{ preventScroll: true \}\)/);
});

test('seuls les messages défilent verticalement dans la session', async () => {
  const css = await read('product-experience.css');

  assert.match(css, /\.tao-ai-panel\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.tao-ai-session\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.tao-ai-messages\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /\.tao-ai-message p[\s\S]*?color:\s*#eee6d5/);
});
