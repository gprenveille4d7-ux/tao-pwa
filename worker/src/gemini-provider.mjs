import { TAO_AI_RESPONSE_SCHEMA } from "../../shared/tao-ai-contract.mjs";
import { TAO_SYSTEM_PROMPT, buildGeminiInput } from "./prompt.mjs";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

function extractOutputText(body) {
  const steps = Array.isArray(body?.steps) ? body.steps : [];
  const modelSteps = steps.filter(({ type }) => type === "model_output");
  const text = modelSteps.flatMap(({ content }) => Array.isArray(content) ? content : [])
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map(({ text }) => text).join("\n").trim();
  if (!text) throw Object.assign(new Error("Gemini n’a retourné aucun texte."), { code: "EMPTY_MODEL_RESPONSE" });
  return text;
}

function apiError(status, body) {
  const error = new Error(body?.error?.message ?? `Gemini indisponible (${status}).`);
  error.status = status;
  error.code = body?.error?.status ?? `GEMINI_${status}`;
  return error;
}

export async function callGemini({ apiKey, model, promptVersion, payload, fetcher = fetch, timeoutMs = 18_000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
      body: JSON.stringify({
        model,
        input: buildGeminiInput(payload),
        system_instruction: `${TAO_SYSTEM_PROMPT}\n\nVersion du prompt : ${promptVersion}.`,
        store: false,
        stream: false,
        generation_config: { max_output_tokens: payload.mode === "daily_synthesis" ? 650 : 1200, thinking_level: payload.mode === "yijing" ? "medium" : "low", thinking_summaries: "none" },
        response_format: [{ type: "text", mime_type: "application/json", schema: TAO_AI_RESPONSE_SCHEMA }],
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw apiError(response.status, body);
    let parsed;
    try { parsed = JSON.parse(extractOutputText(body)); }
    catch (error) { throw Object.assign(new Error("Réponse Gemini non conforme au schéma."), { code: "INVALID_MODEL_JSON", cause: error }); }
    return { response: parsed, usage: body.usage ?? null, interactionStatus: body.status ?? null };
  } finally {
    clearTimeout(timer);
  }
}
