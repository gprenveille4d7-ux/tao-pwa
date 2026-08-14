import { validateTaoAIResponse } from "../../shared/tao-ai-contract.mjs";
import { callGemini } from "./gemini-provider.mjs";
import { MAX_BODY_BYTES, clientKey, validateRequestPayload } from "./validation.mjs";

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

function allowedOrigins(env) {
  return new Set(String(env.TAO_ALLOWED_ORIGIN ?? "https://gprenveille4d7-ux.github.io").split(",").map((value) => value.trim()).filter(Boolean));
}

function corsOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (allowedOrigins(env).has(origin)) return origin;
  const workerIsLocal = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname);
  if (((env.TAO_ENVIRONMENT ?? "production") !== "production" || workerIsLocal) && LOCAL_ORIGIN.test(origin)) return origin;
  return false;
}

function headers(origin, extra = {}) {
  const cors = origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } : {};
  return { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cors, ...extra };
}

function json(body, status, origin, extra) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin, extra) });
}

function publicError(error) {
  if (error?.name === "AbortError") return { status: 504, code: "TIMEOUT", message: "TAO reste silencieuse un instant." };
  if (error instanceof TypeError || error instanceof SyntaxError) return { status: 400, code: "INVALID_PAYLOAD", message: "Requête invalide." };
  if (error?.status === 429 || error?.code === "RESOURCE_EXHAUSTED") return { status: 429, code: "QUOTA_EXHAUSTED", message: "La conversation approfondie a besoin d’une pause." };
  if ([401, 403].includes(error?.status)) return { status: 503, code: "PROVIDER_CONFIGURATION", message: "Le cerveau de TAO n’est pas correctement configuré." };
  if (error?.code === "INVALID_MODEL_JSON" || error?.code === "EMPTY_MODEL_RESPONSE") return { status: 502, code: "INVALID_PROVIDER_RESPONSE", message: "TAO n’a pas pu formuler sa réponse." };
  return { status: 503, code: "AI_UNAVAILABLE", message: "La conversation approfondie n’est pas disponible pour le moment." };
}

function shouldFallback(error) {
  return [404, 500, 502, 503].includes(error?.status) || ["MODEL_NOT_FOUND", "UNAVAILABLE"].includes(error?.code);
}

async function enforceRateLimit(request, env) {
  if (!env.TAO_AI_RATE_LIMITER?.limit) return true;
  const outcome = await env.TAO_AI_RATE_LIMITER.limit({ key: clientKey(request) });
  return outcome.success;
}

export function createWorkerHandler({ fetcher = fetch } = {}) {
  return async function handle(request, env = {}, executionContext = {}) {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const origin = corsOrigin(request, env);
    const url = new URL(request.url);
    if (origin === false) return json({ error: { code: "ORIGIN_FORBIDDEN", message: "Origine non autorisée." } }, 403, null);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "tao-ai", modelConfigured: Boolean(env.TAO_GEMINI_MODEL && env.GEMINI_API_KEY) }, 200, origin);
    }
    if (request.method !== "POST" || url.pathname !== "/v1/tao/respond") return json({ error: { code: "NOT_FOUND", message: "Route inconnue." } }, 404, origin);
    if (!env.GEMINI_API_KEY) return json({ error: { code: "NOT_CONFIGURED", message: "Le secret Gemini manque." } }, 503, origin);
    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Requête trop volumineuse." } }, 413, origin);
    if (!(await enforceRateLimit(request, env))) return json({ error: { code: "RATE_LIMITED", message: "TAO a besoin d’un instant avant de reprendre." } }, 429, origin, { "Retry-After": "60" });

    let mode = "unknown";
    let model = env.TAO_GEMINI_MODEL ?? "gemini-3.6-flash";
    let fallbackUsed = false;
    let usage = null;
    let logStatus = "ok";
    let logErrorCode = null;
    try {
      const rawText = await request.text();
      if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Requête trop volumineuse." } }, 413, origin);
      const payload = validateRequestPayload(JSON.parse(rawText));
      mode = payload.mode;
      let generated;
      try {
        generated = await callGemini({ apiKey: env.GEMINI_API_KEY, model, promptVersion: env.TAO_PROMPT_VERSION ?? "tao-brain-v1", payload, fetcher });
      } catch (error) {
        const fallbackModel = env.TAO_GEMINI_FALLBACK_MODEL;
        if (!fallbackModel || fallbackModel === model || !shouldFallback(error)) throw error;
        fallbackUsed = true;
        model = fallbackModel;
        generated = await callGemini({ apiKey: env.GEMINI_API_KEY, model, promptVersion: env.TAO_PROMPT_VERSION ?? "tao-brain-v1", payload, fetcher });
      }
      usage = generated.usage;
      const factIds = payload.context.today.dominantFacts.map(({ id }) => id);
      const response = validateTaoAIResponse(generated.response, factIds);
      return json({ response, meta: { requestId, model, fallbackUsed, promptVersion: env.TAO_PROMPT_VERSION ?? "tao-brain-v1" } }, 200, origin);
    } catch (error) {
      const safe = publicError(error);
      logStatus = "error";
      logErrorCode = safe.code;
      return json({ error: { code: safe.code, message: safe.message }, meta: { requestId } }, safe.status, origin);
    } finally {
      const log = { requestId, timestamp: new Date().toISOString(), mode, model, latency: Date.now() - startedAt, status: logStatus, errorCode: logErrorCode, fallbackUsed, tokenUsage: usage?.total_tokens ?? null };
      executionContext.waitUntil?.(Promise.resolve(console.log(JSON.stringify(log))));
    }
  };
}

const handler = createWorkerHandler();
export default { fetch: handler };
