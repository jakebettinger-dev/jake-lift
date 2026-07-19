/* Jake.Lift service worker — offline app shell.
   Bump CACHE (v1 -> v2) whenever you upload a new index.html so phones fetch the update. */
const CACHE = "jakelift-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

const CDN = [
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL).catch(() => {});
    // Best-effort: cache the CDN libraries so the app also works fully offline.
    await Promise.all(CDN.map(async (u) => {
      try { const r = await fetch(u, { mode: "no-cors" }); await cache.put(u, r); } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      return await fetch(e.request);
    } catch (_) {
      const fallback = await caches.match("./index.html");
      return fallback || Response.error();
    }
  })());
});
