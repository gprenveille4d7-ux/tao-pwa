import { CALCULATION_VERSION } from "./bazi-engine.mjs";

const CACHE_PREFIX = "tao.bazi.v1";

export function createBaziFingerprint(profile) {
  return JSON.stringify({
    calculationVersion: CALCULATION_VERSION,
    profileId: profile.id,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthTimeKnown: profile.birthTimeKnown,
    city: profile.birthPlace?.city,
    country: profile.birthPlace?.country,
    latitude: profile.birthPlace?.latitude,
    longitude: profile.birthPlace?.longitude,
    timezone: profile.birthPlace?.timezone,
  });
}

function cacheKey(profileId) {
  return `${CACHE_PREFIX}.${profileId}`;
}

export function getCachedBazi(profile, storage = localStorage) {
  try {
    const cached = JSON.parse(storage.getItem(cacheKey(profile.id)) ?? "null");
    if (!cached || cached.fingerprint !== createBaziFingerprint(profile)) return null;
    if (cached.result?.calculationVersion !== CALCULATION_VERSION) return null;
    return cached.result;
  } catch {
    return null;
  }
}

export function setCachedBazi(profile, result, storage = localStorage) {
  storage.setItem(
    cacheKey(profile.id),
    JSON.stringify({ fingerprint: createBaziFingerprint(profile), result }),
  );
  return result;
}

export function clearCachedBazi(profileId, storage = localStorage) {
  storage.removeItem(cacheKey(profileId));
}
