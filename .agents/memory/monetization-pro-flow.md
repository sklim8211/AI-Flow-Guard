---
name: Pro monetization flow
description: How Sidecar's paid tier works and the deliberate limits/stubs in it
---

# Sidecar Pro monetization

Sidecar (ai-flow) has a paid "Pro" tier sold via **Lemon Squeezy** checkout (Monthly $8/mo, Annual $72/yr). Free tier is capped at **50 total files** across all projects/folders; Pro removes the cap.

**License activation is a client-side stub.** Activation accepts ANY non-empty string and stores it in `localStorage` under `qq_license_key`. There is NO server-side / Lemon Squeezy API verification yet — anyone can bypass the paywall by typing any text into the activate box.

**Why:** shipped the upgrade UX first; real key verification was explicitly deferred. The gate is honor-system / friction, not enforcement.

**How to apply:**
- Do not assume `qq_license_key` is a validated key. Before relying on it for anything that matters (e.g. server features), add real verification against Lemon Squeezy.
- The free-file gate only blocks NEW file creation; overwrites of existing files are intentionally allowed even at the limit (so users at 50 aren't trapped from editing).
- License presence drives UI (`hasLicense()`); save-time enforcement re-reads it fresh, so behavior stays correct even if UI state lags.
