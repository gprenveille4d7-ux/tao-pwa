const CACHE_VERSION = "tao-shell-2026-08-25-v40-day-master-archetypes";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./public/icons/icon-192.png",
  "./public/icons/icon-512.png",
  "./public/icons/icon-512-maskable.png",
  "./styles.css?v=tao-environment-4",
  "./product-experience.css?v=tao-seasonal-1",
  "./tao-components.css?v=archetypes-1",
  "./tao-components.js?v=1.1.0",
  "./vendor/astronomy.browser.min.js?v=2.1.19",
  "./vendor/ASTRONOMY-ENGINE-LICENSE.txt",
  "./celestial-engine.mjs?v=1.0.0",
  "./da-yun-engine.mjs?v=1.0.0",
  "./locales/index.js?v=1.6.0",
  "./locales/fr/index.js?v=1.6.0",
  "./locales/fr/glossary.js",
  "./locales/fr/seasonal.js",
  "./locales/fr/profiles.js?v=relationship-goals-1",
  "./locales/fr/semantics.js",
  "./semantic-layer.mjs?v=1.0.1",
  "./shared/tao-ai-contract.mjs",
  "./tao-ai-config.js",
  "./tao-ai-memory.js",
  "./tao-ai-cache.mjs",
  "./tao-ai-context.mjs",
  "./tao-ai-client.js",
  "./tao-ai-presence.js",
  "./tao-conversation-format.mjs",
  "./tao-ai-conversation.js?v=tao-conversation-sheet-1",
  "./navigation-routes.mjs?v=tao-ux-2",
  "./section-navigation.js?v=tao-ux-3",
  "./app-navigation.js?v=clarity-1",
  "./today-view.js?v=season-library-1",
  "./daily-tao-engine.mjs?v=2.3.0",
  "./seasonal-balance.mjs?v=1.2.0",
  "./seasonal-knowledge.mjs?v=1.0.0",
  "./seasonal-library.js?v=1.0.0",
  "./daily-personal-signature.mjs",
  "./daily-cache.mjs?v=2.2.0",
  "./bazi-theme.js?v=archetypes-1",
  "./day-master-archetypes.mjs?v=1.0.0",
  "./profiles-view.js?v=clarity-2",
  "./onboarding.js?v=clarity-1",
  "./profile-store.js",
  "./relationships-view.js?v=tao-ux-2",
  "./relationship-engine.mjs?v=1.1.0",
  "./relationship-semantic.mjs?v=1.1.0",
  "./relationship-cache.mjs?v=1.0.0",
  "./family-constellation-store.js",
  "./family-number-engine.mjs?v=3.1.0",
  "./family-number-engine.mjs",
  "./family-inventory-engine.mjs?v=1.0.0",
  "./family-inventory-engine.mjs",
  "./family-deep-engine.mjs?v=3.1.0",
  "./family-deep-engine.mjs",
  "./family-pattern-engine.mjs?v=2.0.0",
  "./family-pattern-engine.mjs",
  "./family-constellation-semantic.mjs?v=4.0.0",
  "./family-constellation-view.js?v=tao-ux-2",
  "./family-constellation-lexicon.mjs?v=1.0.0",
  "./yijing-view.js?v=clarity-1",
  "./pavilion-portals.js?v=clarity-1",
  "./exterior-states.js?v=outside-environment-1",
  "./environment-controller.js?v=clarity-2",
  "./environment-location.mjs?v=1.0.0",
  "./environment-engine.mjs?v=1.0.3",
  "./solar-engine.mjs?v=1.0.1",
  "./time-zone.mjs",
  "./weather-service.mjs?v=1.1.0",
  "./yijing-engine.mjs?v=1.0.1",
  "./yijing-data.mjs?v=1.0.1",
  "./public/assets/tao/outside/states/OUTSIDE_CREPUSCULE_ROSE_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_JOUR_ENSOLEILLE_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_JOUR_CLAIR_FJORD_ALPIN.png",
  "./public/assets/tao/outside/states/OUTSIDE_APRES_MIDI_ENSOLEILLE_FJORD_ALPIN.png",
  "./public/assets/tao/outside/states/OUTSIDE_COUCHER_DE_SOLEIL_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_NUIT_ETOILEE_FJORD_ALPIN.png",
  "./public/assets/tao/outside/states/OUTSIDE_NUIT_ETOILEE_CROISSANT_VILLAGE_NORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_PLEINE_LUNE_VILLAGE_FJORDIQUE.png",
  "./public/assets/tao/outside/states/OUTSIDE_VOIE_LACTEE_FJORD_ALPIN.png",
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
