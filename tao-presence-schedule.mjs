export const DAILY_POSE_MOMENTS = Object.freeze([
  Object.freeze({ poseId: "TAO_POSE_01_ACCUEIL", minDuration: 8_500, maxDuration: 10_500 }),
  Object.freeze({ poseId: "TAO_POSE_02_OBSERVATION", minDuration: 900, maxDuration: 1_200 }),
  Object.freeze({ poseId: "TAO_POSE_07_EXPLICATION", minDuration: 1_700, maxDuration: 3_000 }),
  Object.freeze({ poseId: "TAO_POSE_03_REFLEXION", minDuration: 1_100, maxDuration: 2_600 }),
  Object.freeze({ poseId: "TAO_POSE_08_CONTEMPLATION", minDuration: 7_000, maxDuration: 10_000 }),
  Object.freeze({ poseId: "TAO_POSE_11_REVEUSE", minDuration: 900, maxDuration: 1_800 }),
  Object.freeze({ poseId: "TAO_POSE_12_REGARDE_DEHORS", minDuration: 1_800, maxDuration: 3_200 }),
]);

export function randomDuration(moment, random = Math.random) {
  return Math.round(moment.minDuration + random() * (moment.maxDuration - moment.minDuration));
}

export function createDailyPoseCycle(random = Math.random) {
  const [welcome, ...rest] = DAILY_POSE_MOMENTS;
  for (let index = rest.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [rest[index], rest[swapIndex]] = [rest[swapIndex], rest[index]];
  }
  return [welcome, ...rest].map((moment) => Object.freeze({ ...moment, duration: randomDuration(moment, random) }));
}
