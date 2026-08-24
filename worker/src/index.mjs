import { validateTaoAIResponse } from "../../shared/tao-ai-contract.mjs";
import { callCloudflareAI, CLOUDFLARE_FALLBACK_MODEL, CLOUDFLARE_PRIMARY_MODEL } from "./cloudflare-provider.mjs";
import { callGemini } from "./gemini-provider.mjs";
import { MAX_BODY_BYTES, clientKey, validateRequestPayload } from "./validation.mjs";

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const GEMINI_RETRYABLE = new Set([404, 408, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set(["MODEL_NOT_FOUND", "UNAVAILABLE", "INVALID_MODEL_JSON", "EMPTY_MODEL_RESPONSE"]);

function allowedOrigins(env) { return new Set(String(env.TAO_ALLOWED_ORIGIN ?? "https://gprenveille4d7-ux.github.io").split(",").map((v) => v.trim()).filter(Boolean)); }
function corsOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (allowedOrigins(env).has(origin)) return origin;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname);
  if (((env.TAO_ENVIRONMENT ?? "production") !== "production" || local) && LOCAL_ORIGIN.test(origin)) return origin;
  return false;
}
function headers(origin, extra = {}) {
  const cors = origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } : {};
  return { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cors, ...extra };
}
function json(body, status, origin, extra) { return new Response(JSON.stringify(body), { status, headers: headers(origin, extra) }); }
function quotaFailure(error) { return error?.status === 429 || error?.code === "RESOURCE_EXHAUSTED"; }
function geminiSecondaryAllowed(error) { return !quotaFailure(error) && (GEMINI_RETRYABLE.has(error?.status) || RETRYABLE_CODES.has(error?.code)); }
function safeAttempt(provider, model, level, state, error = null) {
  state.attempts.push({ provider, model, level, status: error ? "error" : "ok", code: error?.code ?? null, httpStatus: error?.status ?? null });
}
function validateCandidate(generated, payload, provider, model) {
  try {
    const ids = payload.context.today.dominantFacts.map(({ id }) => id);
    return { response: validateTaoAIResponse(generated.response, ids), usage: generated.usage ?? null };
  } catch (cause) {
    throw Object.assign(new Error("Réponse modèle invalide."), { code: "INVALID_MODEL_JSON", status: 502, provider, model, cause });
  }
}
async function attempt({ provider, model, level, call, payload, state }) {
  try {
    const value = validateCandidate(await call(), payload, provider, model);
    safeAttempt(provider, model, level, state);
    return { ...value, provider, model, fallbackLevel: level };
  } catch (error) {
    error.provider ??= provider; error.model ??= model;
    safeAttempt(provider, model, level, state, error);
    throw error;
  }
}
async function generateWithFallback(payload, env, fetcher, state) {
  const promptVersion = env.TAO_PROMPT_VERSION ?? "tao-brain-v1";
  const geminiPrimary = env.TAO_GEMINI_MODEL ?? "gemini-3.6-flash";
  const geminiSecondary = env.TAO_GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
  const cloudflarePrimary = env.TAO_CLOUDFLARE_MODEL ?? CLOUDFLARE_PRIMARY_MODEL;
  const cloudflareFallback = env.TAO_CLOUDFLARE_FALLBACK_MODEL ?? CLOUDFLARE_FALLBACK_MODEL;
  let lastError;
  if (env.GEMINI_API_KEY) {
    try { return await attempt({ provider: "gemini", model: geminiPrimary, level: 0, payload, state, call: () => callGemini({ apiKey: env.GEMINI_API_KEY, model: geminiPrimary, promptVersion, payload, fetcher }) }); }
    catch (error) {
      lastError = error;
      if (geminiSecondary && geminiSecondary !== geminiPrimary && geminiSecondaryAllowed(error)) {
        try { return await attempt({ provider: "gemini", model: geminiSecondary, level: 1, payload, state, call: () => callGemini({ apiKey: env.GEMINI_API_KEY, model: geminiSecondary, promptVersion, payload, fetcher }) }); }
        catch (secondaryError) { lastError = secondaryError; }
      }
    }
  } else state.attempts.push({ provider: "gemini", model: geminiPrimary, level: 0, status: "skipped", code: "NOT_CONFIGURED", httpStatus: null });

  if (env.AI?.run) {
    try { return await attempt({ provider: "cloudflare-workers-ai", model: cloudflarePrimary, level: 2, payload, state, call: () => callCloudflareAI({ ai: env.AI, model: cloudflarePrimary, promptVersion, payload }) }); }
    catch (error) { lastError = error; }
    try { return await attempt({ provider: "cloudflare-workers-ai", model: cloudflareFallback, level: 3, payload, state, call: () => callCloudflareAI({ ai: env.AI, model: cloudflareFallback, promptVersion, payload }) }); }
    catch (error) { lastError = error; }
  } else state.attempts.push({ provider: "cloudflare-workers-ai", model: cloudflarePrimary, level: 2, status: "skipped", code: "NOT_CONFIGURED", httpStatus: null });
  throw lastError ?? Object.assign(new Error("Aucun fournisseur IA configuré."), { code: "NOT_CONFIGURED", status: 503 });
}
function publicError(error) {
  if (error?.name === "AbortError") return { status: 504, code: "TIMEOUT", message: "TAO reste silencieuse un instant." };
  if (error instanceof SyntaxError || (error instanceof TypeError && !error.provider)) return { status: 400, code: "INVALID_PAYLOAD", message: "Requête invalide." };
  if ([401, 403].includes(error?.status)) return { status: 503, code: "PROVIDER_CONFIGURATION", message: "Le cerveau de TAO n’est pas correctement configuré." };
  if (error?.code === "INVALID_MODEL_JSON" || error?.code === "EMPTY_MODEL_RESPONSE") return { status: 502, code: "INVALID_PROVIDER_RESPONSE", message: "TAO n’a pas pu formuler sa réponse." };
  return { status: 503, code: "AI_UNAVAILABLE", message: "La conversation approfondie n’est pas disponible pour le moment." };
}
async function enforceRateLimit(request, env) { return !env.TAO_AI_RATE_LIMITER?.limit || (await env.TAO_AI_RATE_LIMITER.limit({ key: clientKey(request) })).success; }

