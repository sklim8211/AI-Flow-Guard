---
name: Republish data safety
description: When a Replit user reports localStorage data disappearing after republishing a static PWA, what is and isn't actually happening.
---

# Rule

Republishing a static PWA on Replit does NOT clear user localStorage on the published `.replit.app` origin. The origin is stable across republishes, and a normal vite + vite-plugin-pwa build does not touch `localStorage` on activation. If a user claims data vanished after publish, the prime suspect is **origin mismatch**, not the build pipeline.

# Why

Verified empirically on 2026-05-26 (QQ Sidecar): user created a project on `https://<app>--<user>.replit.app/app/`, closed the PWA window, republished from the Replit panel, reopened — workspace data was intact. A kill-switch service worker shipped previously only calls `caches.delete()` and `registration.unregister()`, neither of which touches `localStorage` or IndexedDB.

# How to apply

When a user reports "my data is gone after I republished":

1. Don't accept their framing immediately. The two real origins they may have used are usually:
   - dev preview: `https://<id>.<region>.replit.dev/<base>/` (and the Replit canvas iframe variant `__replco/workspace_iframe.html`)
   - published: `https://<slug>--<user>.replit.app/<base>/`
   These are separate origins → separate localStorage. PWA windows hide the address bar so users often can't tell which one they installed from.
2. Have them run `location.origin` in the PWA's DevTools console to confirm which origin they're on.
3. Reproduce with a build marker (`console.log("[QQ-BUILD ...]")` in `main.tsx`) so they can verify a new bundle actually shipped before vs. after.
4. Only after the user reproduces data loss on a single, confirmed origin should you start digging into SW/IDB/code causes. Until then, treat it as origin confusion.

# Related gap (not yet fixed)

`artifacts/ai-flow/src/lib/fsAccess.ts` is write-only: even though users back up to a real disk folder via File System Access API, the app has no "import from connected folder" path. If localStorage IS ever wiped (browser data clear, different device, etc.), users with on-disk backups still can't recover inside the app without manual console scripts. A read/rebuild path is the right defensive feature, but should only be built after a real user need (not a false-alarm data loss).
