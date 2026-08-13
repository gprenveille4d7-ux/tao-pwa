import { preloadTaoPose, setTaoPose } from "./tao-character.js";
import { createDailyPoseCycle } from "./tao-presence-schedule.mjs";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let briefReady = false;
let runToken = 0;
let timer = null;
let finishWait = null;
let aiResumeTimer = null;

function isPavilionVisible() {
  return document.body.dataset.currentView === "pavilion" && !document.body.classList.contains("is-onboarding") && document.visibilityState === "visible";
}

function wait(milliseconds, token) {
  return new Promise((resolve) => {
    finishWait = resolve;
    timer = window.setTimeout(() => {
      finishWait = null;
      resolve(token === runToken);
    }, milliseconds);
  });
}

function stop() {
  runToken += 1;
  window.clearTimeout(timer);
  finishWait?.(false);
  finishWait = null;
  timer = null;
}

async function runPresence() {
  stop();
  if (!briefReady || !isPavilionVisible()) return;
  const token = runToken;

  if (reduceMotion.matches) {
    await preloadTaoPose("TAO_POSE_02_OBSERVATION").catch(() => undefined);
    if (token === runToken && isPavilionVisible()) await setTaoPose("TAO_POSE_02_OBSERVATION");
    return;
  }

  let cycle = createDailyPoseCycle();
  let index = 0;
  while (token === runToken && briefReady && isPavilionVisible()) {
    const moment = cycle[index];
    await preloadTaoPose(moment.poseId).catch(() => undefined);
    if (token !== runToken || !isPavilionVisible()) return;
    await setTaoPose(moment.poseId);
    document.dispatchEvent(new CustomEvent("tao:presence-pose", { detail: { poseId: moment.poseId, duration: moment.duration } }));

    const nextIndex = index + 1;
    const nextMoment = cycle[nextIndex] ?? createDailyPoseCycle()[0];
    preloadTaoPose(nextMoment.poseId).catch(() => undefined);
    if (!(await wait(moment.duration, token))) return;

    index += 1;
    if (index >= cycle.length) {
      cycle = createDailyPoseCycle();
      index = 0;
    }
  }
}

document.addEventListener("tao:daily-brief-change", () => {
  briefReady = true;
  runPresence();
});

document.addEventListener("tao:dialogue-static", () => {
  briefReady = false;
  stop();
});

document.addEventListener("tao:dialogue-message-change", (event) => {
  if (!briefReady || event.detail?.index === 0 || !isPavilionVisible()) return;
  preloadTaoPose("TAO_POSE_07_EXPLICATION")
    .then(() => setTaoPose("TAO_POSE_07_EXPLICATION"))
    .catch(() => undefined);
});

document.addEventListener("tao:ai-presence", () => {
  stop();
  window.clearTimeout(aiResumeTimer);
  aiResumeTimer = window.setTimeout(() => runPresence(), 10_000);
});

window.addEventListener("tao:view-change", () => runPresence());
document.addEventListener("visibilitychange", () => runPresence());
reduceMotion.addEventListener("change", () => runPresence());
