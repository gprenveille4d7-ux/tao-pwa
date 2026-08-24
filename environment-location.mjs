export const ENVIRONMENT_LOCATION_MODES = Object.freeze({ RESIDENCE: "residence", CURRENT_POSITION: "current-position" });

export function resolveEnvironmentLocation({ profile, mode = ENVIRONMENT_LOCATION_MODES.RESIDENCE, currentPosition = null } = {}) {
  if (mode === ENVIRONMENT_LOCATION_MODES.CURRENT_POSITION) {
    if (!currentPosition) return Object.freeze({ available: false, mode, reason: "permission-not-requested" });
    return Object.freeze({ available: true, mode, source: "current-position", ...currentPosition });
  }
  const place = profile?.residencePlace;
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || !place.timezone) {
    return Object.freeze({ available: false, mode: ENVIRONMENT_LOCATION_MODES.RESIDENCE, reason: "residence-location-missing" });
  }
  return Object.freeze({
    available: true, mode: ENVIRONMENT_LOCATION_MODES.RESIDENCE, source: "residence",
    latitude: place.latitude, longitude: place.longitude, timezone: place.timezone,
    label: [place.city, place.country].filter(Boolean).join(" · "),
  });
}
