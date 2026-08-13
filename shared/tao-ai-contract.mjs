export const TAO_AI_CONTRACT_VERSION = "tao-ai-contract-1";

export const TAO_AI_MODES = Object.freeze([
  "conversation",
  "daily_synthesis",
  "explanation",
  "yijing",
  "presence",
]);

export const TAO_AI_MOODS = Object.freeze([
  "CALM",
  "WARM",
  "ATTENTIVE",
  "CONTEMPLATIVE",
  "FOCUSED",
  "CURIOUS",
]);

export const TAO_AI_POSTURE_INTENTS = Object.freeze([
  "NEUTRAL",
  "WELCOME",
  "OBSERVATION",
  "REFLECTION",
  "YI_JING",
  "READING",
  "EXPLANATION",
  "CONTEMPLATION",
  "LOOK_OUTSIDE",
  "QUESTION",
  "FOCUS",
]);

export const TAO_AI_DESK_FOCUS = Object.freeze([
  "NONE",
  "OBJET_CELESTE_ASTROLABE",
  "OBJET_TASSE_CELESTE",
  "OBJET_LIVRE_CELESTE_FERME",
  "OBJET_CARTE_CELESTE_PARCHEMIN",
  "OBJET_YI_JING_PIECES",
  "OBJET_PIERRES_MYSTIQUES",
  "OBJET_CRISTAL_LUNAIRE",
  "OBJET_PLUME_CELESTE",
  "OBJET_FOSSILES_MYSTIQUES",
]);

export const TAO_AI_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: ["string", "null"], maxLength: 100 },
    speech: { type: "string", minLength: 1, maxLength: 4000 },
    supportingFactIds: {
      type: "array",
      maxItems: 16,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    suggestions: {
      type: "array",
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 90 },
    },
    presence: {
      type: "object",
      additionalProperties: false,
      properties: {
        mood: { type: "string", enum: TAO_AI_MOODS },
        postureIntent: { type: "string", enum: TAO_AI_POSTURE_INTENTS },
        deskFocus: { type: "string", enum: TAO_AI_DESK_FOCUS },
        lookAtWindow: { type: "boolean" },
      },
      required: ["mood", "postureIntent", "deskFocus", "lookAtWindow"],
    },
    memoryCandidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string", minLength: 1, maxLength: 280 },
          reason: { type: "string", minLength: 1, maxLength: 180 },
        },
        required: ["text", "reason"],
      },
    },
  },
  required: ["title", "speech", "supportingFactIds", "confidence", "suggestions", "presence", "memoryCandidates"],
});

function shortText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function allowed(value, values, fallback) {
  return values.includes(value) ? value : fallback;
}

export function validateTaoAIResponse(value, allowedFactIds = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Réponse IA invalide.");
  }
  const speech = shortText(value.speech, 4000);
  if (!speech) throw new TypeError("Réponse IA sans parole.");
  if (!Array.isArray(value.supportingFactIds) || !Array.isArray(value.suggestions)) {
    throw new TypeError("Structure de réponse IA incomplète.");
  }
  const factAllowList = new Set(allowedFactIds.map(String));
  const supportingFactIds = [...new Set(value.supportingFactIds.map(String))]
    .filter((id) => factAllowList.has(id))
    .slice(0, 16);
  const suggestions = [...new Set(value.suggestions.map((item) => shortText(item, 90)).filter(Boolean))].slice(0, 3);
  const presence = value.presence && typeof value.presence === "object" ? value.presence : {};
  const memoryCandidates = Array.isArray(value.memoryCandidates)
    ? value.memoryCandidates.slice(0, 3).flatMap((candidate) => {
      const text = shortText(candidate?.text, 280);
      const reason = shortText(candidate?.reason, 180);
      return text && reason ? [{ text, reason }] : [];
    })
    : [];

  return Object.freeze({
    title: shortText(value.title, 100) || null,
    speech,
    supportingFactIds: Object.freeze(supportingFactIds),
    confidence: allowed(value.confidence, ["high", "medium", "low"], "low"),
    suggestions: Object.freeze(suggestions),
    presence: Object.freeze({
      mood: allowed(presence.mood, TAO_AI_MOODS, "CALM"),
      postureIntent: allowed(presence.postureIntent, TAO_AI_POSTURE_INTENTS, "NEUTRAL"),
      deskFocus: allowed(presence.deskFocus, TAO_AI_DESK_FOCUS, "NONE"),
      lookAtWindow: Boolean(presence.lookAtWindow),
    }),
    memoryCandidates: Object.freeze(memoryCandidates.map(Object.freeze)),
  });
}
