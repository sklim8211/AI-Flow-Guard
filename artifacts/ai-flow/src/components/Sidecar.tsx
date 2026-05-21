import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  FileText,
  ListTodo,
  Minimize2,
  Anchor,
  X,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

Keep it short, structured, and easy to paste at the start of a new session.`
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

Keep it concise and saveable.`
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

Keep it minimal and high-signal.`
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

Make it dense and paste-ready.`
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

Keep it action-oriented and specific.`
  }
];

export function Sidecar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<{ label: string; prompt: string } | null>(null);
  
  const [currentState, setCurrentState] = useState(() => localStorage.getItem("sidecar_current") || "");
  const [nextState, setNextState] = useState(() => localStorage.getItem("sidecar_next") || "");
  
  const { toast } = useToast();
  
  useEffect(() => {
    localStorage.setItem("sidecar_current", currentState);
  }, [currentState]);

  useEffect(() => {
    localStorage.setItem("sidecar_next", nextState);
  }, [nextState]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activePrompt) setActivePrompt(null);
        else setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt]);

  const handleCopy = async () => {
    if (!activePrompt) return;
    try {
      await navigator.clipboard.writeText(activePrompt.prompt);
      toast({
        description: "Prompt copied to clipboard",
        duration: 2000,
      });
      setActivePrompt(null);
      setIsOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        description: "Failed to copy prompt"
      });
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        {/* Status Hint */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-zinc-400 font-medium tracking-wide mr-2 flex items-center gap-1.5"
            >
              <span>Ready to Resume</span>
              <div className="w-1 h-1 rounded-full bg-blue-400/80 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Trigger */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors focus:outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Main Popup */}
      <AnimatePresence>
        {isOpen && !activePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            className="fixed bottom-24 right-6 z-[9999] w-[280px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-2 space-y-1">
              {PROMPTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePrompt({ label: item.label, prompt: item.prompt })}
                  className="w-full flex flex-col items-start gap-0.5 p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5 text-zinc-200 group-hover:text-blue-400 transition-colors">
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-zinc-500 pl-6">{item.description}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 tracking-wider">CURRENT</label>
                <input
                  type="text"
                  value={currentState}
                  onChange={(e) => setCurrentState(e.target.value)}
                  placeholder="What are we doing?"
                  className="w-full bg-transparent border-none text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 tracking-wider">NEXT</label>
                <input
                  type="text"
                  value={nextState}
                  onChange={(e) => setNextState(e.target.value)}
                  placeholder="What's the next step?"
                  className="w-full bg-transparent border-none text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {activePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            className="fixed bottom-24 right-6 z-[9999] w-[320px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-200">{activePrompt.label}</span>
              <button
                onClick={() => setActivePrompt(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 bg-zinc-950/50 max-h-[300px] overflow-y-auto">
              <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                {activePrompt.prompt}
              </pre>
            </div>

            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={handleCopy}
                className="w-full py-2.5 px-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Prompt
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
