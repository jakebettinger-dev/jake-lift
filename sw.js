/* Jake.Lift service worker.
   Network-first so updates always show when online; falls back to cache offline.
   Same-origin requests bypass the HTTP cache ({cache:"reload"}) so a new app.js
   is always picked up when online — this is what makes updates land on iOS PWAs.
   Bump CACHE (v4 -> v5 ...) whenever you upload a new app.js or index.html. */
const CACHE = "jakelift-v6";

const SHELL = [
  "./", "./index.html", "./app.js", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
];
const CDN = [
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Fetch the shell bypassing the HTTP cache so we never re-cache a stale app.js.
    await Promise.all(SHELL.map(async (u) => {
      try { const r = await fetch(u, { cache: "reload" }); if (r && r.ok) await cache.put(u, r); } catch (_) {}
    }));
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
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  e.respondWith((async () => {
    try {
      // For our own files, bypass the browser HTTP cache so updates are instant online.
      const res = sameOrigin ? await fetch(req, { cache: "reload" }) : await fetch(req);
      if (sameOrigin && res && res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (_) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        const shell = await caches.match("./index.html");
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
