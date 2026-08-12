const CACHE_VERSION = "tao-shell-2026-08-12-v5";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=nebula-mobile-1",
  "./product-experience.css?v=tao-product-v3",
  "./locales/index.js",
  "./yijing-view.js?v=tao-yijing-3",
  "./yijing-engine.mjs?v=1.0.1",
  "./yijing-data.mjs?v=1.0.1",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("tao-shell-") && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) ?? Promise.reject(error);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isDocument = request.mode === "navigate" || request.destination === "document";
  event.respondWith(isDocument ? networkFirst(request) : cacheFirst(request));
});
