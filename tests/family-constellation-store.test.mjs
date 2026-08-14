import test from "node:test";
import assert from "node:assert/strict";
import { deleteFamilyEvent, getFamilyConstellationPreferences, getFamilyEvents, saveFamilyConstellationPreferences, saveFamilyEvent } from "../family-constellation-store.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

test("les événements familiaux restent locaux, validés et supprimables", () => {
  const storage = memoryStorage();
  const event = { id: "event-1", title: "Mariage", date: "2024-08-24", time: null, type: "marriage", profileIds: ["a", "b"] };
  saveFamilyEvent(event, storage);
  assert.deepEqual(getFamilyEvents(storage), [event]);
  assert.equal(deleteFamilyEvent(event.id, storage), true);
  assert.equal(getFamilyEvents(storage).length, 0);
});

test("les préférences acceptent plusieurs profils tout en filtrant les rôles inconnus", () => {
  const storage = memoryStorage();
  saveFamilyConstellationPreferences({ selectedProfileIds: ["1", "2", "3", "4", "5", "6", "7"], roles: { "1": "parent", "2": "inconnu" }, symbolicReading: true }, storage);
  const preferences = getFamilyConstellationPreferences(storage);
  assert.equal(preferences.selectedProfileIds.length, 7);
  assert.deepEqual(preferences.roles, { "1": "parent" });
  assert.equal(preferences.symbolicReading, true);
});
