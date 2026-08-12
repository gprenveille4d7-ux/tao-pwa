import { getActiveProfile } from "./profile-store.js";
import { calculateBazi } from "./bazi-engine.mjs";
import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { element } from "./tao-ui.js";
import { formatDate, getConcept, t } from "./locales/index.js";
import { setTaoPose } from "./tao-character.js";
import { TRIGRAMS } from "./yijing-data.mjs";
import { castThreeCoins, createCasting, interpretLineValue, resolveCasting } from "./yijing-engine.mjs";
import { createYijingGuidance } from "./yijing-guidance.mjs";
import { deleteYijingReading, getYijingHistory, saveYijingReading } from "./yijing-history.js";

const root = document.querySelector("[data-yijing-root]");
const state = { phase: "question", question: "", lines: [], result: null, guidance: null, savedId: null };

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
  const header = element("header", { className: "product-header yijing-header" });
  header.append(
    element("p", { className: "product-eyebrow", text: t("yijing.page.eyebrow") }),
    element("h1", { text: t("yijing.page.title") }),
    element("p", { className: "product-lead", text: t("yijing.page.intro") }),
    element("p", { className: "symbolic-note", text: t("yijing.page.notice") }),
  );
  return header;
}

function questionCard() {
  const card = element("section", { className: "product-card yijing-question" });
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
  const card = element("section", { className: "product-card yijing-confirmation" });
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
  const card = element("section", { className: "product-card yijing-casting" });
  card.append(sectionHeader(t("yijing.casting.kicker"), t("yijing.casting.title"), t("yijing.casting.help")));
  card.append(element("p", { className: "yijing-question-reminder", text: state.question }), lineDiagram(state.lines));
  if (state.lines.length) card.append(coinResult(state.lines.at(-1)));
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
  const definitions = [
    ["essential", t("yijing.guidance.essential"), guidance.essential],
    ["movement", t("yijing.guidance.movement"), [guidance.movement]],
    ["supports", t("yijing.guidance.supports"), guidance.supports],
    ["cautions", t("yijing.guidance.cautions"), guidance.cautions],
    ["actions", t("yijing.guidance.actions"), guidance.actions],
  ];
  for (const [id, title, paragraphs] of definitions) {
    const card = element("article", { className: `product-card yijing-guidance__card yijing-guidance__card--${id}` });
    card.append(element("h3", { text: title }));
    if (["supports", "cautions", "actions"].includes(id)) {
      const list = element("ul");
      paragraphs.forEach((text) => list.append(element("li", { text })));
      card.append(list);
    } else paragraphs.forEach((text) => card.append(element("p", { text })));
    wrap.append(card);
  }
  if (guidance.lineReadings.length) {
    const card = element("article", { className: "product-card yijing-guidance__card" });
    card.append(element("h3", { text: t("yijing.guidance.changingLines") }));
    for (const line of guidance.lineReadings) card.append(element("h4", { text: `${t("yijing.lines.line", { line: line.line })} · ${line.title}` }), element("p", { text: line.text }));
    wrap.append(card);
  }
  const rhythm = element("article", { className: "product-card yijing-guidance__card yijing-guidance__card--rhythm" });
  rhythm.append(element("h3", { text: t("yijing.guidance.rhythm") }), element("p", { text: guidance.rhythm }), element("h3", { text: t("yijing.guidance.reflection") }), element("blockquote", { text: guidance.reflection }));
  wrap.append(rhythm);
  if (guidance.profile) {
    const profile = element("article", { className: "product-card yijing-guidance__card" });
    profile.append(element("h3", { text: guidance.profile.title }), element("p", { text: guidance.profile.text }));
    wrap.append(profile);
  }
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
  const heading = element("section", { className: "product-card yijing-result-heading" });
  heading.append(sectionHeader(t("yijing.result.kicker"), t("yijing.result.title")), element("blockquote", { text: state.question }));
  fragment.append(heading, hexagramCard(state.result.primary, state.result.lines, t("yijing.result.primary")));
  const mutations = element("section", { className: "product-card yijing-mutations" });
  mutations.append(sectionHeader(t("yijing.result.mutationsKicker"), t("yijing.result.mutations")));
  if (state.result.changingLines.length) {
    const list = element("ul");
    state.result.changingLines.forEach((line) => list.append(element("li", { text: t("yijing.result.mutationLine", { line, label: state.result.lines[line - 1].label }) })));
    mutations.append(list);
  } else mutations.append(element("p", { text: t("yijing.result.noMutation") }));
  fragment.append(mutations);
  if (state.result.transformed) fragment.append(hexagramCard(state.result.transformed, transformedLines(state.result), t("yijing.result.transformed")));
  fragment.append(guidanceSection(state.guidance));
  const actions = element("section", { className: "product-card yijing-save" });
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
  render();
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

function historySection() {
  const profile = getActiveProfile();
  const readings = getYijingHistory({ profileId: profile?.id });
  const section = element("section", { className: "product-section yijing-history" });
  section.append(sectionHeader(t("yijing.history.kicker"), t("yijing.history.title"), t("yijing.history.help")));
  if (!readings.length) { section.append(element("p", { className: "empty-state", text: t("yijing.history.empty") })); return section; }
  const list = element("div", { className: "yijing-history__list" });
  for (const entry of readings) {
    const card = element("article", { className: "product-card yijing-history__item" });
    card.append(element("p", { className: "product-eyebrow", text: formatDate(entry.createdAt.slice(0, 10)) }), element("h3", { text: entry.question }), element("p", { text: t("yijing.history.summary", { primary: entry.primaryNumber, transformed: entry.transformedNumber ? ` → ${entry.transformedNumber}` : "" }) }));
    const actions = element("div", { className: "product-actions" });
    actions.append(button(t("yijing.history.open"), () => openHistory(entry)), button(t("yijing.history.delete"), () => {
      if (!window.confirm(t("yijing.history.confirmDelete"))) return;
      deleteYijingReading(entry.id);
      if (state.savedId === entry.id) state.savedId = null;
      render();
    }, { danger: true }));
    card.append(actions);
    list.append(card);
  }
  section.append(list);
  return section;
}

export function renderYijingView() {
  if (!root) return;
  const content = [createPageHeader()];
  if (state.phase === "question") content.push(questionCard());
  if (state.phase === "confirm") content.push(confirmationCard());
  if (state.phase === "casting") content.push(castingCard());
  if (state.phase === "result") content.push(resultView());
  content.push(historySection());
  root.replaceChildren(...content);
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view !== "yijing") return;
  setTaoPose("TAO_POSE_05_YI_JING").catch(() => {});
  renderYijingView();
});
window.addEventListener("tao:profile-changed", () => { if (location.hash === "#yijing") renderYijingView(); });
if (location.hash === "#yijing") renderYijingView();
