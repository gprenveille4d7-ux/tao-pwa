import test from "node:test";
import assert from "node:assert/strict";
import { TAO_AI_RESPONSE_SCHEMA, validateTaoAIResponse } from "../shared/tao-ai-contract.mjs";

function response() {
  return {
    title: "Observer",
    speech: "Une réponse appuyée sur les faits transmis.",
    supportingFactIds: ["F1", "INVENTED"],
    confidence: "high",
    suggestions: ["Pourquoi ?", "Et demain ?", "Encore", "En trop"],
    presence: { mood: "ATTENTIVE", postureIntent: "OBSERVATION", deskFocus: "NONE", lookAtWindow: false },
    memoryCandidates: [{ text: "Un sujet", reason: "Continuité" }],
  };
}

test("le contrat impose une sortie structurée sans propriétés libres", () => {
  assert.equal(TAO_AI_RESPONSE_SCHEMA.additionalProperties, false);
  assert.deepEqual(TAO_AI_RESPONSE_SCHEMA.required.sort(), ["confidence", "memoryCandidates", "presence", "speech", "suggestions", "supportingFactIds", "title"].sort());
});

test("un fact ID inventé est supprimé et les suggestions sont limitées", () => {
  const value = validateTaoAIResponse(response(), ["F1"]);
  assert.deepEqual(value.supportingFactIds, ["F1"]);
  assert.equal(value.suggestions.length, 3);
});

test("une réponse sans parole est rejetée", () => {
  assert.throws(() => validateTaoAIResponse({ ...response(), speech: "" }, ["F1"]), /sans parole/);
});
