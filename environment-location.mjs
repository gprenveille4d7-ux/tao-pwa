export const ENVIRONMENT_LOCATION_MODES = Object.freeze({ PROFILE: "profile", CURRENT_POSITION: "current-position" });

export function resolveEnvironmentLocation({ profile, mode = ENVIRONMENT_LOCATION_MODES.PROFILE } = {}) {
  if (mode === ENVIRONMENT_LOCATION_MODES.CURRENT_POSITION) {
    return Object.freeze({ available: false, mode, reason: "permission-not-requested" });
  }
  const place = profile?.birthPlace;
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || !place.timezone) {
    return Object.freeze({ available: false, mode: ENVIRONMENT_LOCATION_MODES.PROFILE, reason: "profile-location-missing" });
  }
  return Object.freeze({
    available: true, mode: ENVIRONMENT_LOCATION_MODES.PROFILE, source: "profile",
    latitude: place.latitude, longitude: place.longitude, timezone: place.timezone,
    label: [place.city, place.country].filter(Boolean).join(" · "),
  });
}
