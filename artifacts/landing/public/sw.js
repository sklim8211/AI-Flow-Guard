// Kill-switch service worker.
//
// The previous app at "/" (the Sidecar PWA) registered a service worker at
// "/sw.js" that precached its own index.html and intercepted every navigation
// under scope "/". After moving the Sidecar app to "/app/" and putting the
// landing page at "/", returning visitors still see the cached old app
// because the old SW intercepts their requests.
//
// This file replaces that old SW. When the browser fetches /sw.js and sees
// new bytes, it installs this one. On activation, this SW:
//   1. deletes every cache it can reach
//   2. unregisters itself
//   3. reloads any open client windows so they fetch the real new page
//
// After it has run once per browser, /sw.js is unregistered and the
// landing page (which does not register a service worker) is served
// directly from the network like any normal static site.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch (_) {
        /* ignore */
      }
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          try {
            client.navigate(client.url);
          } catch (_) {
            /* ignore */
          }
        }
      } catch (_) {
        /* ignore */
      }
    })(),
  );
});

// No fetch handler on purpose — let the browser go to the network for
// everything while this SW is briefly active before unregistering.
