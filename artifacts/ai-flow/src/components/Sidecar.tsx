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
  HardDrive,
  Unplug,
  Link,
  PanelRight,
  LifeBuoy,
  RotateCcw,
  Siren,
  Download,
  ArrowRight,
  ArrowLeftRight,
  ClipboardPaste,
} from "lucide-react";
import { ws } from "../lib/workspace";
import { fsAccess } from "../lib/fsAccess";
import { WorkspaceView } from "./WorkspaceView";
import { SaveResultModal } from "./SaveResultModal";
import { FileViewModal } from "./FileViewModal";
import { TodayDashboard } from "./TodayDashboard";
import { SaveReminderToast, markActivity } from "./SaveReminderToast";
import {
  PROMPT_DEFS,
  WORKFLOWS,
  getPromptText,
  getWorkflowDef,
  getConsolidatePrompt,
  type PromptId,
  type WorkflowType,
} from "../lib/prompts";
import type { WFile } from "../lib/workspace";

/** Visual metadata per prompt — icon & color stay constant across workflows. */
const PROMPT_VISUALS: Record<PromptId, { icon: typeof CheckCircle2; color: string }> = {
  resume: { icon: CheckCircle2, color: "#10b981" },
  summary: { icon: FileText, color: "#3b82f6" },
  anchors: { icon: Anchor, color: "#8b5cf6" },
  compress: { icon: Minimize2, color: "#f97316" },
  next: { icon: ListTodo, color: "#ef4444" },
  backup: { icon: LifeBuoy, color: "#06b6d4" },
  restore: { icon: RotateCcw, color: "#84cc16" },
};

interface DisplayPrompt {
  id: PromptId;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  color: string;
  prompt: string;
}

/** Build the list of prompts to display for the currently active project's workflow. */
function buildPrompts(workflow: WorkflowType | null): DisplayPrompt[] {
  return PROMPT_DEFS.map((def) => {
    const visual = PROMPT_VISUALS[def.id];
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      icon: visual.icon,
      color: visual.color,
      prompt: getPromptText(def.id, workflow),
    };
  });
}


type PanelTab = "today" | "prompts" | "workspace";

