import test from "node:test";
import assert from "node:assert/strict";
import { deleteYijingReading, getYijingHistory, saveYijingReading, toggleYijingFavorite } from "../yijing-history.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

test("l’historique sépare les profils, conserve la guidance et supprime sur demande", () => {
  globalThis.localStorage = memoryStorage();
  const first = saveYijingReading({ question: "Question A", lines: [7, 8, 7, 8, 7, 8], primaryNumber: 64, transformedNumber: null, changingLines: [], guidance: { essential: ["Lecture A"] }, profileId: "a" });
  saveYijingReading({ question: "Question B", lines: [6, 8, 7, 8, 7, 8], primaryNumber: 64, transformedNumber: 63, changingLines: [1], guidance: { essential: ["Lecture B"] }, profileId: "b" });
  assert.equal(getYijingHistory().length, 2);
  assert.equal(getYijingHistory({ profileId: "a" }).length, 1);
  assert.equal(getYijingHistory({ profileId: "a" })[0].guidance.essential[0], "Lecture A");
  assert.equal(toggleYijingFavorite(first.id), true);
  assert.equal(getYijingHistory({ profileId: "a" })[0].favorite, true);
  assert.equal(deleteYijingReading(first.id), true);
  assert.equal(getYijingHistory({ profileId: "a" }).length, 0);
  delete globalThis.localStorage;
});
