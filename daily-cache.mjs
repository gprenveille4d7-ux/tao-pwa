import { DAILY_CALCULATION_VERSION } from "./daily-tao-engine.mjs?v=2.3.1";

const CACHE_PREFIX = "tao.daily.v2";

function key(profileId, date) {
  return `${CACHE_PREFIX}.${profileId}.${date}`;
}

export function createDailyFingerprint({ profile, date, timeZone, natalTheme }) {
  return JSON.stringify({
    version: DAILY_CALCULATION_VERSION,
    profileId: profile.id,
    date,
    timeZone,
    natalVersion: natalTheme.calculationVersion,
    updatedAt: profile.updatedAt,
  });
}

export function getCachedDaily(input, storage = localStorage) {
  try {
    const cached = JSON.parse(storage.getItem(key(input.profile.id, input.date)) ?? "null");
    if (!cached || cached.fingerprint !== createDailyFingerprint(input)) return null;
    if (cached.result?.calculationVersion !== DAILY_CALCULATION_VERSION) return null;
    return cached.result;
  } catch {
    return null;
  }
}

export function setCachedDaily(input, result, storage = localStorage) {
  storage.setItem(key(input.profile.id, input.date), JSON.stringify({ fingerprint: createDailyFingerprint(input), result }));
  return result;
}

export function clearDailyCacheForProfile(profileId, storage = localStorage) {
  const prefix = `${CACHE_PREFIX}.${profileId}.`;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const storageKey = storage.key(index);
    if (storageKey?.startsWith(prefix)) storage.removeItem(storageKey);
  }
}
