const SETTINGS_KEY = "tao.ai.settings.v1";
const MEMORY_KEY = "tao.ai.memory.v1";
const SESSION_MAX_MESSAGES = 8;

function read(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) ?? "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function getTaoAISettings(storage = localStorage) {
  const value = read(storage, SETTINGS_KEY, {});
  return Object.freeze({ enabled: value.enabled === true, noticeAcceptedAt: value.noticeAcceptedAt ?? null });
}

export function setTaoAIEnabled(enabled, storage = localStorage) {
  const current = getTaoAISettings(storage);
  const next = {
    enabled: Boolean(enabled),
    noticeAcceptedAt: enabled ? current.noticeAcceptedAt ?? new Date().toISOString() : current.noticeAcceptedAt,
  };
  storage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return Object.freeze(next);
}

export function getTaoAIContinuity(profileId, storage = localStorage) {
  const all = read(storage, MEMORY_KEY, {});
  const value = all?.[profileId] ?? {};
  return Object.freeze({
    lastVisit: value.lastVisit ?? null,
    recentTopics: Object.freeze(Array.isArray(value.recentTopics) ? value.recentTopics.slice(-5) : []),
    recentConversationSummary: typeof value.recentConversationSummary === "string" ? value.recentConversationSummary.slice(0, 700) : "",
    explicitMemories: Object.freeze(Array.isArray(value.explicitMemories) ? value.explicitMemories.slice(-12) : []),
  });
}

export function updateTaoAIContinuity(profileId, update, storage = localStorage) {
  if (!profileId) return null;
  const all = read(storage, MEMORY_KEY, {});
  const current = getTaoAIContinuity(profileId, storage);
  const topics = [...current.recentTopics, ...(update.recentTopics ?? [])]
    .map((item) => String(item).trim().slice(0, 80)).filter(Boolean).slice(-5);
  const next = {
    lastVisit: update.lastVisit ?? new Date().toISOString(),
    recentTopics: [...new Set(topics)],
    recentConversationSummary: String(update.recentConversationSummary ?? current.recentConversationSummary).slice(0, 700),
    explicitMemories: current.explicitMemories,
  };
  all[profileId] = next;
  storage.setItem(MEMORY_KEY, JSON.stringify(all));
  return Object.freeze(next);
}

export function rememberExplicitly(profileId, text, storage = localStorage) {
  if (!profileId || !String(text).trim()) return null;
  const all = read(storage, MEMORY_KEY, {});
  const current = getTaoAIContinuity(profileId, storage);
  const memory = Object.freeze({ id: crypto.randomUUID?.() ?? `memory-${Date.now()}`, text: String(text).trim().slice(0, 280), createdAt: new Date().toISOString() });
  all[profileId] = { ...current, explicitMemories: [...current.explicitMemories, memory].slice(-12) };
  storage.setItem(MEMORY_KEY, JSON.stringify(all));
  return memory;
}

export function clearTaoAIMemory(profileId, storage = localStorage) {
  const all = read(storage, MEMORY_KEY, {});
  delete all[profileId];
  storage.setItem(MEMORY_KEY, JSON.stringify(all));
  const cachePrefix = `tao.ai.daily.v1.${profileId}.`;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(cachePrefix)) storage.removeItem(key);
  }
}

export function trimSessionMessages(messages) {
  return (Array.isArray(messages) ? messages : []).slice(-SESSION_MAX_MESSAGES).flatMap((message) => {
    const role = message?.role === "assistant" ? "assistant" : message?.role === "user" ? "user" : null;
    const content = typeof message?.content === "string" ? message.content.trim().slice(0, 2000) : "";
    return role && content ? [{ role, content }] : [];
  });
}
