---
name: AI handoff document → polite acknowledgement trap
description: When a user pastes a structured handoff document (Resume/Next/Anchors) into AI without a follow-up instruction, the AI tends to praise/summarize the document instead of acting on it. Our product mitigates this with copy-time suffix wrappers, in the same family as the existing DRAFTS prefix/suffix wrapper.
---

## The pattern

A well-formed handoff document — metadata header, sections, filename footer — *looks complete*. When the user pastes it alone into a chat, the AI's default behavior is:

> "Perfect, this is well-organized. You can use this in your next session to pick up where you left off..."

It treats the document as a finished artifact to be acknowledged, not as an instruction to be executed. This is not a bug in our prompt design; it is AI default politeness in the absence of an explicit imperative.

## Why this matters for us

Our entire product loop depends on documents being **actionable when pasted**. If the user has to remember to add "now start from IMMEDIATE" every time, the friction kills the loop — especially for non-technical users (our target). The 63yr indie-founder owner experienced this firsthand and called it "어려운" (hard).

## How to apply

When designing a new prompt that produces an output the user will paste back into AI, ask: *what one-line instruction would convert this document from "look at me" to "do this"?* Then ship that instruction as a **copy-time suffix wrapper** keyed by destination folder, alongside the prompt itself.

Current wrappers live in `FileViewModal.tsx` keyed by top-level folder name:
- DRAFTS — prefix+suffix telling AI to read silently as reference, wait for next instruction (inverse case)
- NEXT — suffix telling AI to start work on IMMEDIATE
- CURRENT — suffix telling AI to continue from this context, recommend one next step
- ANCHORS — suffix telling AI these are guardrails for future decisions

**Why:** Document and instruction live in different layers — the document is durable artifact, the instruction is the runtime call. Embedding the instruction *in the document body* would pollute it for other uses (sharing, archival, future recall). Adding it at copy time is the cleanest separation.

**Gotcha:** Detection is by folder name string, not folder ID. If the user renames a standard folder the wrapper silently disengages. Accepted tradeoff — user-renamed folders are out-of-system "blind zone" by design.

## Non-application

Do NOT add wrappers for SUMMARIES (ambiguous use — could be reference, could be starting point) or SAFE (Restore is its own explicit prompt). The wrapper should only exist when the *predominant* use of the file is to be acted on immediately.
