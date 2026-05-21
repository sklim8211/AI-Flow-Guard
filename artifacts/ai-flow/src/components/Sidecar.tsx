import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  FileText,
  ListTodo,
  Minimize2,
  Anchor,
  X,
  Copy,
  Check,
} from "lucide-react";

const PROMPTS = [
  {
    id: "resume",
    label: "Resume Work",
    description: "Get back into flow",
    icon: CheckCircle2,
    prompt: `Please summarize our conversation so I can resume work. Use this structure:

TITLE: [short file-friendly title]
DATE: [today's date]
CURRENT: [what we were working on in 1-2 sentences]
NEXT: [the most important next step]
ISSUE: [any blockers or open questions]
KEYWORDS: [3-5 searchable keywords]

Keep it short, structured, and easy to paste at the start of a new session.`,
  },
  {
    id: "summary",
    label: "Work Summary",
    description: "Save session artifacts",
    icon: FileText,
    prompt: `Please create a compact work summary of what we accomplished. Use this structure:

TITLE: [short descriptive title]
DATE: [today's date]
COMPLETED: [list of things we finished]
DECISIONS: [important decisions we made]
ARTIFACTS: [files, links, or outputs created]
NOTES: [anything worth remembering]

Keep it concise and saveable.`,
  },
  {
    id: "anchors",
    label: "Extract Anchors",
    description: "Find turning points",
    icon: Anchor,
    prompt: `Please extract the key anchor points from our conversation — the moments, decisions, and breakthroughs that shaped the direction of this work. Use this structure:

ANCHORS:
- [moment or decision 1]
- [moment or decision 2]
- [moment or decision 3]
...

TURNING POINT: [the single most important shift in this session]
CORE INSIGHT: [the key idea we landed on]

Keep it minimal and high-signal.`,
  },
  {
    id: "compress",
    label: "Compress State",
    description: "Minimize context size",
    icon: Minimize2,
    prompt: `Please compress everything we know so far into the smallest possible summary I can paste at the start of a new conversation. Include:

CONTEXT: [project/task background in 2-3 sentences]
STATE: [exactly where we are right now]
CONSTRAINTS: [any important limits or requirements]
NEXT: [first action to take]

Make it dense and paste-ready.`,
  },
  {
    id: "next",
    label: "Next Actions",
    description: "Plan upcoming tasks",
    icon: ListTodo,
    prompt: `Based on our conversation, please generate my next action list. Use this structure:

IMMEDIATE: [the single next action to do right now]
TODAY: [2-3 things to complete today]
THIS WEEK: [1-2 bigger goals for this week]
BLOCKERS: [anything that needs to be resolved first]
NOTES: [any helpful context for these actions]

Keep it action-oriented and specific.`,
  },
];

export function Sidecar() {
  const [activePrompt, setActivePrompt] = useState<{
    label: string;
    prompt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [currentState, setCurrentState] = useState(
    () => localStorage.getItem("sidecar_current") || ""
  );
  const [nextState, setNextState] = useState(
    () => localStorage.getItem("sidecar_next") || ""
  );

  useEffect(() => {
    localStorage.setItem("sidecar_current", currentState);
  }, [currentState]);

  useEffect(() => {
    localStorage.setItem("sidecar_next", nextState);
  }, [nextState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePrompt(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopy = () => {
    if (!activePrompt) return;
    navigator.clipboard
      .writeText(activePrompt.prompt)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setActivePrompt(null);
        }, 1200);
      })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = activePrompt.prompt;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setActivePrompt(null);
        }, 1200);
      });
  };

  return (
    <>
      {/* Always-visible side panel */}
      <div className="fixed top-0 right-0 h-full w-[260px] bg-zinc-950 border-l border-zinc-800/60 flex flex-col z-[9999]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-800/60">
          <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-200 tracking-wide">
              QQ Sidecar
            </p>
            <p className="text-[10px] text-zinc-600">AI Flow Companion</p>
          </div>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-pulse" />
        </div>

        {/* Prompt Buttons */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
            Prompts
          </p>
          {PROMPTS.map((item) => (
            <button
              key={item.id}
              data-testid={`prompt-${item.id}`}
              onClick={() =>
                setActivePrompt({ label: item.label, prompt: item.prompt })
              }
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors text-left group"
            >
              <item.icon className="w-4 h-4 mt-0.5 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
              <div>
                <p className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                  {item.label}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* State Fields */}
        <div className="border-t border-zinc-800/60 px-4 py-4 space-y-4">
          <p className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase -mb-2">
            Session State
          </p>
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 tracking-wider block mb-1">
              CURRENT
            </label>
            <input
              type="text"
              value={currentState}
              onChange={(e) => setCurrentState(e.target.value)}
              placeholder="What are we doing?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 tracking-wider block mb-1">
              NEXT
            </label>
            <input
              type="text"
              value={nextState}
              onChange={(e) => setNextState(e.target.value)}
              placeholder="What's the next step?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Prompt Modal Overlay */}
      <AnimatePresence>
        {activePrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/50 z-[99998]"
              onClick={() => setActivePrompt(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
              className="fixed inset-0 flex items-center justify-center z-[99999] px-6"
            >
              <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-200">
                    {activePrompt.label}
                  </p>
                  <button
                    onClick={() => setActivePrompt(null)}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Prompt Text */}
                <div className="px-5 py-4 bg-zinc-950/60 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                    {activePrompt.prompt}
                  </pre>
                </div>

                {/* Copy Button */}
                <div className="px-5 py-4 border-t border-zinc-800">
                  <p className="text-[10px] text-zinc-600 mb-3">
                    Copy and paste this into ChatGPT, Claude, or any AI.
                  </p>
                  <button
                    onClick={handleCopy}
                    className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: copied
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(59,130,246,0.12)",
                      color: copied ? "rgb(134,239,172)" : "rgb(147,197,253)",
                      border: copied
                        ? "1px solid rgba(34,197,94,0.2)"
                        : "1px solid rgba(59,130,246,0.2)",
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
