import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { element } from "./tao-ui.js";
import { formatDate, getConcept, t } from "./locales/index.js?v=1.2.0";
import { setTaoPose } from "./tao-character.js";
import { HEXAGRAMS, TRIGRAMS } from "./yijing-data.mjs?v=1.0.1";
import { castThreeCoins, createCasting, interpretLineValue, resolveCasting } from "./yijing-engine.mjs?v=1.0.1";
import { createYijingGuidance } from "./yijing-guidance.mjs?v=1.0.1";
import { deleteYijingReading, getYijingHistory, saveYijingReading, toggleYijingFavorite } from "./yijing-history.js";
import { createSectionNavigation, focusRequestedSection, markProductSection, showOnlyProductSection } from "./section-navigation.js?v=tao-ux-5";
import { appRoute, parseAppRoute } from "./navigation-routes.mjs?v=tao-ux-3";
import { createTaoCarousel, createTaoHero, createSourceBadge, openTaoSheet } from "./tao-components.js?v=navigation-2";

const root = document.querySelector("[data-yijing-root]");
const state = { phase: "question", question: "", lines: [], result: null, guidance: null, savedId: null };
const YIJING_SECTIONS = Object.freeze([
  { id: "consult", label: "Consulter" }, { id: "history", label: "Mes tirages" }, { id: "learn", label: "Apprendre" },
]);

function render() {
  renderYijingView();
}

function sectionHeader(kicker, title, intro) {
  const header = element("header", { className: "product-section__header" });
  if (kicker) header.append(element("p", { className: "product-eyebrow", text: kicker }));
  header.append(element("h2", { text: title }));
  if (intro) header.append(element("p", { className: "product-section__intro", text: intro }));
  return header;
}

function button(label, action, { primary = false, danger = false } = {}) {
  const node = element("button", { className: `product-button${primary ? " product-button--primary" : ""}${danger ? " product-button--danger" : ""}`, text: label, attributes: { type: "button" } });
  node.addEventListener("click", action);
  return node;
}

function profileContext() {
  const profile = getActiveProfile();
  if (!profile) return null;
  const theme = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
  const stem = getConcept("bazi.heavenlyStems", theme.dayMaster.key);
  return { profileId: profile.id, firstName: profile.firstName, dayMaster: { ...theme.dayMaster, label: `${stem.french} · ${stem.label}` } };
}

function resetConsultation({ keepQuestion = false } = {}) {
  state.phase = "question";
  if (!keepQuestion) state.question = "";
  state.lines = [];
  state.result = null;
  state.guidance = null;
  state.savedId = null;
  render();
}

function createPageHeader() {
  return createTaoHero({ eyebrow: t("yijing.page.eyebrow"), title: t("yijing.page.title"), lead: "Ce que votre tirage vous invite à regarder maintenant.", context: t("yijing.page.notice") });
}

function questionCard() {
    const card = element("section", { className: "surface-main yijing-question" });
  card.append(sectionHeader(t("yijing.question.kicker"), t("yijing.question.title"), t("yijing.question.help")));
  const form = element("form", { className: "yijing-question__form" });
  const label = element("label", { text: t("yijing.question.label"), attributes: { for: "yijing-question" } });
  const textarea = element("textarea", { attributes: { id: "yijing-question", rows: "4", maxlength: "280", placeholder: t("yijing.question.placeholder"), required: "" } });
  textarea.value = state.question;
  const error = element("p", { className: "form-error", attributes: { role: "alert" } });
  form.append(label, textarea, element("p", { className: "field-status", text: t("yijing.question.example") }), error);
  form.append(button(t("yijing.question.continue"), () => {} , { primary: true }));
  form.lastElementChild.type = "submit";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = textarea.value.trim();
    if (question.length < 6) { error.textContent = t("yijing.errors.questionRequired"); textarea.focus(); return; }
    state.question = question;
    state.phase = "confirm";
    render();
  });
  card.append(form);
  return card;
}

