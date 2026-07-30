/* NNCC Portal service worker — offline shell + fast static assets.
   Bump CACHE_VERSION on every release so clients pick up new files. */
const CACHE_VERSION = "nncc-v3";
const SHELL = [
  "login.html", "portal.html", "learning.html", "events.html", "forum.html",
  "assistant.html", "certificate.html",
  "styles.css", "portal.css", "portal-mobile.css",
  "portal-config.js", "portal-auth.js", "portal-shell.js", "portal-media.js",
  "app-boot.js", "countries.js",
  "logo-nncc.png", "favicon.ico", "manifest.webmanifest",
  "offline.html"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/functions/") || url.pathname.includes("/rest/") ||
      url.pathname.includes("/auth/")) return;
  const isHTML = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match("offline.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (res.type === "basic")) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
