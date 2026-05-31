/**
 * Prompt catalog — central source of truth for all standard prompts.
 *
 * Two categories:
 *  - Per-workflow (resume / summary / anchors / next): text varies by workflow type
 *    so a writer gets writing-focused prompts and a developer gets engineering-focused ones.
 *  - Common (compress / backup / restore): domain-agnostic safety tools — same text for everyone.
 *
 * All prompt outputs share the same YAML metadata header pattern so the
 * existing auto-routing in SaveResultModal keeps working. We added one field:
 * `workflow: <type>` so the receiving app can tell where a file belongs.
 */

export type WorkflowType =
  | "development"
  | "writing"
  | "research"
  | "design"
  | "strategy";

export interface WorkflowDef {
  id: WorkflowType;
  label: string; // short label
  emoji: string;
  description: string;
}

export const WORKFLOWS: WorkflowDef[] = [
  { id: "development", label: "Development", emoji: "💻", description: "Software & engineering" },
  { id: "writing", label: "Writing", emoji: "✍️", description: "Fiction, essays, scripts" },
  { id: "research", label: "Research", emoji: "🔍", description: "Research & analysis" },
  { id: "design", label: "Design", emoji: "🎨", description: "UX, UI & interaction" },
  { id: "strategy", label: "Strategy", emoji: "🧭", description: "Product & strategy" },
];

export type PromptId =
  | "resume"
  | "summary"
  | "anchors"
  | "next"
  | "compress"
  | "backup"
  | "restore";

export interface PromptDef {
  id: PromptId;
  label: string;
  description: string;
  defaultFolder: string;
  perWorkflow: boolean;
}

export const PROMPT_DEFS: PromptDef[] = [
  { id: "resume", label: "Resume Work", description: "Pick up where you left off", defaultFolder: "CURRENT", perWorkflow: true },
  { id: "summary", label: "Work Summary", description: "Wrap up the session", defaultFolder: "SUMMARIES", perWorkflow: true },
  { id: "anchors", label: "Extract Anchors", description: "Pull out key turning points", defaultFolder: "ANCHORS", perWorkflow: true },
  { id: "compress", label: "Compress Context", description: "Compress the context", defaultFolder: "CURRENT", perWorkflow: false },
  { id: "next", label: "Next Actions", description: "List the next things to do", defaultFolder: "NEXT", perWorkflow: true },
  { id: "backup", label: "Backup Snapshot", description: "Safety net before a big edit", defaultFolder: "SAFE", perWorkflow: false },
  { id: "restore", label: "Restore From Backup", description: "Restore context from a backup", defaultFolder: "CURRENT", perWorkflow: false },
];

/* ── Shared builder ────────────────────────────────────────── */

interface PromptParts {
  intro: string;
  focus?: string[];
  body: string;
  closing?: string;
}

function build(workflow: WorkflowType | "common", kind: PromptId, parts: PromptParts): string {
  const workflowLine = workflow === "common" ? "common" : workflow;
  const focusBlock = parts.focus && parts.focus.length > 0
    ? `\n\nFocus on:\n${parts.focus.map((f) => `- ${f}`).join("\n")}`
    : "";
  const closingBlock = parts.closing ? `\n\n${parts.closing}` : "";
  return `${parts.intro}${focusBlock}

Start the output with this YAML metadata header. Use the schema EXACTLY as shown — keep all field names and ordering, but replace every value inside square brackets with a real value. Do NOT keep the brackets or any inline comments in your output.

Schema:

---
version: v1
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: ${workflowLine}
kind: ${kind}
summary: [one short single-line description]
keywords: [3-5 comma-separated searchable keywords]
---

Then write the body in this structure:

${parts.body}${closingBlock}

End the output with ONE line in this exact format:
filename: ${kind}_[slug].md

Where [slug] is 3-5 lowercase English words joined by hyphens that describe the SPECIFIC topic, decision, or task this file is about (e.g. "auth-refactor-plan", "db-migration-rollback", "onboarding-copy-v2"). Do NOT use generic words like "notes", "update", "summary", "session", "work", "today", or the current date — the filename must convey what is unique about THIS file so it can be told apart from other ${kind} files later.

Wrap the entire output (header + body + filename line) inside a single fenced markdown code block so I can copy it as one piece.`;
}

