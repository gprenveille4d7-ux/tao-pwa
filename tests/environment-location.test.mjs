import test from "node:test";
import assert from "node:assert/strict";
import { ENVIRONMENT_LOCATION_MODES, resolveEnvironmentLocation } from "../environment-location.mjs";

test("le lieu du profil est prioritaire sans demander la position du téléphone", () => {
  const location = resolveEnvironmentLocation({ profile: { birthPlace: { city: "Granville", country: "France", latitude: 48.837, longitude: -1.598, timezone: "Europe/Paris" } } });
  assert.equal(location.available, true);
  assert.equal(location.mode, "profile");
  assert.equal(location.timezone, "Europe/Paris");
});

test("le futur mode position actuelle est explicite mais ne demande aucune permission", () => {
  const location = resolveEnvironmentLocation({ mode: ENVIRONMENT_LOCATION_MODES.CURRENT_POSITION });
  assert.deepEqual(location, { available: false, mode: "current-position", reason: "permission-not-requested" });
});
