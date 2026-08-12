import { setTaoPose } from "./tao-character.js";

export const TAO_NARRATIVE_STATES = Object.freeze({
  IDLE: Object.freeze({ id: "idle", poseId: "TAO_POSE_00_NEUTRE" }),
  WELCOME: Object.freeze({ id: "welcome", poseId: "TAO_POSE_01_ACCUEIL" }),
  OBSERVING: Object.freeze({ id: "observing", poseId: "TAO_POSE_02_OBSERVATION" }),
  THINKING: Object.freeze({ id: "thinking", poseId: "TAO_POSE_03_REFLEXION" }),
  EXPLAINING: Object.freeze({ id: "explaining", poseId: "TAO_POSE_07_EXPLICATION" }),
});

const stateById = new Map(
  Object.values(TAO_NARRATIVE_STATES).map((state) => [state.id, state]),
);
let currentState = TAO_NARRATIVE_STATES.IDLE;

function resolveNarrativeState(stateId) {
  const normalizedId = String(stateId).trim().toLowerCase();
  const state = stateById.get(normalizedId);

  if (!state) {
    throw new Error(`État narratif TAO inconnu : ${stateId}`);
  }

  return state;
}

export async function setTaoNarrativeState(stateId) {
  const state = resolveNarrativeState(stateId);
  const pose = await setTaoPose(state.poseId);
  currentState = state;
  document.dispatchEvent(
    new CustomEvent("tao:narrative-state-change", {
      detail: { stateId: state.id, poseId: state.poseId },
    }),
  );
  return Object.freeze({ stateId: state.id, poseId: state.poseId, pose });
}

export function getTaoNarrativeState() {
  return currentState.id;
}

function enableNarrativeDebug() {
  if (new URLSearchParams(window.location.search).get("debug") !== "poses") return;

  const panel = document.querySelector("[data-pose-debug]");
  const select = document.querySelector("[data-narrative-select]");
  const output = document.querySelector("[data-narrative-label]");
  if (!panel || !select || !output) return;

  for (const [label, state] of Object.entries(TAO_NARRATIVE_STATES)) {
    const option = document.createElement("option");
    option.value = state.id;
    option.textContent = label;
    select.append(option);
  }

  async function selectState(stateId) {
    const result = await setTaoNarrativeState(stateId);
    output.value = `${result.stateId.toUpperCase()} → ${result.poseId}`;
  }

  select.addEventListener("change", () => {
    selectState(select.value).catch((error) => {
      output.value = error.message;
      console.error("[TAO] État narratif impossible.", error);
    });
  });
  panel.hidden = false;
  selectState(TAO_NARRATIVE_STATES.IDLE.id).catch((error) => {
    output.value = error.message;
  });
}

enableNarrativeDebug();