/* ── Per-workflow templates ────────────────────────────────── */

type PerWorkflowKind = "resume" | "summary" | "anchors" | "next";

const PER_WORKFLOW: Record<WorkflowType, Record<PerWorkflowKind, PromptParts>> = {
  development: {
    resume: {
      intro: "You are helping me resume an ongoing software development workflow. Reconstruct the working context for fast re-entry.",
      focus: [
        "current architecture state",
        "recent implementation progress",
        "important technical decisions",
        "unresolved blockers",
        "dependencies or assumptions",
        "what the developer was trying to achieve",
      ],
      body: `CURRENT: [where the implementation is right now in 1-2 sentences]
ARCHITECTURE STATE: [key files / modules / boundaries currently in play]
RECENT DECISIONS: [important technical choices worth carrying]
BLOCKERS: [unresolved issues or open questions]
NEXT: [the most important next implementation step]`,
    },
    next: {
      intro: "You are helping me determine the next actionable engineering step in this development workflow.",
      focus: [
        "the most important next implementation task",
        "unresolved blockers",
        "technical priorities",
        "what should happen immediately next",
      ],
      body: `IMMEDIATE: [the single next implementation action]
TODAY: [2-3 things to land today]
THIS WEEK: [1-2 bigger goals for the week]
BLOCKERS: [anything that must be resolved first]
NOTES: [helpful technical context]`,
    },
    anchors: {
      intro: "You are helping me preserve critical engineering decisions from this development workflow.",
      focus: [
        "important architectural choices",
        "technical tradeoffs",
        "reasoning behind decisions",
        "assumptions worth preserving",
        "constraints that influenced the direction",
      ],
      body: `ANCHORS:
- [decision 1]
- [decision 2]
- [decision 3]

TRADEOFFS: [what was given up and why]
CONSTRAINTS: [hard limits that shaped the choice]
WHY IT MATTERS: [why future sessions must not lose this]`,
    },
    summary: {
      intro: "You are helping me summarize a software development work session.",
      body: `COMPLETED: [things shipped / merged / verified]
TECHNICAL CHANGES: [major code or schema changes]
DISCOVERIES: [things learned mid-session]
UNRESOLVED: [open issues or follow-ups]
DIRECTION: [where the project is headed]`,
    },
  },

  writing: {
    resume: {
      intro: "You are assisting with an ongoing writing and creative workflow. Preserve narrative and creative continuity.",
      focus: [
        "current narrative state",
        "emotional direction",
        "themes and tone",
        "important character or structural decisions",
        "unresolved creative questions",
        "next writing movement",
      ],
      body: `CURRENT NARRATIVE: [where the piece / story is right now]
TONE & THEMES: [active themes and emotional direction]
RECENT CREATIVE DECISIONS: [structural / character choices to carry]
OPEN THREADS: [unresolved scenes or questions]
NEXT MOVEMENT: [the natural next writing action]`,
    },
    next: {
      intro: "You are helping me determine the next creative movement in this writing workflow.",
      focus: [
        "emotional continuity",
        "narrative momentum",
        "unresolved scenes or themes",
        "pacing and tone",
        "next meaningful writing action",
      ],
      body: `NEXT MOVEMENT: [the single next writing action]
EMOTIONAL DIRECTION: [tone / feeling to carry forward]
CONTINUITY REMINDERS: [things to keep consistent across the next pages]
OPTIONAL IDEAS: [1-2 supporting alternatives]`,
    },
    anchors: {
      intro: "You are helping me preserve important creative decisions from this writing workflow.",
      focus: [
        "emotional anchors",
        "thematic decisions",
        "narrative direction",
        "tone-defining choices",
        "recurring motifs",
      ],
      body: `EMOTIONAL ANCHORS:
- [anchor 1]
- [anchor 2]

THEMATIC DECISIONS: [what the piece is really about]
NARRATIVE DIRECTION: [where the arc is headed]
RECURRING MOTIFS: [imagery / symbols to keep alive]
WHY IT MATTERS: [what emotional continuity must remain]`,
    },
    summary: {
      intro: "You are helping me summarize an ongoing writing session.",
      body: `NARRATIVE PROGRESS: [what advanced in the piece]
EMOTIONAL DEVELOPMENTS: [feelings / dynamics that shifted]
CREATIVE DISCOVERIES: [unexpected directions found]
UNRESOLVED TENSIONS: [open creative questions]
NEXT NARRATIVE DIRECTION: [where to go next]`,
    },
  },

  research: {
    resume: {
      intro: "You are assisting with an ongoing research workflow. Preserve reasoning continuity and investigative direction.",
      focus: [
        "current hypothesis",
        "recent findings",
        "unresolved uncertainties",
        "assumptions and evidence",
        "open research questions",
        "next investigation step",
      ],
      body: `CURRENT HYPOTHESIS: [the active working hypothesis]
RECENT FINDINGS: [most important results / observations]
KEY ASSUMPTIONS: [what we are taking for granted]
OPEN QUESTIONS: [unresolved uncertainties]
NEXT STEP: [the next investigative action]`,
    },
    next: {
      intro: "You are helping me determine the next investigative action in this research workflow.",
      focus: [
        "unresolved questions",
        "weak assumptions",
        "evidence gaps",
        "next validation steps",
        "areas requiring deeper investigation",
      ],
      body: `NEXT INVESTIGATION: [the single next research action]
SECONDARY PATHS: [1-2 alternative angles]
UNCERTAINTY NOTES: [what remains weakly supported]
EVIDENCE NEEDED: [what would settle the question]`,
    },
    anchors: {
      intro: "You are helping me preserve critical reasoning and findings from this research workflow.",
      focus: [
        "major findings",
        "strong assumptions",
        "weak points in reasoning",
        "important evidence",
        "conceptual shifts",
      ],
      body: `KEY FINDINGS:
- [finding 1]
- [finding 2]

STRONG ASSUMPTIONS: [foundations to keep]
WEAK POINTS: [reasoning that needs more support]
EVIDENCE TO PRESERVE: [sources / data worth re-citing]
WHY IT MATTERS: [what future sessions must remember]`,
    },
    summary: {
      intro: "You are helping me summarize a research session.",
      body: `DISCOVERIES: [what was uncovered]
HYPOTHESIS STATE: [strengthened / weakened / unchanged]
UNRESOLVED UNCERTAINTY: [open questions]
KEY EVIDENCE: [most important data points]
NEXT RESEARCH DIRECTION: [where to dig next]`,
    },
  },

  design: {
    resume: {
      intro: "You are assisting with an ongoing design workflow. Preserve design intent and usability continuity.",
      focus: [
        "current design direction",
        "user experience goals",
        "visual or interaction decisions",
        "unresolved UX problems",
        "feedback and observations",
        "next design iteration",
      ],
      body: `CURRENT DIRECTION: [where the design stands right now]
UX GOALS: [what experience we are trying to create]
RECENT DECISIONS: [interaction / visual choices to carry]
OPEN UX PROBLEMS: [unresolved friction]
NEXT ITERATION: [the next design step]`,
    },
    next: {
      intro: "You are helping me determine the next design iteration step.",
      focus: [
        "usability improvements",
        "interaction clarity",
        "unresolved friction points",
        "visual consistency",
        "next design refinement",
      ],
      body: `NEXT DESIGN ACTION: [the single next iteration step]
SUPPORTING IDEAS: [1-2 refinements worth trying]
CONTINUITY REMINDERS: [patterns / tokens to keep consistent]
USER IMPACT: [what this should change for the user]`,
    },
    anchors: {
      intro: "You are helping me preserve important UX and design decisions.",
      focus: [
        "interaction principles",
        "visual direction",
        "usability assumptions",
        "design tradeoffs",
        "emotional experience goals",
      ],
      body: `DESIGN ANCHORS:
- [decision 1]
- [decision 2]

INTERACTION PRINCIPLES: [rules that should not bend]
VISUAL DIRECTION: [tone / style commitments]
TRADEOFFS: [what we accepted losing]
WHY IT MATTERS: [what experience must stay consistent]`,
    },
    summary: {
      intro: "You are helping me summarize a design workflow session.",
      body: `DESIGN PROGRESS: [what advanced]
USABILITY FINDINGS: [observations / feedback signals]
VISUAL DECISIONS: [choices on type / color / layout]
UNRESOLVED UX: [open friction]
NEXT ITERATION DIRECTION: [where to go next]`,
    },
  },

  strategy: {
    resume: {
      intro: "You are assisting with an ongoing product and strategy workflow. Preserve strategic continuity across sessions.",
      focus: [
        "current product direction",
        "key assumptions",
        "strategic decisions",
        "unresolved risks",
        "market or user insights",
        "next strategic action",
      ],
      body: `CURRENT DIRECTION: [where the product / strategy stands]
KEY ASSUMPTIONS: [what we are betting on]
RECENT DECISIONS: [strategic moves to carry]
OPEN RISKS: [unresolved threats or unknowns]
NEXT STRATEGIC STEP: [the next meaningful action]`,
    },
    next: {
      intro: "You are helping me determine the next strategic move in this product workflow.",
      focus: [
        "priority decisions",
        "unresolved product risks",
        "user understanding gaps",
        "strategic alignment",
        "next meaningful action",
      ],
      body: `NEXT STRATEGIC ACTION: [the single next move]
SUPPORTING DIRECTIONS: [1-2 reinforcing actions]
CONTINUITY REMINDERS: [what alignment to preserve]
SIGNALS TO WATCH: [what would change the plan]`,
    },
    anchors: {
      intro: "You are helping me preserve important strategic decisions.",
      focus: [
        "product direction shifts",
        "key assumptions",
        "market insights",
        "strategic tradeoffs",
        "product philosophy decisions",
      ],
      body: `STRATEGIC ANCHORS:
- [decision 1]
- [decision 2]

KEY ASSUMPTIONS: [bets that shaped the path]
MARKET / USER INSIGHTS: [what we learned]
TRADEOFFS: [what we chose not to chase]
WHY IT MATTERS: [what future sessions should not lose]`,
    },
    summary: {
      intro: "You are helping me summarize a product / strategy session.",
      body: `STRATEGIC PROGRESS: [what shifted]
KEY INSIGHTS: [user / market signals captured]
DECISIONS MADE: [moves committed to]
OPEN RISKS: [unresolved threats]
NEXT STRATEGIC DIRECTION: [where to focus next]`,
    },
  },
};

