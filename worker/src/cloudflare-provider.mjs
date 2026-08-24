import { TAO_AI_RESPONSE_SCHEMA } from "../../shared/tao-ai-contract.mjs";
import { TAO_SYSTEM_PROMPT, buildGeminiInput } from "./prompt.mjs";

export const CLOUDFLARE_PRIMARY_MODEL = "@cf/google/gemma-4-26b-a4b-it";
export const CLOUDFLARE_FALLBACK_MODEL = "@cf/zai-org/glm-4.7-flash";

const MODEL_OPTIONS = Object.freeze({
  [CLOUDFLARE_PRIMARY_MODEL]: Object.freeze({ schemaMode: "json_schema", reasoningEffort: "low" }),
  [CLOUDFLARE_FALLBACK_MODEL]: Object.freeze({ schemaMode: "json_object", reasoningEffort: "low" }),
});

function cleanJsonText(text) {
  return String(text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function extractOutputText(body) {
  if (typeof body === "string") return body.trim();
  if (typeof body?.response === "string") return body.response.trim();
  if (typeof body?.result?.response === "string") return body.result.response.trim();
  const choices = Array.isArray(body?.choices) ? body.choices : Array.isArray(body?.result?.choices) ? body.result.choices : [];
  const text = choices.map((choice) => choice?.message?.content ?? choice?.text ?? "").filter((value) => typeof value === "string").join("\n").trim();
  if (!text) throw Object.assign(new Error("Workers AI n’a retourné aucun texte."), { code: "EMPTY_MODEL_RESPONSE", provider: "cloudflare-workers-ai" });
  return text;
}

function normalizedUsage(body) {
  const usage = body?.usage ?? body?.result?.usage ?? null;
  if (!usage || typeof usage !== "object") return null;
  return {
    prompt_tokens: Number(usage.prompt_tokens ?? usage.input_tokens) || null,
    completion_tokens: Number(usage.completion_tokens ?? usage.output_tokens) || null,
    total_tokens: Number(usage.total_tokens) || null,
  };
}

function responseFormat(model) {
  const capability = MODEL_OPTIONS[model] ?? MODEL_OPTIONS[CLOUDFLARE_FALLBACK_MODEL];
  if (capability.schemaMode === "json_schema") return { type: "json_schema", json_schema: { name: "tao_response", strict: true, schema: TAO_AI_RESPONSE_SCHEMA } };
  return { type: "json_object" };
}

function providerError(error, model) {
  if (error?.code === "INVALID_MODEL_JSON" || error?.code === "EMPTY_MODEL_RESPONSE") return error;
  const normalized = new Error("Cloudflare Workers AI est momentanément indisponible.");
  normalized.status = Number(error?.status ?? error?.statusCode ?? error?.cause?.status) || 503;
  normalized.code = error?.code ?? error?.cause?.code ?? `CLOUDFLARE_${normalized.status}`;
  normalized.provider = "cloudflare-workers-ai";
  normalized.model = model;
  return normalized;
}

export async function callCloudflareAI({ ai, model, promptVersion, payload, timeoutMs = 20_000 }) {
  if (!ai?.run) throw Object.assign(new Error("Binding Workers AI absent."), { status: 503, code: "CLOUDFLARE_NOT_CONFIGURED", provider: "cloudflare-workers-ai", model });
  const capability = MODEL_OPTIONS[model] ?? MODEL_OPTIONS[CLOUDFLARE_FALLBACK_MODEL];
  const maxTokens = payload.mode === "daily_synthesis" ? 650 : 1200;
  const messages = [
    { role: "system", content: `${TAO_SYSTEM_PROMPT}\n\nVersion du prompt : ${promptVersion}. Réponds uniquement avec un objet JSON conforme au contrat TAO, sans balise Markdown.` },
    { role: "user", content: buildGeminiInput(payload) },
  ];
  let timer;
  try {
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("Délai Workers AI dépassé."), { name: "AbortError", provider: "cloudflare-workers-ai", model })), timeoutMs); });
    const body = await Promise.race([ai.run(model, {
      messages,
      stream: false,
      max_completion_tokens: maxTokens,
      temperature: 0.25,
      reasoning_effort: capability.reasoningEffort,
      response_format: responseFormat(model),
    }), timeout]);
    let parsed;
    try { parsed = JSON.parse(cleanJsonText(extractOutputText(body))); }
    catch (error) { throw Object.assign(new Error("Réponse Workers AI non conforme au contrat JSON."), { code: "INVALID_MODEL_JSON", provider: "cloudflare-workers-ai", model, cause: error }); }
    return { response: parsed, usage: normalizedUsage(body) };
  } catch (error) {
    throw providerError(error, model);
  } finally {
    clearTimeout(timer);
  }
}