function confirmationCard() {
  const card = element("section", { className: "surface-main yijing-confirmation" });
  card.append(sectionHeader(t("yijing.confirm.kicker"), t("yijing.confirm.title"), t("yijing.confirm.help")));
  card.append(element("blockquote", { text: state.question }));
  const actions = element("div", { className: "product-actions" });
  actions.append(
    button(t("yijing.actions.editQuestion"), () => { state.phase = "question"; render(); }),
    button(t("yijing.actions.start"), () => { state.phase = "casting"; state.lines = []; setTaoPose("TAO_POSE_05_YI_JING").catch(() => {}); render(); }, { primary: true }),
  );
  card.append(actions);
  return card;
}

function lineDiagram(lines, { compact = false } = {}) {
  const diagram = element("ol", { className: `hexagram-diagram${compact ? " hexagram-diagram--compact" : ""}`, attributes: { "aria-label": t("yijing.hexagram.diagram") } });
  for (let index = 5; index >= 0; index -= 1) {
    const line = lines[index];
    const item = element("li", { className: `hexagram-line${line ? ` hexagram-line--${line.polarity}${line.changing ? " hexagram-line--changing" : ""}` : " hexagram-line--empty"}` });
    item.setAttribute("aria-label", line ? t("yijing.lines.accessible", { line: index + 1, label: line.label }) : t("yijing.lines.pending", { line: index + 1 }));
    item.append(element("span", { className: "hexagram-line__number", text: String(index + 1) }), element("span", { className: "hexagram-line__stroke", attributes: { "aria-hidden": "true" } }));
    if (line?.changing) item.append(element("span", { className: "hexagram-line__change", text: "×", attributes: { "aria-hidden": "true" } }));
    diagram.append(item);
  }
  return diagram;
}

function coinResult(line) {
  const row = element("div", { className: "coin-row", attributes: { "aria-label": t("yijing.coins.result", { value: line.value }) } });
  for (const coin of line.coins ?? []) row.append(element("span", { className: `yijing-coin yijing-coin--${coin}`, text: coin === "heads" ? t("yijing.coins.headsShort") : t("yijing.coins.tailsShort") }));
  row.append(element("strong", { text: `${line.value} · ${t(`yijing.lines.values.${line.value}`)}` }));
  return row;
}

function finishCasting(lines) {
  state.lines = [...lines];
  state.result = resolveCasting(state.lines);
  state.guidance = createYijingGuidance({ question: state.question, result: state.result, profileContext: profileContext() });
  state.phase = "result";
  setTaoPose("TAO_POSE_03_REFLEXION").catch(() => {});
  window.setTimeout(() => setTaoPose("TAO_POSE_07_EXPLICATION").catch(() => {}), 900);
  render();
}

function castingCard() {
  const nextLine = state.lines.length + 1;
  const card = element("section", { className: "surface-main yijing-casting" });
  card.append(sectionHeader(t("yijing.casting.kicker"), t("yijing.casting.title"), t("yijing.casting.help")));
  card.append(element("p", { className: "yijing-question-reminder", text: state.question }), lineDiagram(state.lines));
  if (state.lines.length) card.append(coinResult(state.lines[state.lines.length - 1]));
  const progress = element("p", { className: "yijing-casting__progress", text: t("yijing.casting.progress", { current: Math.min(nextLine, 6) }) });
  const actions = element("div", { className: "product-actions" });
  actions.append(button(t("yijing.casting.castLine", { line: nextLine }), () => {
    const lines = [...state.lines, castThreeCoins()];
    if (lines.length === 6) finishCasting(lines); else { state.lines = lines; render(); }
  }, { primary: true }));
  if (!state.lines.length) actions.append(button(t("yijing.casting.quick"), () => finishCasting(createCasting())));
  card.append(progress, actions);
  return card;
}

function trigramSummary(hexagram) {
  const lower = TRIGRAMS[hexagram.lower];
  const upper = TRIGRAMS[hexagram.upper];
  const grid = element("dl", { className: "trigram-grid" });
  for (const [label, trigram] of [[t("yijing.hexagram.lower"), lower], [t("yijing.hexagram.upper"), upper]]) {
    const row = element("div");
    row.append(element("dt", { text: label }), element("dd", { text: `${trigram.symbol} ${trigram.pinyin} · ${trigram.hanzi} — ${trigram.french}` }));
    grid.append(row);
  }
  return grid;
}

