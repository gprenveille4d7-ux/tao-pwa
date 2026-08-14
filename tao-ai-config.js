export const TAO_AI_PUBLIC_CONFIG = Object.freeze({
  endpoint: "https://tao-ai.g-prenveille4d7.workers.dev",
  promptVersion: "tao-brain-v1",
  contractVersion: "tao-ai-contract-1",
  providerVersion: "gemini-interactions-2026-08",
});

export function getTaoAIEndpoint() {
  const override = globalThis.TAO_AI_ENDPOINT;
  return typeof override === "string" && /^https:\/\//.test(override) ? override.replace(/\/$/, "") : TAO_AI_PUBLIC_CONFIG.endpoint;
}

export function isTaoAIMockEnabled() {
  if (typeof location === "undefined") return false;
  return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
    && new URLSearchParams(location.search).get("ai") === "mock";
}
