const CACHE_VERSION = "tao-shell-2026-08-13-v19-relations";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=tao-environment-4",
  "./product-experience.css?v=tao-relations-3",
  "./locales/index.js?v=1.3.0",
  "./locales/fr/index.js?v=1.3.0",
  "./locales/fr/profiles.js?v=relations-1",
  "./locales/fr/semantics.js",
  "./semantic-layer.mjs?v=1.0.1",
  "./shared/tao-ai-contract.mjs",
  "./tao-ai-config.js",
  "./tao-ai-memory.js",
  "./tao-ai-cache.mjs",
  "./tao-ai-context.mjs",
  "./tao-ai-client.js",
  "./tao-ai-presence.js",
  "./tao-ai-conversation.js?v=tao-brain-mobile-2",
  "./navigation-routes.mjs",
  "./section-navigation.js",
  "./app-navigation.js?v=tao-tree-1",
  "./today-view.js?v=tao-semantics-2",
  "./bazi-theme.js?v=tao-semantics-2",
  "./profiles-view.js?v=tao-relations-5",
  "./relationships-view.js?v=1.0.4",
  "./relationship-engine.mjs",
  "./relationship-semantic.mjs?v=1.0.2",
  "./yijing-view.js?v=tao-semantics-2",
  "./pavilion-portals.js?v=tao-semantics-2",
  "./exterior-states.js?v=outside-environment-1",
  "./environment-controller.js?v=tao-environment-7",
  "./environment-location.mjs?v=1.0.0",
  "./environment-engine.mjs?v=1.0.2",
  "./solar-engine.mjs?v=1.0.0",
  "./time-zone.mjs",
  "./weather-service.mjs?v=1.0.1",
  "./yijing-engine.mjs?v=1.0.1",
  "./yijing-data.mjs?v=1.0.1",
  "./public/assets/tao/outside/states/OUTSIDE_CREPUSCULE_ROSE_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_JOUR_ENSOLEILLE_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_JOUR_CLAIR_FJORD_ALPIN.png",
  "./public/assets/tao/outside/states/OUTSIDE_APRES_MIDI_ENSOLEILLE_FJORD_ALPIN.png",
  "./public/assets/tao/outside/states/OUTSIDE_COUCHER_DE_SOLEIL_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_NUIT_ETOILEE_FJORD_ALPIN.png",
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