function hexagramCard(hexagram, lines, kind) {
  const card = element("section", { className: "product-card hexagram-card" });
  card.append(
    element("p", { className: "product-eyebrow", text: kind }),
    element("div", { className: "hexagram-card__identity", text: `${hexagram.unicode} ${hexagram.number}` }),
    element("h2", { text: hexagram.french }),
    element("p", { className: "hexagram-card__traditional", text: `${hexagram.pinyin} · ${hexagram.hanzi}` }),
    lineDiagram(lines, { compact: true }),
    trigramSummary(hexagram),
    element("p", { className: "hexagram-card__image", text: `${t("yijing.hexagram.image")} : ${hexagram.image}.` }),
    element("p", { className: "hero-card__summary", text: hexagram.summary }),
  );
  return card;
}

function guidanceSection(guidance) {
  const wrap = element("section", { className: "yijing-guidance product-section" });
  wrap.append(sectionHeader(t("yijing.guidance.kicker"), t("yijing.guidance.title"), guidance.symbolicNotice));
  const message = element("article", { className: "surface-main yijing-guidance__card yijing-guidance__card--essential" });
  message.append(createSourceBadge("yijing"), element("p", { className: "product-eyebrow", text: "Le message" }), element("h3", { text: guidance.essential[0] }));
  guidance.essential.slice(1, 3).forEach((text) => message.append(element("p", { text })));
  if (guidance.profile) message.append(element("p", { className: "method-note", text: guidance.profile.text }));
  const change = element("article", { className: "surface-main yijing-guidance__card yijing-guidance__card--movement" });
  change.append(createSourceBadge("yijing", "Lignes mutantes"), element("p", { className: "product-eyebrow", text: "Ce qui change" }), element("h3", { text: t("yijing.guidance.movement") }), element("p", { text: guidance.movement }));
  guidance.lineReadings.slice(0, 3).forEach((line) => change.append(element("p", { text: `${t("yijing.lines.line", { line: line.line })} · ${line.title} — ${line.text}` })));
  const advance = element("article", { className: "surface-main yijing-guidance__card yijing-guidance__card--actions" });
  advance.append(createSourceBadge("yijing", "Interprétation du tirage"), element("p", { className: "product-eyebrow", text: "Comment avancer" }), element("h3", { text: guidance.rhythm }));
  const list = element("ul");
  [...guidance.supports.slice(0, 1), ...guidance.cautions.slice(0, 1), ...guidance.actions.slice(0, 1)].forEach((text) => list.append(element("li", { text })));
  advance.append(list, element("blockquote", { text: guidance.reflection }));
  wrap.append(createTaoCarousel({ cards: [message, change, advance], label: "Les trois repères du tirage" }));
  const deepen = button("Approfondir avec TAO", () => {
    window.dispatchEvent(new CustomEvent("tao:ai-open", { detail: {
      mode: "yijing",
      prompt: "Explique-moi surtout ce qui change dans ce tirage.",
      contextOptions: { yijing: {
        question: state.question,
        primaryHexagram: state.result.primary ? { number: state.result.primary.number, french: state.result.primary.french, pinyin: state.result.primary.pinyin, hanzi: state.result.primary.hanzi } : null,
        changingLines: state.result.changingLines,
        resultingHexagram: state.result.transformed ? { number: state.result.transformed.number, french: state.result.transformed.french, pinyin: state.result.transformed.pinyin, hanzi: state.result.transformed.hanzi } : null,
        semanticGuidance: { essential: guidance.essential, movement: guidance.movement, lineReadings: guidance.lineReadings },
      } },
    } }));
  }, { primary: true });
  deepen.classList.add("semantic-talk");
  wrap.append(deepen);
  return wrap;
}

function transformedLines(result) {
  return result.lines.map(({ changing, transformed, binary }) => ({ polarity: (changing ? transformed : binary) ? "yang" : "yin", changing: false, label: (changing ? transformed : binary) ? "Yang stable" : "Yin stable" }));
}

