const CACHE = "gamehub-tts-test-v0.3";
const APP_SHELL = [
  "./style.css?v=0.3",
  "./app.js?v=0.3",
  "./manifest.json?v=0.3",
  "./icon-192.png?v=0.3",
  "./icon-512.png?v=0.3"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("gamehub-tts-test-") && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // IMPORTANT: HTML/navigation is network-first so GitHub updates don't get trapped
  // behind an old cached index.html in an installed iOS PWA.
  if (event.request.mode === "navigate" ||
      event.request.destination === "document" ||
      url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Versioned local assets can be cache-first.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