/* ── Common (domain-agnostic) prompts ──────────────────────── */

const COMMON: Record<"compress" | "backup" | "restore", string> = {
  compress: build("common", "compress", {
    intro: "Please compress everything we know so far into the smallest possible summary I can paste at the start of a new conversation.",
    body: `CONTEXT: [project / task background in 2-3 sentences]
STATE: [exactly where we are right now]
CONSTRAINTS: [important limits or requirements]
NEXT: [the first action to take]`,
    closing: "Make it dense and paste-ready.",
  }),

  backup: `Please create a complete BACKUP SNAPSHOT of our current work state. This will be saved as a safety net before making a large or risky change.

Start the output with this YAML metadata header. Use the schema EXACTLY as shown — keep all field names and ordering, but replace every value inside square brackets with a real value. Do NOT keep the brackets or any inline comments in your output.

Schema:

---
version: [vN — next number if previous backups exist in this conversation, otherwise v1]
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: common
kind: backup
summary: [one short single-line summary of the current state]
changes_from_previous: |-
  - [bullet 1: what changed since previous backup]
  - [bullet 2 (optional)]
  - [bullet 3 (optional)]
  (write a single line "first backup" instead of bullets if this is v1)
restoration_hint: [single line — what someone needs to know to restore from this snapshot]
risk_level: [exactly one of: low | medium | high]
---

Then write the body in this structure:

1. CURRENT STATE — exactly where we are right now (2-3 sentences)
2. IN PROGRESS — what's actively being worked on
3. NEXT STEPS — the upcoming actions in order
4. DECISIONS & REASONS — important decisions made so far and why
5. CRITICAL INFO — anything that absolutely must not be lost (file paths, IDs, configs, exact values)
6. KNOWN RISKS — what could go wrong next, and how to recover

End the output with ONE line in this exact format (the [N] number MUST match the version number you used in the header):
filename: backup_v[N]_[slug].md

Where [slug] is 3-5 lowercase English words joined by hyphens describing what THIS backup is specifically protecting (e.g. "before-router-refactor", "pre-payment-migration"). Do NOT use generic words like "backup", "snapshot", "before-changes", or the current date — the slug must tell future-you exactly what state this snapshot captures.

Wrap the entire output (header + body + filename line) inside a single fenced markdown code block so I can copy it as one piece.`,

  restore: `I need to restore my working context from a backup snapshot. Below this message I will paste the full backup file content (it has a metadata header with version, created_at, workflow, summary, changes_from_previous, restoration_hint, risk_level, followed by the body).

Please:

1. Read the metadata header and confirm out loud: which version, when it was created, the summary, and the risk_level.
2. Reconstruct the full working context from the body: current state, in-progress work, next steps, key decisions, and critical info.
3. Highlight anything in "restoration_hint" that I should be careful about.
4. Tell me the SINGLE most important action to take right now to safely continue from this snapshot.
5. List anything in the backup that looks stale or might no longer apply (best-effort guess, clearly marked as a guess).

Rules:
- Do NOT invent details that aren't in the backup.
- If something critical is missing or ambiguous, ASK me a clarifying question instead of guessing.
- If the section below is empty or does not contain a metadata header, STOP and ask me to paste the full backup file first.
- Keep the response structured and scannable, not a wall of prose.

--- BACKUP FILE CONTENT BELOW ---

[paste backup file here]`,
};

