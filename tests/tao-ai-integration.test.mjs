import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("le Pavillon charge une conversation TAO et non une application de chat séparée", async () => {
  const [html, conversation] = await Promise.all([readFile(resolve(root, "index.html"), "utf8"), readFile(resolve(root, "tao-ai-conversation.js"), "utf8")]);
  assert.match(html, /tao-ai-conversation\.js/);
  assert.match(conversation, /\.tao-conversation/);
  assert.match(conversation, /Parler avec TAO/);
});

test("Aujourd’hui et Yi Jing ouvrent TAO avec leur contexte local", async () => {
  const [today, yijing] = await Promise.all([readFile(resolve(root, "today-view.js"), "utf8"), readFile(resolve(root, "yijing-view.js"), "utf8")]);
  assert.match(today, /mode: "daily_synthesis"/);
  assert.match(today, /mode: "explanation"/);
  assert.match(yijing, /mode: "yijing"/);
  assert.match(yijing, /changingLines: state\.result\.changingLines/);
});

test("le service worker ne cache aucun POST ni origine Worker", async () => {
  const source = await readFile(resolve(root, "sw.js"), "utf8");
  assert.match(source, /request\.method !== "GET"/);
  assert.match(source, /url\.origin !== self\.location\.origin/);
});

test("aucune clé Gemini n’est présente dans les fichiers publics", async () => {
  for (const file of ["index.html", "tao-ai-config.js", "tao-ai-client.js", "sw.js"]) {
    const source = await readFile(resolve(root, file), "utf8");
    assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/);
    assert.doesNotMatch(source, /GEMINI_API_KEY\s*=/);
  }
});
