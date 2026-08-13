import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerHandler } from "../worker/src/index.mjs";

const responseValue = {
  title: "Observer", speech: "TAO relie les faits disponibles.", supportingFactIds: ["F1", "FAUX"], confidence: "high", suggestions: ["Pourquoi ?"],
  presence: { mood: "ATTENTIVE", postureIntent: "OBSERVATION", deskFocus: "NONE", lookAtWindow: false }, memoryCandidates: [],
};

function geminiOk(model = "gemini-3.6-flash") {
  return new Response(JSON.stringify({ status: "completed", model, steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(responseValue) }] }], usage: { total_tokens: 42 } }), { status: 200, headers: { "Content-Type": "application/json" } });
}

const env = {
  GEMINI_API_KEY: "test-secret", TAO_GEMINI_MODEL: "gemini-3.6-flash", TAO_GEMINI_FALLBACK_MODEL: "gemini-3.5-flash-lite", TAO_ALLOWED_ORIGIN: "https://gprenveille4d7-ux.github.io", TAO_PROMPT_VERSION: "tao-brain-v1",
  TAO_AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

function validPayload(mode = "conversation") {
  return { mode, context: { mode, profile: { profileId: "P1" }, today: { dominantFacts: [{ id: "F1", type: "DAY_STEM", value: "JIA" }] } }, messages: [{ role: "user", content: "Pourquoi ?" }] };
}

function request(path, { method = "GET", body, origin = "https://gprenveille4d7-ux.github.io" } = {}) {
  const headers = { Origin: origin };
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`https://tao-ai.example${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

test("GET /health ne révèle aucun secret", async () => {
  const response = await createWorkerHandler({ fetcher: async () => geminiOk() })(request("/health"), env);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(JSON.stringify(body).includes("test-secret"), false);
});

test("POST valide applique le schéma et retire un fact ID inventé", async () => {
  const response = await createWorkerHandler({ fetcher: async () => geminiOk() })(request("/v1/tao/respond", { method: "POST", body: validPayload() }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.response.supportingFactIds, ["F1"]);
  assert.equal(body.meta.model, "gemini-3.6-flash");
});

test("origine, mode et volume sont strictement refusés", async () => {
  const handler = createWorkerHandler({ fetcher: async () => geminiOk() });
  assert.equal((await handler(request("/v1/tao/respond", { method: "POST", body: validPayload(), origin: "https://evil.example" }), env)).status, 403);
  assert.equal((await handler(request("/v1/tao/respond", { method: "POST", body: validPayload("unknown") }), env)).status, 400);
  const huge = validPayload(); huge.messages[0].content = "x".repeat(40_000);
  assert.equal((await handler(request("/v1/tao/respond", { method: "POST", body: huge }), env)).status, 413);
});

test("un modèle indisponible déclenche au plus un repli contrôlé", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ error: { status: "MODEL_NOT_FOUND" } }), { status: 404, headers: { "Content-Type": "application/json" } });
    return geminiOk("gemini-3.5-flash-lite");
  };
  const response = await createWorkerHandler({ fetcher })(request("/v1/tao/respond", { method: "POST", body: validPayload() }), env);
  const body = await response.json();
  assert.equal(calls, 2);
  assert.equal(body.meta.fallbackUsed, true);
  assert.equal(body.meta.model, "gemini-3.5-flash-lite");
});

test("quota et réponse Gemini invalide deviennent des erreurs TAO propres", async () => {
  const quota = createWorkerHandler({ fetcher: async () => new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), { status: 429, headers: { "Content-Type": "application/json" } }) });
  const quotaResponse = await quota(request("/v1/tao/respond", { method: "POST", body: validPayload() }), env);
  assert.equal(quotaResponse.status, 429);
  const invalid = createWorkerHandler({ fetcher: async () => new Response(JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "text", text: "not-json" }] }] }), { status: 200, headers: { "Content-Type": "application/json" } }) });
  const invalidResponse = await invalid(request("/v1/tao/respond", { method: "POST", body: validPayload() }), env);
  assert.equal(invalidResponse.status, 502);
});

test("le rate limiting et une configuration fournisseur refusée restent lisibles", async () => {
  let called = false;
  const limitedEnv = { ...env, TAO_AI_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const limited = await createWorkerHandler({ fetcher: async () => { called = true; return geminiOk(); } })(request("/v1/tao/respond", { method: "POST", body: validPayload() }), limitedEnv);
  assert.equal(limited.status, 429);
  assert.equal(called, false);
  const forbidden = await createWorkerHandler({ fetcher: async () => new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED" } }), { status: 403, headers: { "Content-Type": "application/json" } }) })(request("/v1/tao/respond", { method: "POST", body: validPayload() }), env);
  assert.equal(forbidden.status, 503);
});

test("un JSON cassé est refusé avant tout appel Gemini", async () => {
  let called = false;
  const malformed = new Request("https://tao-ai.example/v1/tao/respond", { method: "POST", headers: { Origin: "https://gprenveille4d7-ux.github.io", "Content-Type": "application/json" }, body: "{" });
  const response = await createWorkerHandler({ fetcher: async () => { called = true; return geminiOk(); } })(malformed, env);
  assert.equal(response.status, 400);
  assert.equal(called, false);
});
