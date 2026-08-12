const HISTORY_KEY = "tao.yijingReadings.v1";
const MAX_READINGS = 60;

function parseHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.id && entry?.question && Array.isArray(entry.lines) && entry.lines.length === 6) : [];
  } catch {
    return [];
  }
}

export function getYijingHistory({ profileId } = {}) {
  const readings = parseHistory().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return profileId ? readings.filter((entry) => entry.profileId === profileId) : readings;
}

export function saveYijingReading(reading) {
  if (!reading?.question?.trim() || !Array.isArray(reading.lines) || reading.lines.length !== 6) throw new TypeError("Tirage Yi Jing incomplet.");
  const entry = Object.freeze({
    ...reading,
    id: reading.id ?? (crypto.randomUUID?.() ?? `yijing-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    createdAt: reading.createdAt ?? new Date().toISOString(),
  });
  const next = [entry, ...parseHistory().filter(({ id }) => id !== entry.id)].slice(0, MAX_READINGS);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return entry;
}

export function deleteYijingReading(id) {
  const before = parseHistory();
  const after = before.filter((entry) => entry.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(after));
  return after.length !== before.length;
}

export function toggleYijingFavorite(id) {
  const readings = parseHistory();
  const target = readings.find((entry) => entry.id === id);
  if (!target) return null;
  const favorite = !target.favorite;
  const next = readings.map((entry) => entry.id === id ? { ...entry, favorite } : entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return favorite;
}

export function clearYijingHistoryForTests() {
  localStorage.removeItem(HISTORY_KEY);
}
