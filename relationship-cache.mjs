const relationshipReadingCache = new Map();

export function getCachedRelationshipReading(key) {
  return relationshipReadingCache.get(key) ?? null;
}

export function setCachedRelationshipReading(key, reading) {
  relationshipReadingCache.set(key, reading);
  return reading;
}

export function clearRelationshipReadingCache() {
  relationshipReadingCache.clear();
}

export function getRelationshipReadingCacheSize() {
  return relationshipReadingCache.size;
}
