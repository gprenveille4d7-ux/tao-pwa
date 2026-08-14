const EVENTS_KEY = "tao.familyEvents.v1";
const PREFERENCES_KEY = "tao.familyConstellationPreferences.v1";

export const FAMILY_EVENT_TYPES = Object.freeze(["meeting", "marriage", "birth", "move", "union", "separation", "personal", "other"]);
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

export function isValidFamilyEvent(event) {
  return Boolean(
    event && typeof event.id === "string" && event.id &&
    typeof event.title === "string" && event.title.trim() &&
    validIsoDate(event.date) && validTime(event.time ?? null) &&
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
  next.push(Object.freeze({ ...event, profileIds: [...new Set(event.profileIds)] }));
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
