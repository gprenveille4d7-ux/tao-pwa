import { getTaoAIEndpoint, isTaoAIMockEnabled, TAO_AI_PUBLIC_CONFIG } from "./tao-ai-config.js";
import { buildTaoAIContext, getContextFactIds } from "./tao-ai-context.mjs";
import { createTaoAICacheKey, getCachedTaoAI, setCachedTaoAI } from "./tao-ai-cache.mjs";
import { getTaoAISettings, rememberExplicitly, trimSessionMessages, updateTaoAIContinuity } from "./tao-ai-memory.js";
import { validateTaoAIResponse } from "./shared/tao-ai-contract.mjs";

export class TaoAIError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TaoAIError";
    this.code = code;
    this.details = details;
  }
}

const debug = { enabled: false, provider: "Gemini", model: null, mode: null, contextSize: 0, factsSent: [], factIdsUsed: [], cacheHit: false, latency: null, fallbackUsed: false, error: null };

function publishDebug(update) {
  Object.assign(debug, update, { enabled: getTaoAISettings().enabled });
  window.dispatchEvent(new CustomEvent("tao:ai-debug", { detail: Object.freeze({ ...debug }) }));
}

function mockResponse(context, message) {
  const relation = context.today.dominantFacts.find(({ id }) => id === "fact_today_relation");
  const isYijing = context.mode === "yijing";
  const isFamily = context.mode === "family_constellation";
  return {
    title: isYijing ? "Regarder ce qui se transforme" : isFamily ? "Observer sans fabriquer" : "Un moment pour relier les signes",
    speech: isYijing
      ? "Ce tirage reste d’abord une invitation à observer la situation que tu as formulée. Les traits en mouvement indiquent où la dynamique se transforme ; je m’appuie ici sur le tirage déjà établi par le Yi Jing de TAO, sans le recalculer."
      : isFamily
        ? "Les correspondances que tu vois ont déjà été calculées par le moteur local de TAO. Je peux t’aider à comprendre pourquoi les plus simples ressortent, sans leur attribuer une causalité ou un pouvoir sur votre histoire."
      : `${relation?.label ?? "La dynamique du jour demande un peu d’attention."} Je peux t’aider à relier cette lecture à ta question, tout en restant fidèle aux faits calculés par TAO.`,
    supportingFactIds: isYijing ? [] : ["fact_today_relation", "fact_daymaster"],
    confidence: "medium",
    suggestions: ["Pourquoi ?", "Qu’est-ce qui peut m’aider ?"],
    presence: { mood: "ATTENTIVE", postureIntent: isYijing ? "YI_JING" : "OBSERVATION", deskFocus: isYijing ? "OBJET_YI_JING_PIECES" : "NONE", lookAtWindow: false },
    memoryCandidates: [],
  };
}

function userFacingError(error) {
  if (!navigator.onLine) return new TaoAIError("OFFLINE", "La conversation approfondie demande une connexion.");
  if (error instanceof TaoAIError) return error;
  if (error?.name === "AbortError") return new TaoAIError("TIMEOUT", "TAO reste silencieuse un instant. La conversation approfondie n’est pas disponible pour le moment.");
  return new TaoAIError("UNAVAILABLE", "TAO reste silencieuse un instant. Ta guidance locale reste accessible.");
}

async function callWorker(payload) {
  const endpoint = getTaoAIEndpoint();
  if (!endpoint) throw new TaoAIError("NOT_CONFIGURED", "La conversation approfondie n’est pas encore reliée au cerveau de TAO.");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch(`${endpoint}/v1/tao/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new TaoAIError(body.error?.code ?? `HTTP_${response.status}`, body.error?.message ?? "Service IA indisponible.", { status: response.status });
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function respondWithTao({ mode = "conversation", message, messages = [], contextOptions = {}, useDailyCache = false }) {
  const settings = getTaoAISettings();
  if (!settings.enabled && !isTaoAIMockEnabled()) throw new TaoAIError("DISABLED", "Active d’abord l’intelligence conversationnelle de TAO.");
  const context = buildTaoAIContext(mode, contextOptions);
  const safeMessages = trimSessionMessages([...messages, { role: "user", content: message }]);
  const factIds = getContextFactIds(context);
  const cacheKey = useDailyCache ? createTaoAICacheKey({ profileId: context.profile.profileId, localDate: context.moment.localDate, facts: context.today.dominantFacts, promptVersion: TAO_AI_PUBLIC_CONFIG.promptVersion, modelVersion: TAO_AI_PUBLIC_CONFIG.providerVersion }) : null;
  const cached = cacheKey ? getCachedTaoAI(cacheKey) : null;
  if (cached) {
    publishDebug({ mode, contextSize: JSON.stringify(context).length, factsSent: factIds, factIdsUsed: cached.response.supportingFactIds, cacheHit: true, latency: 0, model: cached.model, fallbackUsed: cached.fallbackUsed, error: null });
    return Object.freeze({ ...cached.response, meta: Object.freeze({ cacheHit: true, model: cached.model, fallbackUsed: cached.fallbackUsed }) });
  }

  const startedAt = performance.now();
  publishDebug({ mode, contextSize: JSON.stringify(context).length, factsSent: factIds, factIdsUsed: [], cacheHit: false, latency: null, error: null });
  try {
    const body = isTaoAIMockEnabled()
      ? { response: mockResponse(context, message), meta: { model: "tao-dev-mock", fallbackUsed: false, requestId: "mock" } }
      : await callWorker({ mode, context, messages: safeMessages });
    const validated = validateTaoAIResponse(body.response, factIds);
    const result = Object.freeze({ ...validated, meta: Object.freeze({ cacheHit: false, model: body.meta?.model ?? null, fallbackUsed: Boolean(body.meta?.fallbackUsed), requestId: body.meta?.requestId ?? null }) });
    if (cacheKey) setCachedTaoAI(cacheKey, { response: validated, model: result.meta.model, fallbackUsed: result.meta.fallbackUsed });
    const explicitMemory = /^souviens-toi(?:\s+que|\s+de)?\s+(.+)/i.exec(message);
    if (explicitMemory?.[1]) rememberExplicitly(context.profile.profileId, explicitMemory[1]);
    updateTaoAIContinuity(context.profile.profileId, {
      recentTopics: [mode],
      recentConversationSummary: validated.title ? `TAO a abordé : ${validated.title}` : `Conversation TAO en mode ${mode}.`,
    });
    publishDebug({ model: result.meta.model, factIdsUsed: validated.supportingFactIds, latency: Math.round(performance.now() - startedAt), fallbackUsed: result.meta.fallbackUsed, error: null });
    return result;
  } catch (error) {
    const safeError = userFacingError(error);
    publishDebug({ latency: Math.round(performance.now() - startedAt), error: safeError.code });
    throw safeError;
  }
}

export function getTaoAIDebugSnapshot() {
  return Object.freeze({ ...debug });
}
