import { setTaoPose } from "./tao-character.js";

const MINIMUM_DURATION_MS = 8_000;
const POSE_BY_INTENT = Object.freeze({
  NEUTRAL: "TAO_POSE_00_NEUTRE", WELCOME: "TAO_POSE_01_ACCUEIL", OBSERVATION: "TAO_POSE_02_OBSERVATION",
  REFLECTION: "TAO_POSE_03_REFLEXION", YI_JING: "TAO_POSE_05_YI_JING", READING: "TAO_POSE_06_LECTURE",
  EXPLANATION: "TAO_POSE_07_EXPLICATION", CONTEMPLATION: "TAO_POSE_08_CONTEMPLATION", LOOK_OUTSIDE: "TAO_POSE_12_REGARDE_DEHORS",
  QUESTION: "TAO_POSE_ALT_01_INTERROGATION", FOCUS: "TAO_POSE_ALT_02_CONCENTRATION",
});

let lastChangeAt = 0;
let currentIntent = "NEUTRAL";

export async function applyTaoAIPresence(presence, confidence = "low", { force = false } = {}) {
  const intent = POSE_BY_INTENT[presence?.postureIntent] ? presence.postureIntent : "NEUTRAL";
  const now = Date.now();
  if (!force && confidence === "low") return null;
  if (!force && intent !== currentIntent && now - lastChangeAt < MINIMUM_DURATION_MS) return null;
  const poseId = POSE_BY_INTENT[intent];
  await setTaoPose(poseId);
  lastChangeAt = now;
  currentIntent = intent;
  document.dispatchEvent(new CustomEvent("tao:ai-presence", { detail: { ...presence, poseId } }));
  return poseId;
}

export { POSE_BY_INTENT };