export function Sidecar() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("today");

  const [activePrompt, setActivePrompt] = useState<{
    label: string;
    prompt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  const [viewFile, setViewFile] = useState<WFile | null>(null);

  // Workspace state
  const [projects, setProjects] = useState(() => ws.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => ws.getActiveProjectId()
  );
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectWorkflow, setNewProjectWorkflow] = useState<WorkflowType | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [wsRefresh, setWsRefresh] = useState(0);
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);

  // Local filesystem
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [rootFolderName, setRootFolderName] = useState<string | null>(null);
  const [fsConnecting, setFsConnecting] = useState(false);

  // PWA install
  const [installEvent, setInstallEvent] = useState<{ prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // SOS recovery mode
  const [showSOS, setShowSOS] = useState(false);

  // Onboarding (first-visit only)
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("qq_onboarded")
  );

  // Restore FS handle on mount + migrate default folders for existing projects
  useEffect(() => {
    const added = ws.ensureDefaultFoldersForAllProjects();
    if (added > 0) {
      setWsRefresh((n) => n + 1);
    }
    fsAccess.hasRoot().then(async (has) => {
      if (has) {
        const name = await fsAccess.getRootName();
        setRootFolderName(name);
        // Don't auto-request permission — wait for user interaction
      }
    });
  }, []);

  const handleConnectFs = async () => {
    setFsConnecting(true);
    const handle = await fsAccess.pickRootFolder();
    if (handle) {
      setRootHandle(handle);
      setRootFolderName(handle.name);
    }
    setFsConnecting(false);
  };

  const handleReconnectFs = async () => {
    setFsConnecting(true);
    const handle = await fsAccess.getRootHandle();
    if (handle) {
      setRootHandle(handle);
      setRootFolderName(handle.name);
    }
    setFsConnecting(false);
  };

  const handleDisconnectFs = async () => {
    await fsAccess.clearRoot();
    setRootHandle(null);
    setRootFolderName(null);
  };

  const refreshWorkspace = useCallback(() => {
    setProjects(ws.getProjects());
    setActiveProjectId(ws.getActiveProjectId());
    setWsRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewFile) { setViewFile(null); return; }
        if (saveModalOpen) { setSaveModalOpen(false); setClipboardContent(""); return; }
        if (showSOS) { setShowSOS(false); return; }
        if (showOnboarding) { return; } // onboarding must be dismissed via button
        if (activePrompt) { setActivePrompt(null); return; }
        if (isSidePanel) return; // side panel mode: panel always open
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt, saveModalOpen, viewFile, showSOS, showOnboarding]);

  // PWA install detection
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setIsInstalled(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as unknown as typeof installEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const result = await installEvent.userChoice;
      if (result.outcome === "accepted") setIsInstalled(true);
      setInstallEvent(null);
    } catch {
      // user dismissed or browser rejected
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem("qq_onboarded", "1");
    setShowOnboarding(false);
  };

  const openPromptFromSOS = (promptId: string) => {
    const def = PROMPT_DEFS.find((x) => x.id === promptId);
    if (!def) return;
    const project = ws.getProjects().find((p) => p.id === ws.getActiveProjectId());
    const wf = project?.workflow ?? null;
    setActivePrompt({ label: def.label, prompt: getPromptText(def.id, wf) });
    setShowSave(false);
    setShowSOS(false);
    setPanelOpen(true);
  };

  const handleConsolidate = (files: WFile[]) => {
    if (files.length < 2) return;
    const sources = files.map((f) => ({ name: f.name, content: f.content }));
    const promptText = getConsolidatePrompt(sources);
    setActivePrompt({
      label: `Consolidate (${files.length}개 합치기)`,
      prompt: promptText,
    });
    setShowSave(false);
    setPanelOpen(true);
  };

  const handleClipboardCapture = async () => {
    setClipboardError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setClipboardError("클립보드가 비어 있어요. AI 응답을 먼저 카피해주세요.");
        setTimeout(() => setClipboardError(null), 3500);
        return;
      }
      setClipboardContent(text);
      setSaveModalOpen(true);
      setPanelOpen(true);
    } catch {
      setClipboardError("클립보드 읽기 권한이 필요해요. 브라우저 허용 후 다시 시도해주세요.");
      setTimeout(() => setClipboardError(null), 4000);
    }
  };

  const handleCopy = () => {
    if (!activePrompt) return;
    const onSuccess = () => {
      markActivity();
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowSave(true); }, 800);
    };
    navigator.clipboard.writeText(activePrompt.prompt)
      .then(onSuccess)
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = activePrompt.prompt;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        onSuccess();
      });
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const project = ws.createProject(newProjectName.trim(), newProjectWorkflow);
    setNewProjectName("");
    setNewProjectWorkflow(null);
    setCreatingProject(false);
    refreshWorkspace();
    // Also create actual folders on disk if connected
    if (rootHandle) {
      try {
        const DEFAULT_FOLDERS = ["CURRENT","NEXT","ANCHORS","SUMMARIES","PROMPTS","CODE","SAFE","TEMP"];
        await fsAccess.createProjectFolders(rootHandle, project.name, DEFAULT_FOLDERS);
      } catch (e) {
        console.warn("FS folder creation failed", e);
      }
    }
  };

  const handleSwitchProject = (id: string) => {
    ws.setActiveProject(id);
    setActiveProjectId(id);
    setProjectMenuOpen(false);
    setWsRefresh((n) => n + 1);
  };

  const handleChangeWorkflow = (workflow: WorkflowType | null) => {
    if (!activeProjectId) return;
    ws.setProjectWorkflow(activeProjectId, workflow);
    setWorkflowMenuOpen(false);
    refreshWorkspace();
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activeWorkflow: WorkflowType | null = activeProject?.workflow ?? null;
  const activeWorkflowDef = getWorkflowDef(activeWorkflow);
  const displayPrompts = buildPrompts(activeWorkflow);

  // ── Side panel mode (narrow window / popup) ─────────────
  const [isSidePanel, setIsSidePanel] = useState(() => window.innerWidth <= 440);

  // Panel side preference (left or right). Persisted in localStorage.
  const [panelSide, setPanelSide] = useState<"left" | "right">(() => {
    try {
      const v = localStorage.getItem("qq.panelSide");
      return v === "left" ? "left" : "right";
    } catch {
      return "right";
    }
  });
  useEffect(() => {
    try { localStorage.setItem("qq.panelSide", panelSide); } catch {}
  }, [panelSide]);
  const isRight = panelSide === "right";
  const tipClass = isRight ? "tooltip-left" : "tooltip-right";

  // After spawning popup, mark this window as "spawner" and offer auto-close.
  const [spawnedPopup, setSpawnedPopup] = useState(false);

  useEffect(() => {
    const check = () => setIsSidePanel(window.innerWidth <= 440);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-open panel when entering side panel mode — invariant: side panel mode = always open
  useEffect(() => {
    if (isSidePanel && !panelOpen) setPanelOpen(true);
  }, [isSidePanel, panelOpen]);

  // Resize popup window to match panel open/closed state
  useEffect(() => {
    if (!isSidePanel) return;
    const ICON_W = 58;
    const PANEL_W = 380;
    const target = panelOpen ? PANEL_W : ICON_W;
    try {
      window.resizeTo(target, window.outerHeight);
      const x = isRight ? window.screen.availWidth - target : 0;
      window.moveTo(x, window.screenY);
    } catch {
      // resizeTo is blocked in non-popup windows — ignore silently
    }
  }, [panelOpen, isSidePanel, isRight]);

  const openAsSidePanel = () => {
    const w = 58;
    const h = window.screen.availHeight;
    const left = isRight ? window.screen.availWidth - w : 0;
    const popup = window.open(
      window.location.href,
      "qq_sidecar",
      `width=${w},height=${h},left=${left},top=0,resizable=yes`
    );
    if (popup) {
      // Try to auto-close this window. If browser blocks (common for non-script-opened
      // tabs), fall back to a full-screen "you can close this tab" overlay.
      setTimeout(() => {
        try { window.close(); } catch {}
        // If still alive after close attempt, show overlay
        setSpawnedPopup(true);
      }, 250);
    }
  };

  return (
    <>
      {/* ── Narrow icon sidebar ─────────────────────────── */}
      <div
        className={`fixed top-0 h-full flex flex-col items-center py-4 gap-1 z-[9999] ${isRight ? "right-0" : "left-0"}`}
        style={{
          width: isSidePanel && !panelOpen ? "100%" : 52,
          background: "rgba(255,255,255,0.96)",
          borderLeft: isRight ? "1px solid #e2e8f0" : "none",
          borderRight: isRight ? "none" : "1px solid #e2e8f0",
          backdropFilter: "blur(8px)",
          boxShadow: isRight ? "-2px 0 12px rgba(0,0,0,0.05)" : "2px 0 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* Toggle button — hidden in side panel mode (panel always open there) */}
        {!isSidePanel && (
          <>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="relative group w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-all"
              style={{
                background: panelOpen ? "#0f172a" : "#f1f5f9",
                color: panelOpen ? "#fff" : "#64748b",
              }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              <span className={tipClass}>
                {panelOpen ? "패널 닫기" : "QQ Sidecar"}
              </span>
            </button>

            <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "2px 0 6px" }} />
          </>
        )}

        {/* Clipboard capture — one-click save of any AI response */}
        <button
          onClick={handleClipboardCapture}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#fff", background: "#0f172a" }}
        >
          <ClipboardPaste className="relative z-10" style={{ width: 16, height: 16 }} />
          <span className={tipClass}>
            <span className="block font-semibold">클립보드에서 저장</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>카피한 AI 응답을 바로 저장</span>
          </span>
        </button>

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />

        {/* Prompt icons */}
        {displayPrompts.map((item) => (
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
            <span className={tipClass}>
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>{item.description}</span>
            </span>
          </button>
        ))}

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />

        {/* SOS Recovery icon — prominent red */}
        <button
          onClick={() => setShowSOS(true)}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#dc2626" }}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#fee2e2" }} />
          <Siren className="relative z-10" style={{ width: 18, height: 18 }} />
          <span className={tipClass}>
            <span className="block font-semibold">SOS 복구 모드</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>AI가 이상해졌을 때</span>
          </span>
        </button>

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />

        {/* Workspace icon */}
        <button
          onClick={() => { setPanelOpen(true); setTab("workspace"); }}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#64748b" }}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#f1f5f9" }} />
          <FolderOpen className="relative z-10" style={{ width: 17, height: 17 }} />
          <span className={tipClass}>
            <span className="block font-semibold">Workspace</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>프로젝트 & 파일</span>
          </span>
        </button>

        {/* Install as app — only when installable and not already installed */}
        {installEvent && !isInstalled && (
          <>
            <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />
            <button
              onClick={handleInstallApp}
              className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: "#0f172a", background: "#fef3c7" }}
            >
              <Download className="relative z-10" style={{ width: 15, height: 15 }} />
              <span className={tipClass}>
                <span className="block font-semibold">앱으로 설치</span>
                <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>바탕화면에서 바로 실행</span>
              </span>
            </button>
          </>
        )}

        {/* Open as Side Panel — only in normal (wide) mode */}
        {!isSidePanel && (
          <>
            <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />
            <button
              onClick={openAsSidePanel}
              className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: "#fff", background: "#6366f1", boxShadow: "0 2px 6px rgba(99,102,241,0.35)" }}
            >
              <PanelRight className="relative z-10" style={{ width: 15, height: 15 }} />
              <span className={tipClass}>
                <span className="block font-semibold">화면 옆에 고정</span>
                <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>ChatGPT 옆에 좁게 띄우기</span>
              </span>
            </button>
          </>
        )}

        {/* Side toggle — flip panel left/right (visible in all modes) */}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setPanelSide((s) => (s === "right" ? "left" : "right"))}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#64748b", background: "#f1f5f9" }}
          title={isRight ? "왼쪽으로 옮기기" : "오른쪽으로 옮기기"}
        >
          <ArrowLeftRight style={{ width: 14, height: 14 }} />
          <span className={tipClass}>
            <span className="block font-semibold">{isRight ? "왼쪽으로 옮기기" : "오른쪽으로 옮기기"}</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>패널 위치 바꾸기</span>
          </span>
        </button>
      </div>

      {/* ── Expandable panel ────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={isSidePanel ? false : { x: 260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={isSidePanel ? {} : { x: 260, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.08, duration: 0.28 }}
            className={isSidePanel
              ? (isRight
                  ? "fixed top-0 left-0 right-[52px] h-full flex flex-col z-[9998]"
                  : "fixed top-0 right-0 left-[52px] h-full flex flex-col z-[9998]")
              : (isRight
                  ? "fixed top-0 right-[52px] h-full flex flex-col z-[9998]"
                  : "fixed top-0 left-[52px] h-full flex flex-col z-[9998]")
            }
            style={{
              width: isSidePanel ? undefined : 248,
              background: "rgba(255,255,255,0.98)",
              borderLeft: isSidePanel ? "none" : "1px solid #e2e8f0",
              borderRight: isSidePanel ? "1px solid #e2e8f0" : "none",
              boxShadow: isSidePanel ? "none" : "-4px 0 24px rgba(0,0,0,0.07)",
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3.5 gap-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-xs font-bold text-slate-700 shrink-0">QQ Sidecar</p>
                {activeProject && (
                  <div className="relative">
                    <button
                      onClick={() => setWorkflowMenuOpen((v) => !v)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all hover:opacity-80"
                      style={{
                        background: activeWorkflowDef ? "#eef2ff" : "#f1f5f9",
                        color: activeWorkflowDef ? "#4338ca" : "#64748b",
                      }}
                      title="직군 변경"
                    >
                      <span>{activeWorkflowDef ? `${activeWorkflowDef.emoji} ${activeWorkflowDef.label} 모드` : "💻 개발 모드 (기본)"}</span>
                      <ChevronDown style={{ width: 9, height: 9 }} />
                    </button>
                    {workflowMenuOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                        style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 160 }}
                      >
                        {WORKFLOWS.map((wf) => (
                          <button
                            key={wf.id}
                            onClick={() => handleChangeWorkflow(wf.id)}
                            className="w-full flex items-start gap-2 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
                            style={{
                              background: activeWorkflow === wf.id ? "#f8fafc" : "transparent",
                            }}
                          >
                            <span className="text-sm">{wf.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-700">{wf.label}</p>
                              <p className="text-[9px] text-slate-400 leading-tight">{wf.description}</p>
                            </div>
                          </button>
                        ))}
                        {activeWorkflow && (
                          <button
                            onClick={() => handleChangeWorkflow(null)}
                            className="w-full px-3 py-2 hover:bg-slate-50 text-left text-[10px] font-semibold text-slate-500 transition-colors"
                            style={{ borderTop: "1px solid #f1f5f9" }}
                          >
                            직군 미지정으로 되돌리기
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!isSidePanel && (
                <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors shrink-0">
                  <ChevronRight style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex px-3 pt-2 pb-0 gap-1">
              {(["today", "prompts", "workspace"] as PanelTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: tab === t ? "#0f172a" : "transparent",
                    color: tab === t ? "#fff" : "#94a3b8",
                  }}
                >
                  {t === "today" ? "오늘" : t === "prompts" ? "Prompts" : "Workspace"}
                </button>
              ))}
            </div>

            {/* ── Today tab ── */}
            {tab === "today" && (
              <TodayDashboard
                projectId={activeProjectId}
                workflow={activeWorkflow}
                refreshKey={wsRefresh}
                onOpenFile={(f) => setViewFile(f)}
                onGoToPrompts={() => setTab("prompts")}
                onGoToWorkspace={() => setTab("workspace")}
              />
            )}

            {/* ── Prompts tab ── */}
            {tab === "prompts" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto py-2">
                  {displayPrompts.map((item) => (
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

              </div>
            )}

            {/* ── Workspace tab ── */}
            {tab === "workspace" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* ── Local folder status bar (when connected) ── */}
                {rootHandle && (
                  <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #dcfce7", background: "#f0fdf4" }}>
                    <HardDrive style={{ width: 11, height: 11, color: "#16a34a", flexShrink: 0 }} />
                    <span className="flex-1 text-[10px] font-semibold text-emerald-700 truncate">
                      📁 {rootFolderName}
                    </span>
                    <button
                      onClick={handleDisconnectFs}
                      title="연결 해제"
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Unplug style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                )}

                {/* ── Reconnect bar (was connected, page refreshed) ── */}
                {!rootHandle && rootFolderName && (
                  <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #fde68a", background: "#fffbeb" }}>
                    <HardDrive style={{ width: 11, height: 11, color: "#d97706", flexShrink: 0 }} />
                    <span className="flex-1 text-[10px] font-semibold text-amber-700 truncate">
                      {rootFolderName}
                    </span>
                    <button
                      onClick={handleReconnectFs}
                      disabled={fsConnecting}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-800 transition-colors disabled:opacity-50"
                    >
                      {fsConnecting ? "연결중…" : "재연결"}
                    </button>
                    <button onClick={handleDisconnectFs} className="text-slate-300 hover:text-red-400 transition-colors">
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                )}

                {/* ── Choose folder CTA (never connected) ── */}
                {!rootHandle && !rootFolderName && (
                  <div className="mx-3 mt-3 mb-1 rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    {fsAccess.isSupported() ? (
                      <button
                        onClick={handleConnectFs}
                        disabled={fsConnecting}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-60"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                          <HardDrive style={{ width: 15, height: 15, color: "#3b82f6" }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {fsConnecting ? "폴더 선택 중…" : "Choose Workspace Folder"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            로컬 폴더에 파일을 직접 저장합니다
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fef3c7" }}>
                          <HardDrive style={{ width: 15, height: 15, color: "#d97706" }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600">브라우저 미지원</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                            Local folder access is not supported in this browser.<br />
                            Please use <strong>Chrome</strong> or <strong>Edge</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); if (e.key === "Escape") { setCreatingProject(false); setNewProjectWorkflow(null); } }}
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
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">직군 (선택)</p>
                        <div className="flex flex-wrap gap-1">
                          {WORKFLOWS.map((wf) => (
                            <button
                              key={wf.id}
                              onClick={() => setNewProjectWorkflow((cur) => (cur === wf.id ? null : wf.id))}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                              style={{
                                background: newProjectWorkflow === wf.id ? "#0f172a" : "#f1f5f9",
                                color: newProjectWorkflow === wf.id ? "#fff" : "#64748b",
                              }}
                              title={wf.description}
                            >
                              {wf.emoji} {wf.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          {newProjectWorkflow
                            ? `프롬프트가 ${getWorkflowDef(newProjectWorkflow)?.label}용으로 맞춰집니다.`
                            : "고르지 않으면 공통(개발 기본)으로 시작합니다. 나중에 변경 가능."}
                        </p>
                      </div>
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
                      onConsolidate={handleConsolidate}
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
        rootHandle={rootHandle}
        defaultTitle={
          clipboardContent
            ? `원본 — ${new Date().toLocaleDateString("ko-KR")}`
            : activePrompt
              ? `${activePrompt.label} — ${new Date().toLocaleDateString("ko-KR")}`
              : ""
        }
        defaultContent={clipboardContent}
        defaultType={clipboardContent ? "note" : "summary"}
        defaultFolderName={clipboardContent ? "DRAFTS" : undefined}
        onClose={() => { setSaveModalOpen(false); setClipboardContent(""); }}
        onSaved={() => { markActivity(); refreshWorkspace(); setTab("today"); setPanelOpen(true); setClipboardContent(""); }}
      />

      {/* ── Clipboard error toast ───────────────────────── */}
      <AnimatePresence>
        {clipboardError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-4 right-4 z-[10001] max-w-sm mx-auto px-4 py-3 rounded-xl text-xs font-semibold text-center"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
          >
            {clipboardError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save reminder toast ─────────────────────────── */}
      <SaveReminderToast
        suppressed={!!viewFile || saveModalOpen || showSOS || showOnboarding || !!activePrompt}
        onSaveClick={() => { setSaveModalOpen(true); setPanelOpen(true); }}
      />

      {/* ── File View Modal ─────────────────────────────── */}
      <FileViewModal
        file={viewFile}
        onClose={() => setViewFile(null)}
        onRefresh={refreshWorkspace}
      />

      {/* ── SOS Recovery Modal ──────────────────────────── */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowSOS(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="SOS 복구 모드"
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
            >
              <div className="px-6 pt-6 pb-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg,#fee2e2,#fff)" }}>
                <Siren style={{ width: 28, height: 28, color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-800">SOS 복구 모드</p>
                  <p className="text-xs text-slate-500 mt-1">지금 무슨 일이 벌어졌나요? 상황에 맞는 프롬프트를 열어드릴게요.</p>
                </div>
                <button onClick={() => setShowSOS(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div className="px-4 py-3 space-y-2">
                {[
                  { id: "compress", emoji: "🌀", title: "AI가 컨텍스트를 잃었어요", desc: "헛소리 시작 / 이전 대화 못 기억함. 압축본을 만들어 새 세션에 붙여넣으세요.", action: "압축 프롬프트 열기" },
                  { id: "backup", emoji: "🛟", title: "큰 수정 전, 무서워요", desc: "지금 상태 그대로 백업 스냅샷을 받아 SAFE 폴더에 저장하세요.", action: "백업 프롬프트 열기" },
                  { id: "restore", emoji: "↺", title: "백업으로 돌아가야 해요", desc: "이미 저장해둔 백업 파일을 AI에게 붙여넣어 컨텍스트를 복원하세요.", action: "복원 프롬프트 열기" },
                ].map((step) => (
                  <button
                    key={step.id}
                    onClick={() => openPromptFromSOS(step.id)}
                    className="w-full text-left rounded-xl p-3 flex items-start gap-3 transition-all hover:scale-[1.01] active:scale-100"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{step.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.desc}</p>
                      <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: "#dc2626" }}>
                        {step.action} <ArrowRight style={{ width: 11, height: 11 }} />
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-6 py-3 text-[10px] text-slate-400 text-center" style={{ borderTop: "1px solid #f1f5f9" }}>
                프롬프트를 카피해서 ChatGPT/Claude에 붙여넣으면 됩니다. 우리는 AI에 연결되지 않은 안전망입니다.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Onboarding Card (first visit only) ──────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
              role="dialog"
              aria-modal="true"
              aria-label="QQ Sidecar 환영합니다"
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 30px 70px rgba(0,0,0,0.3)" }}
            >
              <div className="px-7 pt-7 pb-2 flex items-start gap-3" style={{ background: "linear-gradient(135deg,#f1f5f9,#fff)" }}>
                <Sparkles style={{ width: 24, height: 24, color: "#0f172a", flexShrink: 0, marginTop: 4 }} />
                <div>
                  <p className="text-lg font-bold text-slate-800">QQ Sidecar에 오신 걸 환영해요</p>
                  <p className="text-xs text-slate-500 mt-1">30초 안에 핵심만 짚어드릴게요.</p>
                </div>
              </div>

              <div className="px-7 py-4 space-y-3">
                {[
                  { n: "1", title: "이건 AI 안전망이에요", desc: "ChatGPT나 Claude로 작업할 때 컨텍스트를 잃지 않도록 도와줍니다. AI에 직접 연결되지 않아요." },
                  { n: "2", title: "보라색 ▭ 아이콘으로 화면 옆에 고정", desc: "오른쪽 사이드바 아래쪽 보라색 아이콘을 누르면 ChatGPT 옆에 좁게 자동 배치돼요. 그게 가장 편한 사용법이에요." },
                  { n: "3", title: "색깔 아이콘 → 프롬프트 카피 → AI에 붙여넣기", desc: "받은 답변을 다시 우리 앱 \"AI 응답 저장하기\"에 붙여넣으면 폴더·파일명이 자동으로 채워져요." },
                  { n: "4", title: "위기 상황엔 빨간 🚨 SOS", desc: "AI가 이상해지거나 큰 수정 전, 사이드바의 빨간 사이렌을 누르면 상황별 가이드가 열려요." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span
                      className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                      style={{ width: 22, height: 22, background: "#0f172a", color: "#fff" }}
                    >
                      {s.n}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-7 py-4" style={{ borderTop: "1px solid #f1f5f9" }}>
                <button
                  onClick={dismissOnboarding}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: "#0f172a", color: "#fff" }}
                >
                  시작하기 <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spawned popup overlay — shown if window.close() was blocked */}
      {spawnedPopup && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
          style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div className="text-3xl mb-2">✅</div>
            <div className="text-base font-bold text-slate-900 mb-1">
              사이드 패널이 새 창으로 열렸어요
            </div>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              이 탭은 더 이상 필요하지 않아요.<br/>
              직접 닫으셔도 되고, 아래 버튼으로 닫으실 수도 있어요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { try { window.close(); } catch {} setSpawnedPopup(false); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#0f172a", color: "#fff" }}
              >
                이 탭 닫기
              </button>
              <button
                onClick={() => setSpawnedPopup(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-slate-50"
                style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }}
              >
                계속 사용
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