function saveCurrent() {
  const profile = getActiveProfile();
  const entry = saveYijingReading({
    id: state.savedId,
    question: state.question,
    lines: state.lines.map(({ value }) => value),
    primaryNumber: state.result.primary.number,
    changingLines: state.result.changingLines,
    transformedNumber: state.result.transformed?.number ?? null,
    guidance: state.guidance,
    profileId: profile?.id ?? null,
    profileName: profile?.firstName ?? null,
  });
  state.savedId = entry.id;
  render();
}

function resultView() {
  const fragment = document.createDocumentFragment();
  const heading = createTaoHero({ eyebrow: "Ce que montre votre tirage", title: state.guidance.essential[0], lead: "TAO commence par la dynamique utile à votre question.", context: state.question });
  fragment.append(heading, createSourceBadge("yijing", `Question : ${state.question}`), guidanceSection(state.guidance));
  const traditionalContent = element("div", { className: "product-disclosure__content yijing-traditional__content" });
  traditionalContent.append(hexagramCard(state.result.primary, state.result.lines, t("yijing.result.primary")));
  const mutations = element("section", { className: "product-card yijing-mutations" });
  mutations.append(sectionHeader(t("yijing.result.mutationsKicker"), t("yijing.result.mutations")));
  if (state.result.changingLines.length) {
    const list = element("ul");
    state.result.changingLines.forEach((line) => list.append(element("li", { text: t("yijing.result.mutationLine", { line, label: state.result.lines[line - 1].label }) })));
    mutations.append(list);
  } else mutations.append(element("p", { text: t("yijing.result.noMutation") }));
  traditionalContent.append(mutations);
  if (state.result.transformed) traditionalContent.append(hexagramCard(state.result.transformed, transformedLines(state.result), t("yijing.result.transformed")));
  const traditional = element("button", { className: "tao-quiet-action", text: "Voir le tirage traditionnel", attributes: { type: "button", "aria-haspopup": "dialog" } });
  traditional.addEventListener("click", () => openTaoSheet({ title: "Le tirage traditionnel", label: "Yi Jing", content: traditionalContent, opener: traditional }));
  fragment.append(traditional);
  const actions = element("section", { className: "surface-soft yijing-save" });
  actions.append(sectionHeader(t("yijing.save.kicker"), t("yijing.save.title"), t("yijing.save.help")));
  const row = element("div", { className: "product-actions" });
  row.append(button(state.savedId ? t("yijing.save.saved") : t("yijing.save.action"), saveCurrent, { primary: !state.savedId }), button(t("yijing.actions.newReading"), () => resetConsultation()));
  actions.append(row);
  fragment.append(actions);
  return fragment;
}

