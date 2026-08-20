const EVENTS_KEY = "tao.familyEvents.v1";
const PREFERENCES_KEY = "tao.familyConstellationPreferences.v1";

export const FAMILY_EVENT_TYPES = Object.freeze(["meeting", "marriage", "pacs", "birth", "death", "move", "union", "separation", "family", "personal", "other"]);
export const FAMILY_ROLES = Object.freeze(["parent", "child", "partner", "sibling", "grandparent", "grandchild", "other"]);

function readJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validTime(value) {
  return value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? "");
}

function validPlace(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length <= 120;
  return typeof value === "object" && typeof value.label === "string" && value.label.trim().length <= 120 &&
    (value.latitude === undefined || Number.isFinite(Number(value.latitude))) &&
    (value.longitude === undefined || Number.isFinite(Number(value.longitude)));
}

export function isValidFamilyEvent(event) {
  return Boolean(
    event && typeof event.id === "string" && event.id &&
    typeof event.title === "string" && event.title.trim() &&
    validIsoDate(event.date) && validTime(event.time ?? null) &&
    validPlace(event.place) &&
    (event.note === null || event.note === undefined || (typeof event.note === "string" && event.note.length <= 500)) &&
    FAMILY_EVENT_TYPES.includes(event.type) &&
    Array.isArray(event.profileIds) && event.profileIds.length > 0 && event.profileIds.every((id) => typeof id === "string" && id),
  );
}

export function getFamilyEvents(storage = localStorage) {
  const events = readJson(storage, EVENTS_KEY, []);
  return Array.isArray(events) ? events.filter(isValidFamilyEvent) : [];
}

export function saveFamilyEvent(event, storage = localStorage) {
  if (!isValidFamilyEvent(event)) throw new TypeError("L’événement familial est incomplet.");
  const next = getFamilyEvents(storage).filter(({ id }) => id !== event.id);
  const normalized = { ...event, profileIds: [...new Set(event.profileIds)] };
  if (typeof event.place === "string") normalized.place = event.place.trim();
  else if (event.place) normalized.place = {
    ...event.place,
    label: event.place.label.trim(),
    ...(event.place.latitude === undefined ? {} : { latitude: Number(event.place.latitude) }),
    ...(event.place.longitude === undefined ? {} : { longitude: Number(event.place.longitude) }),
  };
  next.push(Object.freeze(normalized));
  next.sort((left, right) => left.date.localeCompare(right.date));
  storage.setItem(EVENTS_KEY, JSON.stringify(next));
  return event;
}

export function deleteFamilyEvent(eventId, storage = localStorage) {
  const before = getFamilyEvents(storage);
  const after = before.filter(({ id }) => id !== eventId);
  storage.setItem(EVENTS_KEY, JSON.stringify(after));
  return after.length !== before.length;
}

export function createFamilyEventId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `family-event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function validPreferences(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function getFamilyConstellationPreferences(storage = localStorage) {
  const value = readJson(storage, PREFERENCES_KEY, {});
  if (!validPreferences(value)) return Object.freeze({ selectedProfileIds: [], roles: {}, symbolicReading: false });
  const selectedProfileIds = Array.isArray(value.selectedProfileIds) ? value.selectedProfileIds.filter((id) => typeof id === "string") : [];
  const roles = Object.fromEntries(Object.entries(value.roles ?? {}).filter(([id, role]) => typeof id === "string" && FAMILY_ROLES.includes(role)));
  return Object.freeze({ selectedProfileIds: Object.freeze(selectedProfileIds), roles: Object.freeze(roles), symbolicReading: Boolean(value.symbolicReading) });
}

export function saveFamilyConstellationPreferences(preferences, storage = localStorage) {
  const normalized = {
    selectedProfileIds: [...new Set(preferences.selectedProfileIds ?? [])],
    roles: Object.fromEntries(Object.entries(preferences.roles ?? {}).filter(([, role]) => FAMILY_ROLES.includes(role))),
    symbolicReading: Boolean(preferences.symbolicReading),
  };
  storage.setItem(PREFERENCES_KEY, JSON.stringify(normalized));
  return Object.freeze(normalized);
}

export function clearFamilyConstellationData(storage = localStorage) {
  storage.removeItem(EVENTS_KEY);
  storage.removeItem(PREFERENCES_KEY);
}
