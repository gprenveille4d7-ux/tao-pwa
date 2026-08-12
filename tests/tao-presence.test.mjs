import test from "node:test";
import assert from "node:assert/strict";
import { createDailyPoseCycle, DAILY_POSE_MOMENTS, randomDuration } from "../tao-presence-schedule.mjs";

test("la parole quotidienne alterne les postures sans fondu", () => {
  assert.equal(DAILY_POSE_MOMENTS.length, 7);
  assert.equal(new Set(DAILY_POSE_MOMENTS.map(({ poseId }) => poseId)).size, DAILY_POSE_MOMENTS.length);
  assert.ok(DAILY_POSE_MOMENTS.some(({ maxDuration }) => maxDuration >= 10_000), "une posture doit pouvoir rester dix secondes");
  assert.ok(DAILY_POSE_MOMENTS.some(({ minDuration, maxDuration }) => minDuration <= 1_000 && maxDuration <= 1_800), "une posture brève doit durer environ une seconde");
  assert.ok(DAILY_POSE_MOMENTS.some(({ minDuration, maxDuration }) => minDuration >= 1_000 && maxDuration <= 3_200), "une posture intermédiaire doit durer une à trois secondes");
});

test("les durées restent dans les limites et le cycle commence par l’accueil", () => {
  const cycle = createDailyPoseCycle(() => 0.5);
  assert.equal(cycle[0].poseId, "TAO_POSE_01_ACCUEIL");
  for (const moment of cycle) {
    assert.ok(moment.duration >= moment.minDuration);
    assert.ok(moment.duration <= moment.maxDuration);
  }
  assert.equal(randomDuration({ minDuration: 1_000, maxDuration: 3_000 }, () => 0.5), 2_000);
});
