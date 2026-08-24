import test from "node:test";
import assert from "node:assert/strict";
import { ENVIRONMENT_LOCATION_MODES, resolveEnvironmentLocation } from "../environment-location.mjs";

test("le lieu d’habitation est utilisé sans confondre le lieu natal", () => {
  const location = resolveEnvironmentLocation({ profile: {
    birthPlace: { city: "Caen", country: "France", latitude: 49.18, longitude: -0.37, timezone: "Europe/Paris" },
    residencePlace: { city: "Marseille", country: "France", latitude: 43.3, longitude: 5.37, timezone: "Europe/Paris" },
  } });
  assert.equal(location.available, true);
  assert.equal(location.mode, "residence");
  assert.match(location.label, /Marseille/);
  assert.equal(location.timezone, "Europe/Paris");
});

test("un ancien profil sans habitation ne reçoit pas la météo de son lieu natal", () => {
  const location = resolveEnvironmentLocation({ profile: { birthPlace: { city: "Caen", country: "France", latitude: 49.18, longitude: -0.37, timezone: "Europe/Paris" } } });
  assert.deepEqual(location, { available: false, mode: "residence", reason: "residence-location-missing" });
});

test("le futur mode position actuelle est explicite mais ne demande aucune permission", () => {
  const location = resolveEnvironmentLocation({ mode: ENVIRONMENT_LOCATION_MODES.CURRENT_POSITION });
  assert.deepEqual(location, { available: false, mode: "current-position", reason: "permission-not-requested" });
});
