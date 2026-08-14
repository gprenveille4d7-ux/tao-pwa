const INLINE_MARKUP = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

export function parseInlineMarkdown(value) {
  const source = String(value ?? "");
  const tokens = [];
  let cursor = 0;
  for (const match of source.matchAll(INLINE_MARKUP)) {
    if (match.index > cursor) tokens.push({ type: "text", value: source.slice(cursor, match.index) });
    const markup = match[0];
    const strong = markup.startsWith("**") || markup.startsWith("__");
    tokens.push({ type: strong ? "strong" : "emphasis", value: markup.slice(strong ? 2 : 1, strong ? -2 : -1) });
    cursor = match.index + markup.length;
  }
  if (cursor < source.length) tokens.push({ type: "text", value: source.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", value: source }];
}

export function parseSafeMarkdown(value) {
  const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", lines: paragraph.map(parseInlineMarkdown) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: "list", items: list.map(parseInlineMarkdown) });
    list = [];
  };
  for (const line of lines) {
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }
    flushList();
    if (!line.trim()) flushParagraph();
    else paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function shortenConversationSuggestion(value, maxLength = 30) {
  const original = String(value ?? "").trim();
  if (original.length <= maxLength) return original;
  const normalized = original.toLocaleLowerCase("fr-FR");
  const knownIntents = [
    [/pourquoi/, "Pourquoi ?"],
    [/demain/, "Et demain ?"],
    [/personnel|pour moi|m'affecte|me concerne/, "Et pour moi ?"],
    [/travail|activit/, "Et pour mon travail ?"],
    [/thème|theme/, "Et mon thème ?"],
  ];
  const known = knownIntents.find(([pattern]) => pattern.test(normalized));
  if (known) return known[1];
  const limit = Math.max(8, maxLength - 1);
  const slice = original.slice(0, limit + 1);
  const wordBoundary = slice.lastIndexOf(" ");
  return `${original.slice(0, wordBoundary > limit * .55 ? wordBoundary : limit).trimEnd()}…`;
}
