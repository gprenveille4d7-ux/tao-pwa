import assert from "node:assert/strict";
import test from "node:test";
import { parseSafeMarkdown, shortenConversationSuggestion } from "../tao-conversation-format.mjs";

test("le Markdown léger distingue italique, gras, paragraphes et listes", () => {
  const blocks = parseSafeMarkdown("Le terme *Li Qiu* marque **un passage**.\n\n- Observer\n- Respirer");
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[0].lines[0].some((token) => token.type === "emphasis" && token.value === "Li Qiu"), true);
  assert.equal(blocks[0].lines[0].some((token) => token.type === "strong" && token.value === "un passage"), true);
  assert.deepEqual(blocks[1].items.map((item) => item[0].value), ["Observer", "Respirer"]);
});

test("le HTML arbitraire reste du texte et n’est jamais interprété", () => {
  const blocks = parseSafeMarkdown('<img src=x onerror="alert(1)">');
  assert.equal(blocks[0].lines[0][0].type, "text");
  assert.match(blocks[0].lines[0][0].value, /<img/);
});

test("les suggestions longues deviennent des intentions courtes", () => {
  assert.equal(shortenConversationSuggestion("Comment la transition vers l'automne m'affecte-t-elle personnellement ?"), "Et pour moi ?");
  const fallback = shortenConversationSuggestion("Une formulation extraordinairement longue sans intention reconnue");
  assert.ok(fallback.length <= 30);
  assert.match(fallback, /…$/);
});