/* ── Public API ────────────────────────────────────────────── */

/**
 * Returns the prompt text for a given prompt id + workflow.
 * For common prompts (compress / backup / restore), the workflow is ignored.
 */
export function getPromptText(id: PromptId, workflow: WorkflowType | null): string {
  if (id === "compress") return COMMON.compress;
  if (id === "backup") return COMMON.backup;
  if (id === "restore") return COMMON.restore;
  // Per-workflow prompts default to development when project has no workflow yet.
  const wf: WorkflowType = workflow ?? "development";
  const parts = PER_WORKFLOW[wf][id];
  return build(wf, id, parts);
}

export function getWorkflowDef(id: WorkflowType | null): WorkflowDef | null {
  if (!id) return null;
  return WORKFLOWS.find((w) => w.id === id) ?? null;
}

/* ── Today tab labels (per workflow) ───────────────────────── */

/**
 * The "Today" dashboard shows the same underlying folders for every project,
 * but the section labels are translated into each role's natural vocabulary.
 * Folder structure on disk stays identical — only what the user reads changes.
 */
export interface TodayLabels {
  resume: string;        // "Pick up" section (most recent file)
  resumeOpen: string;    // CTA on resume card ("Open")
  current: string;       // CURRENT folder section
  next: string;          // NEXT folder section
  anchors: string;       // ANCHORS folder section
  endDay: string;        // "Wrap up today" button
  endTitle: string;      // End mode hero title ("Today's wrap-up")
  todaySaved: string;    // "Saved today" section
  todaySavedEmpty: string;
  todayAnchors: string;  // "Today's key decisions" section
  tomorrow: string;      // "Pick up tomorrow" section
  backToStart: string;   // "Back to start" button
}

