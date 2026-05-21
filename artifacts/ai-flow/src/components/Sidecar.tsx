import { useState, useEffect, useCallback } from "react";
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
  FolderOpen,
  Plus,
  Save,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { ws } from "../lib/workspace";
import { WorkspaceView } from "./WorkspaceView";
import { SaveResultModal } from "./SaveResultModal";
import { FileViewModal } from "./FileViewModal";
import type { WFile } from "../lib/workspace";

const PROMPTS = [
  {
    id: "resume",
    label: "Resume Work",
    description: "이어서 작업하기",
    icon: CheckCircle2,
    color: "#10b981",
    defaultFolder: "CURRENT",
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
    defaultFolder: "SUMMARIES",
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
    defaultFolder: "ANCHORS",
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
    defaultFolder: "CURRENT",
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
    defaultFolder: "NEXT",
    prompt: `Based on our conversation, please generate my next action list. Use this structure:

IMMEDIATE: [the single next action to do right now]
TODAY: [2-3 things to complete today]
THIS WEEK: [1-2 bigger goals for this week]
BLOCKERS: [anything that needs to be resolved first]
NOTES: [any helpful context for these actions]

Keep it action-oriented and specific.`,
  },
];

type PanelTab = "prompts" | "workspace";

export function Sidecar() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("prompts");

  const [activePrompt, setActivePrompt] = useState<{
    label: string;
    prompt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const [viewFile, setViewFile] = useState<WFile | null>(null);

  const [currentState, setCurrentState] = useState(
    () => localStorage.getItem("sidecar_current") || ""
  );
  const [nextState, setNextState] = useState(
    () => localStorage.getItem("sidecar_next") || ""
  );

  // Workspace state
  const [projects, setProjects] = useState(() => ws.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => ws.getActiveProjectId()
  );
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [wsRefresh, setWsRefresh] = useState(0);

  const refreshWorkspace = useCallback(() => {
    setProjects(ws.getProjects());
    setActiveProjectId(ws.getActiveProjectId());
    setWsRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidecar_current", currentState);
  }, [currentState]);

  useEffect(() => {
    localStorage.setItem("sidecar_next", nextState);
  }, [nextState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewFile) { setViewFile(null); return; }
        if (saveModalOpen) { setSaveModalOpen(false); return; }
        if (activePrompt) { setActivePrompt(null); return; }
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt, saveModalOpen, viewFile]);

  const handleCopy = () => {
    if (!activePrompt) return;
    navigator.clipboard.writeText(activePrompt.prompt)
      .then(() => { setCopied(true); setTimeout(() => { setCopied(false); setShowSave(true); }, 800); })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = activePrompt.prompt;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => { setCopied(false); setShowSave(true); }, 800);
      });
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    ws.createProject(newProjectName.trim());
    setNewProjectName("");
    setCreatingProject(false);
    refreshWorkspace();
  };

  const handleSwitchProject = (id: string) => {
    ws.setActiveProject(id);
    setActiveProjectId(id);
    setProjectMenuOpen(false);
    setWsRefresh((n) => n + 1);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  return (
    <>
      {/* ── Narrow icon sidebar ─────────────────────────── */}
      <div
        className="fixed top-0 right-0 h-full flex flex-col items-center py-4 gap-1 z-[9999]"
        style={{
          width: 52,
          background: "rgba(255,255,255,0.96)",
          borderLeft: "1px solid #e2e8f0",
          backdropFilter: "blur(8px)",
          boxShadow: "-2px 0 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-all"
          style={{
            background: panelOpen ? "#0f172a" : "#f1f5f9",
            color: panelOpen ? "#fff" : "#64748b",
          }}
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          <span className="tooltip-left">
            {panelOpen ? "패널 닫기" : "QQ Sidecar"}
          </span>
        </button>

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "2px 0 6px" }} />

        {/* Prompt icons */}
        {PROMPTS.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActivePrompt({ label: item.label, prompt: item.prompt }); setShowSave(false); }}
            className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ color: item.color }}
          >
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: item.color + "14" }}
            />
            <item.icon className="relative z-10" style={{ width: 18, height: 18 }} />
            <span className="tooltip-left">
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>{item.description}</span>
            </span>
          </button>
        ))}

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />

        {/* Workspace icon */}
        <button
          onClick={() => { setPanelOpen(true); setTab("workspace"); }}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#64748b" }}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#f1f5f9" }} />
          <FolderOpen className="relative z-10" style={{ width: 17, height: 17 }} />
          <span className="tooltip-left">
            <span className="block font-semibold">Workspace</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>프로젝트 & 파일</span>
          </span>
        </button>
      </div>

      {/* ── Expandable panel ────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: 260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 260, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.08, duration: 0.28 }}
            className="fixed top-0 right-[52px] h-full flex flex-col z-[9998]"
            style={{
              width: 248,
              background: "rgba(255,255,255,0.98)",
              borderLeft: "1px solid #e2e8f0",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.07)",
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <p className="text-xs font-bold text-slate-700">QQ Sidecar</p>
              <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronRight style={{ width: 15, height: 15 }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-3 pt-2 pb-0 gap-1">
              {(["prompts", "workspace"] as PanelTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: tab === t ? "#0f172a" : "transparent",
                    color: tab === t ? "#fff" : "#94a3b8",
                  }}
                >
                  {t === "prompts" ? "Prompts" : "Workspace"}
                </button>
              ))}
            </div>

            {/* ── Prompts tab ── */}
            {tab === "prompts" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto py-2">
                  {PROMPTS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActivePrompt({ label: item.label, prompt: item.prompt }); setShowSave(false); }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group cursor-pointer"
                    >
                      <item.icon className="mt-0.5 shrink-0" style={{ width: 15, height: 15, color: item.color }} />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Session state */}
                <div className="px-4 py-4 space-y-3" style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#94a3b8" }}>Session State</p>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">CURRENT</label>
                    <input
                      type="text"
                      value={currentState}
                      onChange={(e) => setCurrentState(e.target.value)}
                      placeholder="지금 뭐 하고 있나요?"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">NEXT</label>
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
            )}

            {/* ── Workspace tab ── */}
            {tab === "workspace" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Project selector */}
                <div className="px-3 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {projects.length === 0 ? (
                    <div className="text-center py-2">
                      <p className="text-[11px] text-slate-400 mb-2">프로젝트가 없습니다</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setProjectMenuOpen((v) => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
                        style={{ border: "1px solid #e2e8f0" }}
                      >
                        <FolderOpen style={{ width: 13, height: 13, color: "#f59e0b", flexShrink: 0 }} />
                        <span className="flex-1 text-xs font-semibold text-slate-700 truncate">
                          {activeProject?.name ?? "프로젝트 선택"}
                        </span>
                        <ChevronDown style={{ width: 12, height: 12, color: "#94a3b8" }} />
                      </button>
                      {projectMenuOpen && (
                        <div
                          className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
                          style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
                        >
                          {projects.map((p) => (
                            <div key={p.id} className="flex items-center group">
                              <button
                                onClick={() => handleSwitchProject(p.id)}
                                className="flex-1 text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
                                style={{ color: p.id === activeProjectId ? "#0f172a" : "#64748b", fontWeight: p.id === activeProjectId ? 700 : 400 }}
                              >
                                {p.name}
                              </button>
                              <button
                                onClick={() => { if (confirm(`"${p.name}" 프로젝트를 삭제할까요?`)) { ws.deleteProject(p.id); refreshWorkspace(); setProjectMenuOpen(false); } }}
                                className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-300 transition-all"
                              >
                                <Trash2 style={{ width: 11, height: 11 }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* New project */}
                  {creatingProject ? (
                    <div className="flex gap-1.5 mt-2">
                      <input
                        autoFocus
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); if (e.key === "Escape") setCreatingProject(false); }}
                        placeholder="프로젝트 이름..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400"
                      />
                      <button
                        onClick={handleCreateProject}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: "#0f172a", color: "#fff" }}
                      >
                        생성
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setCreatingProject(true); setProjectMenuOpen(false); }}
                      className="mt-2 w-full flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      새 프로젝트
                    </button>
                  )}
                </div>

                {/* Folder tree */}
                <div className="flex-1 overflow-y-auto py-2">
                  {activeProjectId ? (
                    <WorkspaceView
                      projectId={activeProjectId}
                      onOpenFile={(f) => setViewFile(f)}
                      onNewFile={(folderId, folderName) => {
                        setSaveModalOpen(true);
                      }}
                      refresh={wsRefresh}
                      onRefresh={refreshWorkspace}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 gap-2 text-center">
                      <FolderOpen style={{ width: 28, height: 28, color: "#cbd5e1" }} />
                      <p className="text-[11px] text-slate-400">프로젝트를 만들면<br />폴더 구조가 자동 생성됩니다</p>
                    </div>
                  )}
                </div>

                {/* Save button */}
                {activeProjectId && (
                  <div className="px-3 py-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                    <button
                      onClick={() => setSaveModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b" }}
                    >
                      <Save style={{ width: 13, height: 13 }} />
                      결과 저장
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prompt Modal ────────────────────────────────── */}
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
              onClick={() => { setActivePrompt(null); setShowSave(false); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
              className="fixed inset-0 flex items-center justify-center z-[99999]"
              style={{ paddingRight: 68, paddingLeft: 24 }}
            >
              <div
                className="w-full max-w-md overflow-hidden"
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <p className="text-sm font-bold text-slate-800">{activePrompt.label}</p>
                  <button onClick={() => { setActivePrompt(null); setShowSave(false); }} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {/* Prompt text */}
                <div className="px-5 py-4 max-h-56 overflow-y-auto" style={{ background: "#f8fafc" }}>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                    {activePrompt.prompt}
                  </pre>
                </div>

                {/* Actions */}
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
                    {copied ? <><Check style={{ width: 15, height: 15 }} /> 복사됨!</> : <><Copy style={{ width: 15, height: 15 }} /> Copy Prompt</>}
                  </button>

                  {/* Save result button — appears after copy */}
                  <AnimatePresence>
                    {showSave && (
                      <motion.button
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => { setSaveModalOpen(true); }}
                        className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b" }}
                      >
                        <Save style={{ width: 15, height: 15 }} />
                        AI 응답 저장하기
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Save Result Modal ───────────────────────────── */}
      <SaveResultModal
        open={saveModalOpen}
        projectId={activeProjectId}
        defaultTitle={activePrompt ? `${activePrompt.label} — ${new Date().toLocaleDateString("ko-KR")}` : ""}
        defaultType="summary"
        onClose={() => setSaveModalOpen(false)}
        onSaved={() => { refreshWorkspace(); setTab("workspace"); setPanelOpen(true); }}
      />

      {/* ── File View Modal ─────────────────────────────── */}
      <FileViewModal
        file={viewFile}
        onClose={() => setViewFile(null)}
        onRefresh={refreshWorkspace}
      />
    </>
  );
}
