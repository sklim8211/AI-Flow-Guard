---
name: kind→folder routing fragility
description: Why AI-emitted YAML metadata silently lands files in the wrong (default) folder
---

# kind→folder routing fragility

Files saved via the clipboard/save modal are routed to a folder by their YAML `kind:` value, matched against a `kind → folder` lookup. When the match fails, the file silently falls back to the FIRST folder (CURRENT) — there is NO error, so it looks like "everything goes to CURRENT regardless of kind."

**Two failure modes that broke routing:**
1. **Quoted values** — AI commonly emits `kind: "anchors"` (with quotes). The YAML parser must strip surrounding quotes from values, or the quoted string never matches a lookup key.
2. **Singular/plural & synonyms** — our prompts emit plural (`anchors`, `summary`), but AI sometimes writes singular (`anchor`) or variants. The lookup must include alias keys (anchor↔anchors, summary↔summaries).

**Why:** the routing depends on AI-generated text, which is inconsistent in casing, quoting, and pluralization. Treat any metadata value coming back from AI as untrusted/sloppy and normalize aggressively (lowercase + strip quotes + accept aliases).

**How to apply:** whenever you add a new `kind` or a new metadata-driven router, (a) normalize the parsed value (lowercase, strip quotes/whitespace), and (b) register BOTH singular and plural keys in the lookup. The fallback-to-first-folder is intentional (never block a save) but means mismatches fail silently — test new kinds end to end.