const DEFAULT_LABELS: TodayLabels = {
  resume: "Pick up",
  resumeOpen: "Open",
  current: "Current",
  next: "Next up",
  anchors: "Key decisions",
  endDay: "Wrap up today",
  endTitle: "Today's wrap-up",
  todaySaved: "Saved today",
  todaySavedEmpty: "Nothing saved today.",
  todayAnchors: "Today's key decisions",
  tomorrow: "Pick up tomorrow",
  backToStart: "Back to start",
};

const TODAY_LABELS: Record<WorkflowType, TodayLabels> = {
  development: DEFAULT_LABELS,
  writing: {
    resume: "Keep writing",
    resumeOpen: "Continue writing",
    current: "Draft in progress",
    next: "Next scene",
    anchors: "Emotional anchors",
    endDay: "Wrap up writing",
    endTitle: "Today's writing wrap-up",
    todaySaved: "Written today",
    todaySavedEmpty: "Nothing written today.",
    todayAnchors: "Emotional anchors set today",
    tomorrow: "Keep writing tomorrow",
    backToStart: "Back to writing",
  },
  research: {
    resume: "Keep digging",
    resumeOpen: "Continue",
    current: "Current hypothesis",
    next: "Next validation",
    anchors: "Key findings",
    endDay: "Wrap up research",
    endTitle: "Today's research wrap-up",
    todaySaved: "Researched today",
    todaySavedEmpty: "Nothing logged today.",
    todayAnchors: "Found today",
    tomorrow: "Dig into tomorrow",
    backToStart: "Back to research",
  },
  design: {
    resume: "Keep designing",
    resumeOpen: "Open mockup",
    current: "Current mockup",
    next: "Next mockup",
    anchors: "UX principles",
    endDay: "Wrap up designing",
    endTitle: "Today's design wrap-up",
    todaySaved: "Made today",
    todaySavedEmpty: "No mockups saved today.",
    todayAnchors: "Principles set today",
    tomorrow: "Pick up mockups tomorrow",
    backToStart: "Back to designing",
  },
  strategy: {
    resume: "Pick up",
    resumeOpen: "Open",
    current: "Current direction",
    next: "Next action",
    anchors: "Strategy anchors",
    endDay: "Wrap up today",
    endTitle: "Today's strategy wrap-up",
    todaySaved: "Sorted out today",
    todaySavedEmpty: "Nothing sorted out today.",
    todayAnchors: "Strategy locked in today",
    tomorrow: "Pick up tomorrow",
    backToStart: "Back to start",
  },
};

