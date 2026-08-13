import { respondWithTao } from "./tao-ai-client.js";
import { getTaoAISettings, setTaoAIEnabled } from "./tao-ai-memory.js";
import { applyTaoAIPresence } from "./tao-ai-presence.js";
import { getActiveProfile } from "./profile-store.js";

const host = document.querySelector(".tao-conversation");
const semanticDebug = new URLSearchParams(location.search).get("debug") === "semantics";
let session = [];
let requestContext = { mode: "conversation", contextOptions: {}, prompt: "" };
let busy = false;

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
  const panel = node("section", "tao-ai-panel");
  panel.hidden = true;
  panel.setAttribute("aria-label", "Conversation avec TAO");
  panel.innerHTML = `
    <header class="tao-ai-panel__header"><div><small>LE NEBULA</small><h2>Parler avec TAO</h2></div><button type="button" data-ai-close aria-label="Fermer la conversation">×</button></header>
    <div class="tao-ai-notice" data-ai-notice>
      <p>TAO peut utiliser Gemini pour ses conversations approfondies. Seules les informations utiles à la réponse sont envoyées au service d’IA de Google. Les calculs BaZi et Yi Jing restent locaux.</p>
      <details><summary>En savoir plus</summary><p>TAO envoie des résultats sémantiques minimisés, jamais tes coordonnées, ta date ou ton heure de naissance. Selon les conditions du service Gemini utilisé, Google peut traiter les contenus transmis. Tu peux désactiver cette fonction à tout moment ; toute l’application locale continue de fonctionner.</p></details>
      <button type="button" class="product-button product-button--primary" data-ai-enable>Activer la conversation</button>
    </div>
    <div class="tao-ai-session" data-ai-session hidden>
      <div class="tao-ai-messages" data-ai-messages role="log" aria-live="polite"></div>
      <div class="tao-ai-suggestions" data-ai-suggestions></div>
      <form class="tao-ai-form" data-ai-form>
        <label class="sr-only" for="tao-ai-input">Parler à TAO</label>
        <textarea id="tao-ai-input" data-ai-input rows="2" maxlength="2000" placeholder="Parler à TAO…" required></textarea>
        <button type="submit" data-ai-send aria-label="Envoyer à TAO">Envoyer</button>
      </form>
      <p class="tao-ai-status" data-ai-status role="status"></p>
      <button type="button" class="tao-ai-disable" data-ai-disable>Intelligence conversationnelle : activée</button>
    </div>
    <details class="tao-ai-debug" data-ai-debug hidden><summary>TAO AI DEBUG</summary><pre data-ai-debug-output></pre></details>`;
  host.append(launch, panel);
  return { launch, panel };
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
    ui.launch.hidden = true;
  } else if (ui.panel.hidden) {
    ui.launch.hidden = false;
  }
  return available;
}

function appendMessage(role, content, title = null) {
  const article = node("article", `tao-ai-message tao-ai-message--${role}`);
  if (title) article.append(node("strong", "tao-ai-message__title", title));
  for (const paragraph of String(content).split(/\n\s*\n/).filter(Boolean)) article.append(node("p", null, paragraph));
  messagesRoot.append(article);
  messagesRoot.scrollTop = messagesRoot.scrollHeight;
}

function renderSuggestions(items) {
  suggestionsRoot.replaceChildren();
  for (const suggestion of items) {
    const button = node("button", null, suggestion);
    button.type = "button";
    button.addEventListener("click", () => submitMessage(suggestion));
    suggestionsRoot.append(button);
  }
}

async function submitMessage(text) {
  const message = String(text ?? input.value).trim();
  if (!message || busy) return;
  busy = true;
  send.disabled = true;
  input.disabled = true;
  status.textContent = navigator.onLine ? "TAO prend un instant pour relier les faits…" : "La conversation approfondie demande une connexion.";
  appendMessage("user", message);
  const previous = [...session];
  session.push({ role: "user", content: message });
  input.value = "";
  renderSuggestions([]);
  await applyTaoAIPresence({ postureIntent: requestContext.mode === "yijing" ? "YI_JING" : "REFLECTION" }, "high", { force: true }).catch(() => undefined);
  try {
    const response = await respondWithTao({
      mode: requestContext.mode,
      message,
      messages: previous,
      contextOptions: requestContext.contextOptions,
      useDailyCache: requestContext.mode === "daily_synthesis",
    });
    session.push({ role: "assistant", content: response.speech });
    appendMessage("assistant", response.speech, response.title);
    renderSuggestions(response.suggestions);
    status.textContent = response.meta.cacheHit ? "Synthèse quotidienne retrouvée dans la mémoire locale." : "";
    await applyTaoAIPresence(response.presence, response.confidence).catch(() => undefined);
  } catch (error) {
    session.pop();
    appendMessage("system", error.message ?? "TAO reste silencieuse un instant.");
    status.textContent = "Ta guidance déterministe reste disponible.";
  } finally {
    busy = false;
    send.disabled = false;
    input.disabled = false;
    input.focus({ preventScroll: true });
  }
}

function openPanel(detail = {}) {
  if (!syncAvailability()) return;
  const nextMode = detail.mode ?? "conversation";
  if (nextMode !== requestContext.mode) {
    session = [];
    messagesRoot.replaceChildren();
    renderSuggestions([]);
  }
  requestContext = { mode: nextMode, contextOptions: detail.contextOptions ?? {}, prompt: detail.prompt ?? "" };
  if (document.body.dataset.currentView !== "pavilion") location.hash = "#pavilion/tao";
  ui.panel.hidden = false;
  ui.launch.hidden = true;
  ui.launch.setAttribute("aria-expanded", "true");
  syncEnabledState();
  if (requestContext.prompt) input.value = requestContext.prompt;
  window.setTimeout(() => {
    ui.panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (detail.autoSend && syncEnabledState()) submitMessage(requestContext.prompt);
    else (syncEnabledState() ? input : ui.panel.querySelector("[data-ai-enable]")).focus({ preventScroll: true });
  }, 80);
}

function closePanel() {
  ui.panel.hidden = true;
  ui.launch.hidden = false;
  ui.launch.setAttribute("aria-expanded", "false");
  ui.launch.focus({ preventScroll: true });
}

ui.launch.addEventListener("click", () => openPanel());
ui.panel.querySelector("[data-ai-close]").addEventListener("click", closePanel);
ui.panel.querySelector("[data-ai-enable]").addEventListener("click", () => { setTaoAIEnabled(true); syncEnabledState(); input.focus(); });
ui.panel.querySelector("[data-ai-disable]").addEventListener("click", () => { setTaoAIEnabled(false); session = []; messagesRoot.replaceChildren(); syncEnabledState(); });
form.addEventListener("submit", (event) => { event.preventDefault(); submitMessage(); });
input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
window.addEventListener("tao:ai-open", (event) => openPanel(event.detail));
window.addEventListener("tao:profile-created", syncAvailability);
window.addEventListener("tao:profile-changed", () => { session = []; messagesRoot.replaceChildren(); syncAvailability(); });
window.addEventListener("tao:ai-debug", (event) => {
  if (!semanticDebug) return;
  debugRoot.hidden = false;
  debugOutput.textContent = JSON.stringify(event.detail, null, 2);
});

syncEnabledState();
syncAvailability();
