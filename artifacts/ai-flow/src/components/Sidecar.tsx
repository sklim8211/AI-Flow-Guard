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
    description: "이어서 작업하기",
    icon: CheckCircle2,
    color: "text-emerald-600",
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
    description: "세션 결과 정리",
    icon: FileText,
    color: "text-blue-600",
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
    description: "핵심 전환점 추출",
    icon: Anchor,
    color: "text-violet-600",
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
    label: "Compress Context",
    description: "맥락 압축 요약",
    icon: Minimize2,
    color: "text-orange-600",
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
    description: "다음 할 일 목록",
    icon: ListTodo,
    color: "text-rose-600",
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
        setTimeout(() => { setCopied(false); setActivePrompt(null); }, 1200);
      })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = activePrompt.prompt;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => { setCopied(false); setActivePrompt(null); }, 1200);
      });
  };

  return (
    <>
      {/* Always-visible side panel — light theme */}
      <div className="fixed top-0 right-0 h-full w-[260px] bg-white border-l border-slate-200 flex flex-col z-[9999] shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
          <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 tracking-wide">
              QQ Sidecar
            </p>
            <p className="text-[10px] text-slate-400">AI Flow Companion</p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        {/* Prompt Buttons */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 pt-2 pb-2 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Prompts
          </p>
          {PROMPTS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePrompt({ label: item.label, prompt: item.prompt })}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <item.icon className={`w-4 h-4 mt-0.5 ${item.color} shrink-0`} />
              <div>
                <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Session State */}
        <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Session State
          </p>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
              CURRENT
            </label>
            <input
              type="text"
              value={currentState}
              onChange={(e) => setCurrentState(e.target.value)}
              placeholder="지금 뭐 하고 있나요?"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
              NEXT
            </label>
            <input
              type="text"
              value={nextState}
              onChange={(e) => setNextState(e.target.value)}
              placeholder="다음 단계는?"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
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
              className="fixed inset-0 bg-black/20 z-[99998] backdrop-blur-sm"
              onClick={() => setActivePrompt(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
              className="fixed inset-0 flex items-center justify-center z-[99999] px-6"
            >
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">
                    {activePrompt.label}
                  </p>
                  <button
                    onClick={() => setActivePrompt(null)}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Prompt Text */}
                <div className="px-5 py-4 bg-slate-50 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                    {activePrompt.prompt}
                  </pre>
                </div>

                {/* Copy Button */}
                <div className="px-5 py-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 mb-3">
                    이 프롬프트를 복사해서 ChatGPT나 Claude에 붙여넣으세요.
                  </p>
                  <button
                    onClick={handleCopy}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      copied
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-800 text-white hover:bg-slate-900"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        복사됨!
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
