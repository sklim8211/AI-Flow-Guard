---
name: PWA auto-update (vite-plugin-pwa)
description: How ai-flow forces clients onto new builds, and the non-obvious workbox-window dev dependency.
---

# PWA auto-update setup

To make a vite-plugin-pwa app push new builds to users without manual cache clearing:
- `registerType: "autoUpdate"` + `injectRegister: false`, then register manually via `virtual:pwa-register` in the entry file with `immediate: true`.
- `autoUpdate` alone is NOT enough for long-open tabs / installed PWAs: the default registration only checks for a new SW on navigation. Add a periodic `registration.update()` (interval) plus visibilitychange/focus triggers inside `onRegisteredSW`.
- workbox: `clientsClaim`, `skipWaiting`, `cleanupOutdatedCaches` all `true` (some redundant under autoUpdate, but explicit + safe).

**Why:** users reported stale code after a fix shipped — the service worker kept serving the old bundle. autoUpdate + periodic update() makes the new SW activate and the page auto-reload.

## Gotcha: workbox-window must be installed for manual registration
When you import `virtual:pwa-register` yourself (injectRegister:false), the **dev** SW register dynamically `import("workbox-window")`. If it's not a dependency, the dev server throws `Failed to resolve import "workbox-window"` and the app white-screens. Fix: `pnpm add -D workbox-window` in the artifact. (Client-only artifact → devDependency.)

## Gotcha: clean up interval/listeners on HMR
The interval + event listeners registered in `onRegisteredSW` leak across HMR reloads in dev. Wrap cleanup in `import.meta.hot?.dispose(...)`.
