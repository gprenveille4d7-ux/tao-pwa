const PREFIX = "tao.ai.daily.v1";

export function stableHash(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createTaoAICacheKey({ profileId, localDate, facts, promptVersion, modelVersion = "server" }) {
  return `${PREFIX}.${profileId}.${localDate}.${stableHash({ facts, promptVersion, modelVersion })}`;
}

export function getCachedTaoAI(key, storage = localStorage) {
  try {
    const entry = JSON.parse(storage.getItem(key) ?? "null");
    return entry?.response && entry?.createdAt ? entry : null;
  } catch {
    return null;
  }
}

export function setCachedTaoAI(key, value, storage = localStorage) {
  const entry = { ...value, createdAt: value.createdAt ?? new Date().toISOString() };
  storage.setItem(key, JSON.stringify(entry));
  return entry;
}
