import {
  buildFamilyDatasetHash,
  estimateFamilyRarity,
  FAMILY_RARITY_ENGINE_VERSION,
  FAMILY_RARITY_MODELS,
} from "./family-rarity-engine.mjs?v=2.0.1";
import { familyConstellationEngineVersion } from "./family-number-engine.mjs?v=3.1.0";

const CACHE_PREFIX = "tao.familyRarity.v2.";

function storageOrNull(storage) {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function familyRarityCacheKey(input, { simulationCount = 2_000, model = FAMILY_RARITY_MODELS.conditional } = {}) {
  return `${CACHE_PREFIX}${buildFamilyDatasetHash(input)}.${familyConstellationEngineVersion}.${FAMILY_RARITY_ENGINE_VERSION}.${model}.${simulationCount}`;
}

export function getCachedFamilyRarity(input, options = {}, storage) {
  const target = storageOrNull(storage);
  if (!target) return null;
  try {
    const value = JSON.parse(target.getItem(familyRarityCacheKey(input, options)) ?? "null");
    if (!value || value.engineVersion !== familyConstellationEngineVersion || value.version !== FAMILY_RARITY_ENGINE_VERSION) return null;
    return value;
  } catch {
    return null;
  }
}

export function setCachedFamilyRarity(input, options, value, storage) {
  const target = storageOrNull(storage);
  if (!target) return value;
  try {
    target.setItem(familyRarityCacheKey(input, options), JSON.stringify(value));
  } catch {
    // Le calcul reste utilisable même lorsque le stockage privé est saturé ou indisponible.
  }
  return value;
}

export function clearFamilyRarityCache(storage) {
  const target = storageOrNull(storage);
  if (!target) return 0;
  const keys = [];
  for (let index = 0; index < target.length; index += 1) {
    const key = target.key(index);
    if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => target.removeItem(key));
  return keys.length;
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `family-rarity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function requestFamilyRarity(input, options = {}) {
  const normalizedOptions = {
    simulationCount: options.simulationCount ?? 2_000,
    model: options.model ?? FAMILY_RARITY_MODELS.conditional,
  };
  const cached = getCachedFamilyRarity(input, normalizedOptions, options.storage);
  if (cached) {
    options.onProgress?.({ completed: cached.simulationCount, total: cached.simulationCount, ratio: 1, cacheHit: true });
    return Object.freeze({ ...cached, cacheHit: true });
  }

  if (typeof Worker === "undefined") {
    const result = await new Promise((resolve) => setTimeout(() => resolve(estimateFamilyRarity(input, { ...normalizedOptions, onProgress: options.onProgress })), 0));
    setCachedFamilyRarity(input, normalizedOptions, result, options.storage);
    return Object.freeze({ ...result, cacheHit: false, usedWorker: false });
  }

  const id = requestId();
  const worker = new Worker(new URL("./family-rarity-worker.js?v=2.0.1", import.meta.url), { type: "module", name: "tao-family-rarity" });
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("L’analyse statistique prend plus de temps que prévu."));
    }, options.timeoutMs ?? 180_000);
    worker.addEventListener("message", (event) => {
      if (event.data?.requestId !== id) return;
      if (event.data.type === "progress") options.onProgress?.(event.data.progress);
      if (event.data.type === "result") {
        clearTimeout(timeout);
        worker.terminate();
        resolve(event.data.result);
      }
      if (event.data.type === "error") {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(event.data.error));
      }
    });
    worker.addEventListener("error", (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(error.message || "Le calcul statistique n’a pas pu démarrer."));
    });
    worker.postMessage({ requestId: id, input, options: normalizedOptions });
  });
  setCachedFamilyRarity(input, normalizedOptions, result, options.storage);
  return Object.freeze({ ...result, cacheHit: false, usedWorker: true });
}
