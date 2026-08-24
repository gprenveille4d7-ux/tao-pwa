import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerHandler } from "../worker/src/index.mjs";
import { TAO_SYSTEM_PROMPT } from "../worker/src/prompt.mjs";

const resultValue = { title: "Observer", speech: "TAO relie les faits disponibles.", supportingFactIds: ["F1", "FAUX"], confidence: "high", suggestions: ["Pourquoi ?"], presence: { mood: "ATTENTIVE", postureIntent: "OBSERVATION", deskFocus: "NONE", lookAtWindow: false }, memoryCandidates: [] };
function geminiOk(model = "gemini-3.6-flash") { return new Response(JSON.stringify({ status: "completed", model, steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(resultValue) }] }], usage: { total_tokens: 42 } }), { status: 200, headers: { "Content-Type": "application/json" } }); }
function geminiError(status, code) { return new Response(JSON.stringify({ error: { status: code } }), { status, headers: { "Content-Type": "application/json" } }); }
function aiOk(value = resultValue) { return { response: JSON.stringify(value), usage: { total_tokens: 21 } }; }
function validPayload(mode = "conversation") { return { mode, context: { mode, profile: { profileId: "P1" }, today: { dominantFacts: [{ id: "F1", type: "DAY_STEM", value: "JIA" }] } }, messages: [{ role: "user", content: "Pourquoi ?" }] }; }
function request(path, { method = "GET", body, origin = "https://gprenveille4d7-ux.github.io" } = {}) { const headers = { Origin: origin }; if (body) headers["Content-Type"] = "application/json"; return new Request(`https://tao-ai.example${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
function makeEnv(overrides = {}) { return { GEMINI_API_KEY: "test-secret", TAO_GEMINI_MODEL: "gemini-3.6-flash", TAO_GEMINI_FALLBACK_MODEL: "gemini-3.5-flash-lite", TAO_CLOUDFLARE_MODEL: "@cf/google/gemma-4-26b-a4b-it", TAO_CLOUDFLARE_FALLBACK_MODEL: "@cf/zai-org/glm-4.7-flash", TAO_ALLOWED_ORIGIN: "https://gprenveille4d7-ux.github.io", TAO_PROMPT_VERSION: "tao-brain-v1", AI: { run: async () => aiOk() }, TAO_AI_RATE_LIMITER: { limit: async () => ({ success: true }) }, ...overrides }; }
async function post(handler, env = makeEnv(), payload = validPayload()) { return handler(request("/v1/tao/respond", { method: "POST", body: payload }), env); }

test("le prompt conserve les garde-fous de causalité et les cinq objectifs relationnels", () => {
  assert.match(TAO_SYSTEM_PROMPT, /ne transformes jamais une fréquence de 3 %/i);
  assert.match(TAO_SYSTEM_PROMPT, /ne mesure ni causalité ni signification surnaturelle/i);
  for (const goal of ["overview", "differences", "communication", "difficult_period", "cooperation"]) assert.match(TAO_SYSTEM_PROMPT, new RegExp(goal));
  assert.match(TAO_SYSTEM_PROMPT, /faits BaZi restent invariants/i);
});

test("health décrit les fournisseurs sans secret et reste opérationnel avec Workers AI seul", async () => {
  const body = await (await createWorkerHandler()(request("/health"), makeEnv({ GEMINI_API_KEY: undefined }))).json();
  assert.equal(body.ok, true); assert.equal(body.providers.gemini.configured, false); assert.equal(body.providers.cloudflareWorkersAI.configured, true); assert.equal(JSON.stringify(body).includes("test-secret"), false);
});

test("Gemini primaire valide gagne et les fact IDs inventés sont supprimés", async () => {
  let aiCalls = 0; const env = makeEnv({ AI: { run: async () => { aiCalls += 1; return aiOk(); } } });
  const response = await post(createWorkerHandler({ fetcher: async () => geminiOk() }), env); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(aiCalls, 0); assert.deepEqual(body.response.supportingFactIds, ["F1"]); assert.equal(body.meta.provider, "gemini"); assert.equal(body.meta.fallbackLevel, 0);
});

test("un quota Gemini saute le Gemini secondaire et passe directement à Gemma", async () => {
  let geminiCalls = 0, aiCalls = 0;
  const env = makeEnv({ AI: { run: async (model) => { aiCalls += 1; assert.match(model, /gemma/); return aiOk(); } } });
  const response = await post(createWorkerHandler({ fetcher: async () => { geminiCalls += 1; return geminiError(429, "RESOURCE_EXHAUSTED"); } }), env); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(geminiCalls, 1); assert.equal(aiCalls, 1); assert.equal(body.meta.provider, "cloudflare-workers-ai"); assert.equal(body.meta.fallbackLevel, 2);
});

test("une indisponibilité Gemini essaie le secondaire avant Gemma", async () => {
  let calls = 0; const handler = createWorkerHandler({ fetcher: async () => (++calls === 1 ? geminiError(404, "MODEL_NOT_FOUND") : geminiOk("gemini-3.5-flash-lite")) });
  const body = await (await post(handler)).json(); assert.equal(calls, 2); assert.equal(body.meta.model, "gemini-3.5-flash-lite"); assert.equal(body.meta.fallbackLevel, 1);
});

test("deux échecs Gemini conduisent à Gemma puis un échec Gemma conduit à GLM", async () => {
  const models = []; const env = makeEnv({ AI: { run: async (model) => { models.push(model); if (model.includes("gemma")) throw Object.assign(new Error("down"), { status: 503, code: "UNAVAILABLE" }); return aiOk(); } } });
  const body = await (await post(createWorkerHandler({ fetcher: async () => geminiError(503, "UNAVAILABLE") }), env)).json();
  assert.equal(models.length, 2); assert.match(body.meta.model, /glm/); assert.equal(body.meta.fallbackLevel, 3); assert.deepEqual(body.meta.attemptedProviders, ["gemini", "cloudflare-workers-ai"]);
});

test("Workers AI fonctionne sans clé Gemini et une sortie Gemma invalide replie vers GLM", async () => {
  let aiCalls = 0; const env = makeEnv({ GEMINI_API_KEY: undefined, AI: { run: async () => (++aiCalls === 1 ? { response: "pas du JSON" } : aiOk()) } });
  const body = await (await post(createWorkerHandler(), env)).json(); assert.equal(aiCalls, 2); assert.equal(body.meta.fallbackLevel, 3); assert.match(body.meta.model, /glm/);
});

test("si tous les fournisseurs échouent, le Worker rend une erreur stable sans contenu sensible", async () => {
  const env = makeEnv({ AI: { run: async () => { throw Object.assign(new Error("secret provider detail"), { status: 503, code: "UNAVAILABLE" }); } } });
  const response = await post(createWorkerHandler({ fetcher: async () => geminiError(503, "UNAVAILABLE") }), env); const body = await response.json();
  assert.equal(response.status, 503); assert.equal(body.error.code, "AI_UNAVAILABLE"); assert.equal(JSON.stringify(body).includes("secret provider detail"), false);
});

test("origine, mode, volume, JSON et rate limiting sont refusés avant les modèles", async () => {
  let calls = 0; const handler = createWorkerHandler({ fetcher: async () => { calls += 1; return geminiOk(); } });
  assert.equal((await handler(request("/v1/tao/respond", { method: "POST", body: validPayload(), origin: "https://evil.example" }), makeEnv())).status, 403);
  assert.equal((await post(handler, makeEnv(), validPayload("unknown"))).status, 400);
  const huge = validPayload(); huge.messages[0].content = "x".repeat(40_000); assert.equal((await post(handler, makeEnv(), huge)).status, 413);
  const malformed = new Request("https://tao-ai.example/v1/tao/respond", { method: "POST", headers: { Origin: "https://gprenveille4d7-ux.github.io", "Content-Type": "application/json" }, body: "{" }); assert.equal((await handler(malformed, makeEnv())).status, 400);
  assert.equal((await post(handler, makeEnv({ TAO_AI_RATE_LIMITER: { limit: async () => ({ success: false }) } }))).status, 429); assert.equal(calls, 0);
});

test("le mode constellation accepte les faits déjà calculés", async () => {
  const payload = validPayload("family_constellation"); payload.context.familyConstellation = { familyMembers: [{ id: "P1", displayName: "Alice", relationship: "parent" }], observations: [{ id: "F1", type: "DATE_MIRROR", interest: "HIGH", participantIds: ["P1", "P2"], values: [9, 11] }] };
  assert.equal((await post(createWorkerHandler({ fetcher: async () => geminiOk() }), makeEnv(), payload)).status, 200);
});