function openHistory(entry) {
  state.question = entry.question;
  state.lines = entry.lines.map((value) => ({ ...interpretLineValue(value), coins: [] }));
  state.result = resolveCasting(entry.lines);
  state.guidance = entry.guidance ?? createYijingGuidance({ question: state.question, result: state.result, profileContext: null });
  state.savedId = entry.id;
  state.phase = "result";
  const destination = appRoute("yijing", "consult");
  if (location.hash !== destination) location.hash = destination;
  else render();
  requestAnimationFrame(() => root.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function historySection() {
  const profile = getActiveProfile();
  const readings = getYijingHistory({ profileId: profile?.id });
  const section = markProductSection(element("section", { className: "product-section yijing-history" }), "yijing", "history");
  section.append(sectionHeader(t("yijing.history.kicker"), t("yijing.history.title"), t("yijing.history.help")));
  if (!readings.length) { section.append(element("p", { className: "empty-state", text: t("yijing.history.empty") })); return section; }
  const list = element("div", { className: "yijing-history__list" });
  for (const entry of readings) {
    const card = element("article", { className: "yijing-history__item" });
    const open = element("button", { className: "yijing-history__open", attributes: { type: "button" } });
    open.append(element("time", { text: formatDate(entry.createdAt.slice(0, 10)) }), element("strong", { text: entry.question }), element("span", { text: t("yijing.history.summary", { primary: entry.primaryNumber, transformed: entry.transformedNumber ? ` → ${entry.transformedNumber}` : "" }) }));
    open.addEventListener("click", () => openHistory(entry));
    const actions = element("div", { className: "product-actions" });
    actions.append(button(entry.favorite ? "★" : "☆", () => {
      toggleYijingFavorite(entry.id);
      render();
    }), button(t("yijing.history.delete"), () => {
      if (!window.confirm(t("yijing.history.confirmDelete"))) return;
      deleteYijingReading(entry.id);
      if (state.savedId === entry.id) state.savedId = null;
      render();
    }, { danger: true }));
    card.append(open, actions);
    list.append(card);
  }
  section.append(list);
  return section;
}

function learningSection() {
  const section = markProductSection(element("section", { className: "product-section yijing-learning" }), "yijing", "learn");
  section.append(sectionHeader("Bibliothèque", "Apprendre le Yi Jing", "Une lecture progressive : comprendre le geste avant d’approfondir les 64 figures."));
  const topics = [
    ["Yin et Yang", "Un trait plein représente le Yang ; un trait interrompu représente le Yin. Leur alternance décrit une dynamique, pas un verdict."],
    ["Les six traits", "L’hexagramme se construit du bas vers le haut. La première ligne tirée reste toujours la ligne inférieure."],
    ["Les traits mutants", "Le vieux Yin (6) devient Yang ; le vieux Yang (9) devient Yin. Les valeurs 7 et 8 restent stables."],
    ["Poser une question", "Privilégie une situation, une décision ou une manière d’agir plutôt qu’une demande fermée de type oui ou non."],
  ];
  const topicGrid = element("div", { className: "topic-grid" });
  topics.forEach(([title, copy]) => {
    const card = element("article", { className: "insight-card" });
    card.append(element("strong", { text: title }), element("p", { text: copy }));
    topicGrid.append(card);
  });
  const trigrams = element("details", { className: "product-disclosure" });
  trigrams.append(element("summary", { text: "Les huit trigrammes" }));
  const trigramGrid = element("div", { className: "knowledge-grid product-disclosure__content" });
  Object.values(TRIGRAMS).forEach((trigram) => {
    const card = element("article", { className: "knowledge-card" });
    card.append(element("span", { text: trigram.symbol }), element("strong", { text: trigram.french }), element("small", { text: `${trigram.pinyin} · ${trigram.hanzi}` }), element("p", { text: `${trigram.image} — ${trigram.quality}` }));
    trigramGrid.append(card);
  });
  trigrams.append(trigramGrid);
  const library = element("details", { className: "product-disclosure" });
  library.append(element("summary", { text: "Les 64 hexagrammes" }));
  const list = element("ol", { className: "hexagram-library product-disclosure__content" });
  HEXAGRAMS.forEach((hexagram) => {
    const item = element("li");
    item.append(element("strong", { text: `${hexagram.number}. ${hexagram.french}` }), element("small", { text: `${hexagram.pinyin} · ${hexagram.hanzi}` }));
    list.append(item);
  });
  library.append(list);
  section.append(topicGrid, trigrams, library);
  return section;
}

export function renderYijingView() {
  if (!root) return;
  const route = parseAppRoute(location.hash);
  const consult = markProductSection(element("section", { className: "product-depth-section" }), "yijing", "consult");
  if (state.phase === "question") consult.append(questionCard());
  if (state.phase === "confirm") consult.append(confirmationCard());
  if (state.phase === "casting") consult.append(castingCard());
  if (state.phase === "result") consult.append(resultView());
  root.replaceChildren(createPageHeader(), createSectionNavigation("yijing", YIJING_SECTIONS, "Explorer Yi Jing"), consult, historySection(), learningSection());
  showOnlyProductSection(root, route.section);
  focusRequestedSection(root, "yijing", route.section, { scroll: route.section !== "consult" });
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view !== "yijing") return;
  setTaoPose("TAO_POSE_05_YI_JING").catch(() => {});
  renderYijingView();
});
window.addEventListener("tao:profile-changed", () => { if (location.hash.startsWith("#yijing")) renderYijingView(); });
if (location.hash.startsWith("#yijing")) renderYijingView();
