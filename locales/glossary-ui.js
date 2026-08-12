import { element } from "../tao-ui.js";
import { getConcept, t } from "./index.js";

export function glossaryDisclosure(entryIds, title = "Glossaire de TAO") {
  const details = element("details", { className: "product-disclosure tao-glossary" });
  details.append(element("summary", { text: `${t("common.actions.understand")} · ${title}` }));
  const content = element("div", { className: "product-disclosure__content tao-glossary__content" });
  for (const id of entryIds) {
    const entry = getConcept("glossary", id);
    const article = element("article", { className: "tao-glossary__entry", attributes: { id: `glossary-${id}` } });
    article.append(
      element("h3", { text: entry.name ?? entry.label }),
      element("p", { className: "tao-glossary__traditional", text: entry.traditional ?? [entry.pinyin, entry.hanzi].filter(Boolean).join(" · ") }),
      element("p", { text: entry.short ?? entry.explanation }),
    );
    if (entry.detail) article.append(element("p", { className: "tao-glossary__detail", text: entry.detail }));
    content.append(article);
  }
  details.append(content);
  return details;
}
