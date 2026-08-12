import test from "node:test";
import assert from "node:assert/strict";

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
  };
}

function profile(id, firstName, relationship) {
  return {
    schemaVersion: 1,
    id,
    firstName,
    relationship,
    birthDate: "1985-09-11",
    birthTime: null,
    birthTimeKnown: false,
    birthPlace: { id: "paris", city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  };
}

test("plusieurs profils restent distincts et le profil actif peut changer", async () => {
  globalThis.localStorage = memoryStorage();
  const store = await import(`../profile-store.js?test=${Date.now()}`);
  const self = profile("self-id", "Alice", "self");
  const friend = profile("friend-id", "Marcel", "friend");
  store.saveProfile(self);
  store.saveProfile(friend, { setActive: false });
  assert.equal(store.getProfiles().length, 2);
  assert.equal(store.getActiveProfile().id, "self-id");
  store.setActiveProfile("friend-id");
  assert.equal(store.getActiveProfile().firstName, "Marcel");
});

test("une modification conserve l’identifiant stable", async () => {
  globalThis.localStorage = memoryStorage();
  const store = await import(`../profile-store.js?test=${Date.now()}-update`);
  const original = profile("stable-id", "Lucile", "self");
  store.saveProfile(original);
  store.saveProfile({ ...original, firstName: "Lucie", updatedAt: "2026-08-12T12:00:00.000Z" });
  assert.equal(store.getProfiles().length, 1);
  assert.equal(store.getActiveProfile().id, "stable-id");
  assert.equal(store.getActiveProfile().firstName, "Lucie");
});
