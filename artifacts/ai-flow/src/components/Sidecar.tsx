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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const PROMPTS = [
  {
    id: "resume",
    label: "Resume Work",
    description: "이어서 작업하기",
    icon: CheckCircle2,
    color: "#10b981",
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
    color: "#3b82f6",
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
    color: "#8b5cf6",
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
    color: "#f97316",
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
    color: "#ef4444",
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
  const [panelOpen, setPanelOpen] = useState(false);
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
      if (e.key === "Escape") {
        if (activePrompt) setActivePrompt(null);
        else setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt]);

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
      {/* Narrow icon-only sidebar — always visible */}
      <div
        className="fixed top-0 right-0 h-full flex flex-col items-center py-4 gap-1 z-[9999]"
        style={{
          width: 52,
          background: "rgba(255,255,255,0.95)",
          borderLeft: "1px solid #e2e8f0",
          backdropFilter: "blur(8px)",
          boxShadow: "-2px 0 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          title={panelOpen ? "패널 닫기" : "패널 열기"}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-all"
          style={{
            background: panelOpen ? "#0f172a" : "#f1f5f9",
            color: panelOpen ? "#fff" : "#64748b",
          }}
        >
          <Sparkles className="w-4 h-4" />
          {/* Tooltip */}
          <span
            className="pointer-events-none absolute right-full mr-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "#0f172a",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {panelOpen ? "패널 닫기" : "QQ Sidecar 열기"}
          </span>
        </button>

        <div
          style={{
            width: 20,
            height: 1,
            background: "#e2e8f0",
            margin: "2px 0 6px",
          }}
        />

        {/* Prompt icon buttons */}
        {PROMPTS.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              setActivePrompt({ label: item.label, prompt: item.prompt })
            }
            className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ color: item.color }}
            title={item.label}
          >
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: item.color + "14" }}
            />
            <item.icon className="w-4.5 h-4.5 relative z-10" style={{ width: 18, height: 18 }} />
            {/* Tooltip */}
            <span
              className="pointer-events-none absolute right-full mr-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "#0f172a",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-slate-400 text-[10px] mt-0.5">{item.description}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Expandable side panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: 260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 260, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
            className="fixed top-0 right-[52px] h-full flex flex-col z-[9998]"
            style={{
              width: 240,
              background: "rgba(255,255,255,0.97)",
              borderLeft: "1px solid #e2e8f0",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.07)",
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-4"
              style={{ borderBottom: "1px solid #f1f5f9" }}
            >
              <div>
                <p className="text-xs font-bold text-slate-700">QQ Sidecar</p>
                <p className="text-[10px] text-slate-400">AI Flow Companion</p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt list in panel */}
            <div className="flex-1 overflow-y-auto py-2">
              <p
                className="px-4 pt-2 pb-2 text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "#94a3b8" }}
              >
                Prompts
              </p>
              {PROMPTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setActivePrompt({ label: item.label, prompt: item.prompt })
                  }
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group cursor-pointer"
                >
                  <item.icon
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: item.color, width: 16, height: 16 }}
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Session state */}
            <div
              className="px-4 py-4 space-y-3"
              style={{
                borderTop: "1px solid #f1f5f9",
                background: "#f8fafc",
              }}
            >
              <p
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "#94a3b8" }}
              >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {activePrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[99998]"
              style={{ background: "rgba(15,23,42,0.2)", backdropFilter: "blur(4px)" }}
              onClick={() => setActivePrompt(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
              className="fixed inset-0 flex items-center justify-center z-[99999] px-6"
              style={{ paddingRight: 72 }}
            >
              <div
                className="w-full max-w-md overflow-hidden"
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 20,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                }}
              >
                {/* Modal header */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
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

                {/* Prompt text */}
                <div
                  className="px-5 py-4 max-h-64 overflow-y-auto"
                  style={{ background: "#f8fafc" }}
                >
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                    {activePrompt.prompt}
                  </pre>
                </div>

                {/* Copy button */}
                <div className="px-5 py-4" style={{ borderTop: "1px solid #f1f5f9" }}>
                  <p className="text-[10px] text-slate-400 mb-3">
                    이 프롬프트를 복사해서 ChatGPT나 Claude에 붙여넣으세요.
                  </p>
                  <button
                    onClick={handleCopy}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: copied ? "#f0fdf4" : "#0f172a",
                      color: copied ? "#16a34a" : "#fff",
                      border: copied ? "1px solid #bbf7d0" : "none",
                    }}
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
