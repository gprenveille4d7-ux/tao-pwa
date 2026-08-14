import { respondWithTao } from "./tao-ai-client.js";
import { getTaoAISettings, setTaoAIEnabled } from "./tao-ai-memory.js";
import { applyTaoAIPresence } from "./tao-ai-presence.js";
import { getActiveProfile } from "./profile-store.js";
import { parseSafeMarkdown, shortenConversationSuggestion } from "./tao-conversation-format.mjs";

const host = document.querySelector(".tao-conversation");
const semanticDebug = new URLSearchParams(location.search).get("debug") === "semantics";
const mobileConversation = window.matchMedia("(max-width: 600px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let session = [];
let requestContext = { mode: "conversation", contextOptions: {}, prompt: "" };
let busy = false;
let scrollSnapshot = null;
let focusBeforeOpen = null;
let closingTimer = null;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createInterface() {
  const launch = node("button", "tao-ai-launch", "Parler avec TAO");
  launch.type = "button";
  launch.setAttribute("aria-expanded", "false");
  const backdrop = node("div", "tao-ai-backdrop");
  backdrop.hidden = true;
  const panel = node("section", "tao-ai-panel");
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Conversation avec TAO");
  panel.innerHTML = `
    <header class="tao-ai-panel__header">
      <div><h2>TAO</h2><p>Pavillon des Étoiles</p></div>
      <button type="button" data-ai-close aria-label="Fermer la conversation">×</button>
    </header>
    <div class="tao-ai-notice" data-ai-notice>
      <p>TAO peut utiliser Gemini pour ses conversations approfondies. Seules les informations utiles à la réponse sont envoyées au service d’IA de Google. Les calculs BaZi et Yi Jing restent locaux.</p>
      <details><summary>En savoir plus</summary><p>TAO envoie des résultats sémantiques minimisés, jamais tes coordonnées, ta date ou ton heure de naissance. Selon les conditions du service Gemini utilisé, Google peut traiter les contenus transmis. Tu peux désactiver cette fonction dans les réglages ; toute l’application locale continue de fonctionner.</p></details>
      <button type="button" class="product-button product-button--primary" data-ai-enable>Activer la conversation</button>
    </div>
    <div class="tao-ai-session" data-ai-session hidden>
      <div class="tao-ai-messages" data-ai-messages role="log" aria-live="polite" aria-label="Conversation avec TAO"></div>
      <div class="tao-ai-dock">
        <div class="tao-ai-suggestions" data-ai-suggestions aria-label="Suggestions de conversation"></div>
        <form class="tao-ai-form" data-ai-form>
          <label class="sr-only" for="tao-ai-input">Écrire à TAO</label>
          <textarea id="tao-ai-input" data-ai-input rows="1" maxlength="2000" placeholder="Demander quelque chose à TAO…" required></textarea>
          <button type="submit" data-ai-send aria-label="Envoyer le message" disabled><span aria-hidden="true">↑</span></button>
        </form>
        <p class="tao-ai-status" data-ai-status role="status"></p>
      </div>
    </div>
    <details class="tao-ai-debug" data-ai-debug hidden><summary>TAO AI DEBUG</summary><pre data-ai-debug-output></pre></details>`;
  host.append(launch);
  document.body.append(backdrop, panel);
  return { launch, backdrop, panel };
}

const ui = createInterface();
const notice = ui.panel.querySelector("[data-ai-notice]");
const sessionRoot = ui.panel.querySelector("[data-ai-session]");
const messagesRoot = ui.panel.querySelector("[data-ai-messages]");
const suggestionsRoot = ui.panel.querySelector("[data-ai-suggestions]");
const form = ui.panel.querySelector("[data-ai-form]");
const input = ui.panel.querySelector("[data-ai-input]");
const send = ui.panel.querySelector("[data-ai-send]");
const status = ui.panel.querySelector("[data-ai-status]");
const debugRoot = ui.panel.querySelector("[data-ai-debug]");
const debugOutput = ui.panel.querySelector("[data-ai-debug-output]");

function getPavilionScroller() {
  return document.querySelector(".pavilion-screen");
}

function rememberScrollPosition() {
  const pavilionScroller = getPavilionScroller();
  scrollSnapshot = {
    windowX: window.scrollX,
    windowY: window.scrollY,
    pavilionScroller,
    pavilionTop: pavilionScroller?.scrollTop ?? 0,
    pavilionLeft: pavilionScroller?.scrollLeft ?? 0,
  };
}

function restoreScrollPosition() {
  const snapshot = scrollSnapshot;
  scrollSnapshot = null;
  if (!snapshot) return;
  window.requestAnimationFrame(() => {
    if (snapshot.pavilionScroller?.isConnected) {
      snapshot.pavilionScroller.scrollTop = snapshot.pavilionTop;
      snapshot.pavilionScroller.scrollLeft = snapshot.pavilionLeft;
    }
    window.scrollTo(snapshot.windowX, snapshot.windowY);
  });
}

function syncConversationViewport() {
  if (ui.panel.hidden || !mobileConversation.matches) return;
  const viewport = window.visualViewport;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportBottomGap = Math.max(0, window.innerHeight - viewportTop - viewportHeight);
  const keyboardOpen = viewportHeight < window.innerHeight - 120;
  ui.panel.style.setProperty("--tao-ai-visual-height", `${viewportHeight}px`);
  ui.panel.style.setProperty("--tao-ai-visual-top", `${viewportTop}px`);
  ui.panel.style.setProperty("--tao-ai-visual-bottom-gap", `${viewportBottomGap}px`);
  document.body.classList.toggle("tao-ai-keyboard-open", keyboardOpen);
}

function clearConversationViewport() {
  ui.panel.style.removeProperty("--tao-ai-visual-height");
  ui.panel.style.removeProperty("--tao-ai-visual-top");
  ui.panel.style.removeProperty("--tao-ai-visual-bottom-gap");
  document.body.classList.remove("tao-ai-keyboard-open");
}

function syncEnabledState() {
  const enabled = getTaoAISettings().enabled;
  notice.hidden = enabled;
  sessionRoot.hidden = !enabled;
  return enabled;
}

function syncAvailability() {
  const available = Boolean(getActiveProfile());
  if (!available) {
    ui.panel.hidden = true;
    ui.backdrop.hidden = true;
    ui.launch.hidden = true;
  } else if (ui.panel.hidden) ui.launch.hidden = false;
  return available;
}

function appendInlineTokens(parent, tokens) {
  for (const token of tokens) {
    const child = token.type === "strong"
      ? document.createElement("strong")
      : token.type === "emphasis"
        ? document.createElement("em")
        : null;
    if (child) {
      child.textContent = token.value;
      parent.append(child);
    } else parent.append(document.createTextNode(token.value));
  }
}

function renderMarkdown(content) {
  const root = node("div", "tao-ai-message__content");
  for (const block of parseSafeMarkdown(content)) {
    if (block.type === "list") {
      const list = document.createElement("ul");
      for (const item of block.items) {
        const listItem = document.createElement("li");
        appendInlineTokens(listItem, item);
        list.append(listItem);
      }
      root.append(list);
    } else {
      const paragraph = document.createElement("p");
      block.lines.forEach((line, index) => {
        if (index) paragraph.append(document.createElement("br"));
        appendInlineTokens(paragraph, line);
      });
      root.append(paragraph);
    }
  }
  return root;
}

function isNearConversationBottom() {
  return messagesRoot.scrollHeight - messagesRoot.scrollTop - messagesRoot.clientHeight < 120;
}

function scrollConversationToBottom() {
  messagesRoot.scrollTop = messagesRoot.scrollHeight;
}

function appendMessage(role, content, title = null) {
  const keepAtBottom = role === "user" || isNearConversationBottom();
  const article = node("article", `tao-ai-message tao-ai-message--${role}`);
  const author = role === "user" ? "Moi" : role === "assistant" ? "TAO" : "Information";
  article.setAttribute("aria-label", author);
  article.append(node("span", "tao-ai-message__author", author));
  if (title) article.append(node("h3", "tao-ai-message__title", title));
  article.append(renderMarkdown(content));
  messagesRoot.append(article);
  if (keepAtBottom) window.requestAnimationFrame(scrollConversationToBottom);
  return article;
}

function renderSuggestions(items) {
  suggestionsRoot.replaceChildren();
  for (const suggestion of items.slice(0, 3)) {
    const button = node("button", null, shortenConversationSuggestion(suggestion));
    button.type = "button";
    button.title = suggestion;
    button.setAttribute("aria-label", suggestion);
    button.addEventListener("click", () => submitMessage(suggestion));
    suggestionsRoot.append(button);
  }
}

function renderWelcome() {
  if (messagesRoot.childElementCount) return;
  const salutation = new Date().getHours() >= 18 ? "Bonsoir." : "Bonjour.";
  appendMessage("assistant", `${salutation}\nQue souhaites-tu regarder ensemble ?`);
  renderSuggestions(["Ma journée", "Mon thème", "Une question"]);
}

function resizeComposer() {
  input.style.height = "auto";
  const nextHeight = Math.min(input.scrollHeight, 132);
  input.style.height = `${Math.max(50, nextHeight)}px`;
  input.style.overflowY = input.scrollHeight > 132 ? "auto" : "hidden";
}

function syncComposerState() {
  const offline = !navigator.onLine;
  input.disabled = busy || offline;
  send.disabled = busy || offline || !input.value.trim();
  send.classList.toggle("is-loading", busy);
  if (offline) status.textContent = "La conversation demande une connexion.";
  else if (status.textContent === "La conversation demande une connexion.") status.textContent = "";
}

function showThinking() {
  const thinking = node("div", "tao-ai-thinking");
  thinking.setAttribute("role", "status");
  thinking.innerHTML = `<span>TAO réfléchit</span><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>`;
  messagesRoot.append(thinking);
  window.requestAnimationFrame(scrollConversationToBottom);
  return () => thinking.remove();
}

async function submitMessage(text) {
  const message = String(text ?? input.value).trim();
  if (!message || busy || !navigator.onLine) return;
  busy = true;
  status.textContent = "";
  syncComposerState();
  appendMessage("user", message);
  const previous = [...session];
  session.push({ role: "user", content: message });
  input.value = "";
  resizeComposer();
  renderSuggestions([]);
  const hideThinking = showThinking();
  await applyTaoAIPresence({ postureIntent: requestContext.mode === "yijing" ? "YI_JING" : "REFLECTION" }, "high", { force: true }).catch(() => undefined);
  try {
    const response = await respondWithTao({
      mode: requestContext.mode,
      message,
      messages: previous,
      contextOptions: requestContext.contextOptions,
      useDailyCache: requestContext.mode === "daily_synthesis",
    });
    hideThinking();
    session.push({ role: "assistant", content: response.speech });
    appendMessage("assistant", response.speech, response.title);
    renderSuggestions(response.suggestions);
    status.textContent = response.meta.cacheHit ? "Réponse retrouvée dans la mémoire locale." : "";
    await applyTaoAIPresence(response.presence, response.confidence).catch(() => undefined);
  } catch (error) {
    hideThinking();
    session.pop();
    appendMessage("system", error.message ?? "TAO reste silencieuse un instant.");
    status.textContent = "Ta guidance locale reste disponible.";
  } finally {
    busy = false;
    syncComposerState();
    if (!input.disabled) input.focus({ preventScroll: true });
  }
}

function openPanel(detail = {}) {
  if (!syncAvailability()) return;
  if (ui.panel.hidden) {
    rememberScrollPosition();
    focusBeforeOpen = document.activeElement;
  }
  const nextMode = detail.mode ?? "conversation";
  if (nextMode !== requestContext.mode) {
    session = [];
    messagesRoot.replaceChildren();
    renderSuggestions([]);
  }
  requestContext = { mode: nextMode, contextOptions: detail.contextOptions ?? {}, prompt: detail.prompt ?? "" };
  if (document.body.dataset.currentView !== "pavilion") location.hash = "#pavilion/tao";
  window.clearTimeout(closingTimer);
  ui.backdrop.hidden = false;
  ui.panel.hidden = false;
  ui.launch.hidden = true;
  ui.launch.setAttribute("aria-expanded", "true");
  document.body.classList.add("tao-ai-panel-open");
  window.requestAnimationFrame(() => {
    ui.backdrop.classList.add("is-open");
    ui.panel.classList.add("is-open");
  });
  syncConversationViewport();
  const enabled = syncEnabledState();
  if (requestContext.prompt) input.value = requestContext.prompt;
  if (enabled) renderWelcome();
  resizeComposer();
  syncComposerState();
  window.setTimeout(() => {
    syncConversationViewport();
    if (detail.autoSend && syncEnabledState()) submitMessage(requestContext.prompt);
    else (syncEnabledState() ? input : ui.panel.querySelector("[data-ai-enable]")).focus({ preventScroll: true });
  }, 80);
}

function finishClosingPanel() {
  ui.panel.hidden = true;
  ui.backdrop.hidden = true;
  ui.launch.hidden = false;
  document.body.classList.remove("tao-ai-panel-open");
  clearConversationViewport();
  restoreScrollPosition();
  const focusTarget = focusBeforeOpen?.isConnected ? focusBeforeOpen : ui.launch;
  focusBeforeOpen = null;
  focusTarget.focus?.({ preventScroll: true });
}

function closePanel() {
  if (ui.panel.hidden) return;
  ui.panel.classList.remove("is-open");
  ui.backdrop.classList.remove("is-open");
  ui.launch.setAttribute("aria-expanded", "false");
  window.clearTimeout(closingTimer);
  closingTimer = window.setTimeout(finishClosingPanel, reducedMotion.matches ? 0 : 280);
}

function trapPanelFocus(event) {
  if (ui.panel.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...ui.panel.querySelectorAll('button:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.closest("[hidden]"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

ui.launch.addEventListener("click", () => openPanel());
ui.backdrop.addEventListener("click", closePanel);
ui.panel.querySelector("[data-ai-close]").addEventListener("click", closePanel);
ui.panel.querySelector("[data-ai-enable]").addEventListener("click", () => {
  setTaoAIEnabled(true);
  syncEnabledState();
  renderWelcome();
  syncComposerState();
  input.focus({ preventScroll: true });
});
form.addEventListener("submit", (event) => { event.preventDefault(); submitMessage(); });
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
input.addEventListener("input", () => { resizeComposer(); syncComposerState(); });
document.addEventListener("keydown", trapPanelFocus);
window.visualViewport?.addEventListener("resize", syncConversationViewport);
window.visualViewport?.addEventListener("scroll", syncConversationViewport);
window.addEventListener("resize", syncConversationViewport);
window.addEventListener("online", syncComposerState);
window.addEventListener("offline", syncComposerState);
window.addEventListener("tao:ai-open", (event) => openPanel(event.detail));
window.addEventListener("tao:profile-created", syncAvailability);
window.addEventListener("tao:profile-changed", () => {
  session = [];
  messagesRoot.replaceChildren();
  syncAvailability();
});
window.addEventListener("tao:ai-debug", (event) => {
  if (!semanticDebug) return;
  debugRoot.hidden = false;
  debugOutput.textContent = JSON.stringify(event.detail, null, 2);
});

syncEnabledState();
syncAvailability();
