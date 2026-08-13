import { TAO_AI_MODES } from "../../shared/tao-ai-contract.mjs";

export const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 2000;
const ROOT_KEYS = new Set(["mode", "context", "messages"]);
const CONTEXT_KEYS = new Set(["version", "semanticVersion", "mode", "moment", "profile", "bazi", "today", "yijing", "familyConstellation", "continuity"]);

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contient un champ inattendu.`);
  }
}

export function validateRequestPayload(payload) {
  if (!plainObject(payload)) throw new TypeError("Payload invalide.");
  assertKeys(payload, ROOT_KEYS, "La requête");
  if (!TAO_AI_MODES.includes(payload.mode)) throw new TypeError("Mode inconnu.");
  if (!plainObject(payload.context) || payload.context.mode !== payload.mode) throw new TypeError("Contexte invalide.");
  assertKeys(payload.context, CONTEXT_KEYS, "Le contexte");
  if (!plainObject(payload.context.profile) || typeof payload.context.profile.profileId !== "string") throw new TypeError("Profil contextuel absent.");
  if (!plainObject(payload.context.today) || !Array.isArray(payload.context.today.dominantFacts)) throw new TypeError("Faits TAO absents.");
  if (payload.context.today.dominantFacts.length > 40) throw new TypeError("Trop de faits transmis.");
  for (const fact of payload.context.today.dominantFacts) {
    if (!plainObject(fact) || typeof fact.id !== "string" || typeof fact.type !== "string" || fact.id.length > 120) throw new TypeError("Fait TAO invalide.");
  }
  if (!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > MAX_MESSAGES) throw new TypeError("Historique invalide.");
  const messages = payload.messages.map((message) => {
    if (!plainObject(message) || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") throw new TypeError("Message invalide.");
    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_CHARS) throw new TypeError("Message trop long ou vide.");
    return { role: message.role, content };
  });
  return Object.freeze({ mode: payload.mode, context: payload.context, messages: Object.freeze(messages) });
}

export function clientKey(request) {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}
