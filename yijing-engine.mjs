import { getHexagramByLines } from "./yijing-data.mjs?v=1.0.1";

export const YIJING_ENGINE_VERSION = "tao-yijing-engine-1.0.0";
export const COIN_CONVENTION = Object.freeze({ heads: 3, tails: 2 });

export function interpretLineValue(value) {
  const interpretations = {
    6: { value: 6, polarity: "yin", changing: true, label: "Yin mutant", transformed: 1 },
    7: { value: 7, polarity: "yang", changing: false, label: "Yang stable", transformed: 1 },
    8: { value: 8, polarity: "yin", changing: false, label: "Yin stable", transformed: 0 },
    9: { value: 9, polarity: "yang", changing: true, label: "Yang mutant", transformed: 0 },
  };
  const result = interpretations[Number(value)];
  if (!result) throw new RangeError(`Valeur de ligne Yi Jing invalide : ${value}`);
  return Object.freeze({ ...result, binary: result.polarity === "yang" ? 1 : 0 });
}

export function castThreeCoins(random = Math.random) {
  const coins = Array.from({ length: 3 }, () => random() < 0.5 ? "tails" : "heads");
  const value = coins.reduce((sum, coin) => sum + COIN_CONVENTION[coin], 0);
  return Object.freeze({ coins: Object.freeze(coins), ...interpretLineValue(value) });
}

export function createCasting(random = Math.random) {
  return Object.freeze(Array.from({ length: 6 }, () => castThreeCoins(random)));
}

export function resolveCasting(lineResults) {
  if (!Array.isArray(lineResults) || lineResults.length !== 6) {
    throw new TypeError("Un tirage Yi Jing doit contenir exactement six lignes.");
  }
  const lines = lineResults.map((line) => interpretLineValue(typeof line === "number" ? line : line.value));
  const primaryLines = lines.map(({ binary }) => binary);
  const transformedLines = lines.map(({ changing, transformed, binary }) => changing ? transformed : binary);
  const primary = getHexagramByLines(primaryLines);
  const changingLines = lines.flatMap((line, index) => line.changing ? [index + 1] : []);
  const transformed = changingLines.length ? getHexagramByLines(transformedLines) : null;
  if (!primary || (changingLines.length && !transformed)) throw new Error("Structure d’hexagramme inconnue.");
  return Object.freeze({
    engineVersion: YIJING_ENGINE_VERSION,
    lines: Object.freeze(lines),
    primary,
    changingLines: Object.freeze(changingLines),
    transformed,
  });
}