/**
 * Returns Today-tab labels for the given workflow.
 * When workflow is null (project hasn't picked one), we fall back to
 * development labels so the prompt fallback and the UI stay consistent.
 */
export function getTodayLabels(workflow: WorkflowType | null): TodayLabels {
  const wf: WorkflowType = workflow ?? "development";
  return TODAY_LABELS[wf];
}

/* ── Consolidate (multi-file merge) ─────────────────────────── */

export interface ConsolidateSource {
  name: string;
  content: string;
}

/**
 * Build a prompt that asks the AI to merge N previously-saved files into ONE
 * consolidated output. Reuses the same metadata-header + filename pattern as
 * the other standard prompts so the existing clipboard-save flow handles the
 * result with no extra logic.
 */
export function getConsolidatePrompt(sources: ConsolidateSource[]): string {
  const n = sources.length;
  const filesBlock = sources
    .map(
      (s, i) =>
        `===== FILE ${i + 1}: ${s.name} =====\n${s.content.trim()}`
    )
    .join("\n\n");

  return `I have ${n} previously-saved files about the same project. Please MERGE them into ONE consolidated file that preserves the important content from all of them while removing redundancy.

Source files are listed below, separated by \`===== FILE X: <name> =====\` markers. They are in chronological order (oldest first). Treat later files as more recent / authoritative when information conflicts.

Please:

1. Read every source file.
2. Produce a single consolidated output that keeps every unique fact, decision, and detail. Only drop redundancy and information that newer files have clearly superseded.
3. If sources disagree, prefer the newest one and add a brief note like "(updated from earlier version)".
4. Do NOT invent new content. Only merge what exists in the sources.

Start the output with this YAML metadata header (replace bracketed values, do not keep brackets):

---
version: v1
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: [copy the workflow value from the sources — if they differ, use "common"]
kind: [copy the kind from the sources — if they differ, use the most common one]
summary: [one short single-line description that says this is a consolidation of N files]
keywords: [3-5 comma-separated searchable keywords drawn from the merged content]
consolidated_from: [comma-separated list of the source filenames]
---

Then write the merged body. Keep section headings if the sources used them. Organize content so a future reader can pick this single file up and have the full picture without needing the originals.

End the output with ONE line in this exact format:
filename: [kind]_consolidated-[3-5 hyphenated words describing the merged topic].md

Where [kind] matches the kind field in the header, and the slug describes what was merged (e.g. "consolidated-auth-decisions", "consolidated-week3-progress"). Do NOT use generic words like "files", "merge", "combined", or the current date.

Wrap the entire output (header + body + filename line) inside a single fenced markdown code block so I can copy it as one piece.

===== SOURCE FILES =====

${filesBlock}`;
}