export function createWorkerHandler({ fetcher = fetch } = {}) {
  return async function handle(request, env = {}, executionContext = {}) {
    const requestId = crypto.randomUUID(), startedAt = Date.now(), state = { attempts: [] };
    const origin = corsOrigin(request, env), url = new URL(request.url);
    if (origin === false) return json({ error: { code: "ORIGIN_FORBIDDEN", message: "Origine non autorisée." } }, 403, null);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: Boolean(env.GEMINI_API_KEY || env.AI?.run), service: "tao-ai", providers: { gemini: { configured: Boolean(env.GEMINI_API_KEY) }, cloudflareWorkersAI: { configured: Boolean(env.AI?.run) } } }, 200, origin);
    if (request.method !== "POST" || url.pathname !== "/v1/tao/respond") return json({ error: { code: "NOT_FOUND", message: "Route inconnue." } }, 404, origin);
    if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Requête trop volumineuse." } }, 413, origin);
    if (!(await enforceRateLimit(request, env))) return json({ error: { code: "RATE_LIMITED", message: "TAO a besoin d’un instant avant de reprendre." } }, 429, origin, { "Retry-After": "60" });
    let mode = "unknown", result = null, safe = null;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Requête trop volumineuse." } }, 413, origin);
      const payload = validateRequestPayload(JSON.parse(raw)); mode = payload.mode;
      result = await generateWithFallback(payload, env, fetcher, state);
      const attemptedProviders = [...new Set(state.attempts.map(({ provider }) => provider))];
      return json({ response: result.response, meta: { requestId, provider: result.provider, model: result.model, fallbackUsed: result.fallbackLevel > 0, fallbackLevel: result.fallbackLevel, attemptedProviders, promptVersion: env.TAO_PROMPT_VERSION ?? "tao-brain-v1" } }, 200, origin);
    } catch (error) {
      safe = publicError(error);
      return json({ error: { code: safe.code, message: safe.message }, meta: { requestId } }, safe.status, origin);
    } finally {
      const log = { requestId, timestamp: new Date().toISOString(), mode, provider: result?.provider ?? null, model: result?.model ?? null, attempts: state.attempts, latency: Date.now() - startedAt, status: safe ? "error" : "ok", errorCode: safe?.code ?? null, tokenUsage: result?.usage?.total_tokens ?? null };
      executionContext.waitUntil?.(Promise.resolve(console.log(JSON.stringify(log))));
    }
  };
}
export default { fetch: createWorkerHandler() };
