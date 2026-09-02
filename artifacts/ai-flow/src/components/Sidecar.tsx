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
  Info,
  LifeBuoy,
  RotateCcw,
  Siren,
  Download,
  ArrowRight,
  ArrowLeftRight,
  ClipboardPaste,
  HelpCircle,
  Crown,
  KeyRound,
  CalendarDays,
  ScrollText,
  Rocket,
} from "lucide-react";
import { ws, parseFileMeta } from "../lib/workspace";
import { hasLicense } from "../lib/license";
import { PlanModal, ActivateModal, LimitModal } from "./ProModals";
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
  getWeeklySummaryPrompt,
  getProjectReportPrompt,
  getResumeBriefingPrompt,
  type PromptId,
  type WorkflowType,
  type ConsolidateSource,
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

const SIDE_PANEL_ICON_WIDTH = 58;
const SIDE_PANEL_OPEN_WIDTH = 380;

export function Sidecar() {
  const [panelOpen, setPanelOpen] = useState(true);
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
  // "What's going on?" situation guide (button-triggered only)
  const [showSituation, setShowSituation] = useState(false);

  // Pro / licensing
  const [licensed, setLicensed] = useState(() => hasLicense());
  const [showPlans, setShowPlans] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [showLimit, setShowLimit] = useState(false);

  // Restore picker (lists SAFE backup files to inject into Restore prompt)
  const [showRestorePicker, setShowRestorePicker] = useState(false);

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

  // Ensure a default project always exists so first-run flows (onboarding →
  // Resume → Save) have a valid place to save. Without this, brand-new users
  // hit a disabled Save button (no project / no folder selected).
  useEffect(() => {
    if (ws.getProjects().length === 0) {
      ws.createProject("My Workspace");
      setProjects(ws.getProjects());
      setActiveProjectId(ws.getActiveProjectId());
    } else if (!ws.getActiveProjectId()) {
      const first = ws.getProjects()[0];
      ws.setActiveProject(first.id);
      setActiveProjectId(first.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep Pro status in sync when the license key changes in another tab/window.
  useEffect(() => {
    const sync = () => setLicensed(hasLicense());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLimit) { setShowLimit(false); return; }
        if (showPlans) { setShowPlans(false); return; }
        if (showActivate) { setShowActivate(false); return; }
        if (viewFile) { setViewFile(null); return; }
        if (saveModalOpen) { setSaveModalOpen(false); setClipboardContent(""); return; }
        if (showSOS) { setShowSOS(false); return; }
        if (showSituation) { setShowSituation(false); return; }
        if (showRestorePicker) { setShowRestorePicker(false); return; }
        if (showOnboarding) { return; } // onboarding must be dismissed via button
        if (activePrompt) { setActivePrompt(null); return; }
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt, saveModalOpen, viewFile, showSOS, showSituation, showRestorePicker, showOnboarding, showLimit, showPlans, showActivate]);

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

  const startWithResume = () => {
    localStorage.setItem("qq_onboarded", "1");
    setShowOnboarding(false);
    openPromptFromSOS("resume");
  };

  const openSituation = () => {
    localStorage.setItem("qq_situation_seen", "1");
    setShowSituation(true);
  };

  const pickSituation = (promptId: string) => {
    setShowSituation(false);
    openPromptFromSOS(promptId);
  };

  const openPromptFromSOS = (promptId: string) => {
    const def = PROMPT_DEFS.find((x) => x.id === promptId);
    if (!def) return;
    setShowSOS(false);
    if (def.id === "restore") {
      openRestoreFlow();
      return;
    }
    const project = ws.getProjects().find((p) => p.id === ws.getActiveProjectId());
    const wf = project?.workflow ?? null;
    setActivePrompt({ label: def.label, prompt: getPromptText(def.id, wf) });
    setShowSave(false);
    setPanelOpen(true);
  };

  /** Open the Restore picker — lets user choose a backup file from SAFE before opening the prompt. */
  const openRestoreFlow = () => {
    setShowRestorePicker(true);
    setPanelOpen(true);
  };

  /** Build the Restore prompt with the chosen backup file's content injected, then open it. */
  const openRestoreWithFile = (file: WFile | null) => {
    const project = ws.getProjects().find((p) => p.id === ws.getActiveProjectId());
    const wf = project?.workflow ?? null;
    const baseText = getPromptText("restore", wf);
    const PLACEHOLDER = "[paste backup file here]";
    let finalText = baseText;
    if (file) {
      const occurrences = baseText.split(PLACEHOLDER).length - 1;
      if (occurrences === 1) {
        finalText = baseText.replace(PLACEHOLDER, file.content.trim());
      } else {
        // Template drifted (0 or multiple placeholders). Fail safe: append.
        finalText = `${baseText}\n\n${file.content.trim()}`;
      }
    }
    const label = file ? `Restore — ${file.name}` : "Restore From Backup";
    setShowRestorePicker(false);
    setActivePrompt({ label, prompt: finalText });
    setShowSave(false);
  };

  const handleConsolidate = (files: WFile[]) => {
    if (files.length < 2) return;
    const empties = files.filter((f) => !f.content || !f.content.trim());
    if (empties.length > 0) {
      const names = empties.map((f) => f.name).join(", ");
      setClipboardError(
        `${empties.length} file(s) have empty content (${names}). Empty files have nothing to pass to the AI.`
      );
      setTimeout(() => setClipboardError(null), 5000);
      if (empties.length === files.length) return;
    }
    const sources = files.map((f) => ({ name: f.name, content: f.content }));
    const promptText = getConsolidatePrompt(sources);
    setActivePrompt({
      label: `Consolidate (${files.length} files)`,
      prompt: promptText,
    });
    setShowSave(false);
    setPanelOpen(true);
  };

  // Files whose full content is at or below this length are included verbatim in
  // the Weekly Summary; longer files fall back to their meta `summary` line.
  const WEEKLY_SHORT_LIMIT = 500;

  const flashError = (msg: string) => {
    setClipboardError(msg);
    setTimeout(() => setClipboardError(null), 4000);
  };

  // Button 1 — Weekly Summary: getFiles(projectId) filtered to the last 7 days.
  const handleWeeklySummary = () => {
    if (!activeProjectId) return;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const files = ws
      .getFiles(activeProjectId)
      .filter((f) => f.createdAt >= weekAgo && f.content.trim())
      .sort((a, b) => a.createdAt - b.createdAt);
    if (files.length === 0) {
      flashError("No files saved in the last 7 days.");
      return;
    }
    const sources: ConsolidateSource[] = files.map((f) => {
      const trimmed = f.content.trim();
      if (trimmed.length <= WEEKLY_SHORT_LIMIT) return { name: f.name, content: trimmed };
      const meta = parseFileMeta(f.content);
      return { name: f.name, content: meta.summary || trimmed };
    });
    setActivePrompt({
      label: `Weekly Summary (${files.length} files)`,
      prompt: getWeeklySummaryPrompt(sources),
    });
    setShowSave(false);
    setPanelOpen(true);
  };

  // Button 2 — Project Report: all files for the current project, chronological.
  const handleProjectReport = () => {
    if (!activeProjectId) return;
    const files = ws
      .getFiles(activeProjectId)
      .filter((f) => f.content.trim())
      .sort((a, b) => a.createdAt - b.createdAt);
    if (files.length === 0) {
      flashError("This project has no saved files yet.");
      return;
    }
    const sources: ConsolidateSource[] = files.map((f) => ({ name: f.name, content: f.content }));
    setActivePrompt({
      label: `Project Report (${files.length} files)`,
      prompt: getProjectReportPrompt(sources),
    });
    setShowSave(false);
    setPanelOpen(true);
  };

  // Button 3 — Resume Briefing: latest CURRENT (Resume) + latest ANCHORS file.
  const handleResumeBriefing = () => {
    if (!activeProjectId) return;
    const resume = ws.getFilesInFolderByName(activeProjectId, "CURRENT", 1)[0] ?? null;
    const anchor = ws.getFilesInFolderByName(activeProjectId, "ANCHORS", 1)[0] ?? null;
    const sources: ConsolidateSource[] = [];
    if (resume && resume.content.trim()) sources.push({ name: resume.name, content: resume.content });
    if (anchor && anchor.content.trim()) sources.push({ name: anchor.name, content: anchor.content });
    if (sources.length === 0) {
      flashError("No Resume (CURRENT) or Anchors file found yet.");
      return;
    }
    setActivePrompt({
      label: "Resume Briefing",
      prompt: getResumeBriefingPrompt(sources, activeWorkflow),
    });
    setShowSave(false);
    setPanelOpen(true);
  };

  const handleClipboardCapture = async () => {
    setClipboardError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setClipboardError("Clipboard is empty. Copy an AI response first.");
        setTimeout(() => setClipboardError(null), 3500);
        return;
      }
      setClipboardContent(text);
      setSaveModalOpen(true);
      setPanelOpen(true);
    } catch {
      setClipboardError("Clipboard access needed. Allow it in your browser and try again.");
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

  // Resize popup window to match panel open/closed state.
  const resizeSidePanelWindow = useCallback((open: boolean) => {
    const target = open ? SIDE_PANEL_OPEN_WIDTH : SIDE_PANEL_ICON_WIDTH;
    try {
      window.resizeTo(target, window.outerHeight);
      const x = isRight ? window.screen.availWidth - target : 0;
      window.moveTo(x, window.screenY);
    } catch {
      // resizeTo is blocked in non-popup windows — ignore silently
    }
  }, [isRight]);

  useEffect(() => {
    if (!isSidePanel) return;
    resizeSidePanelWindow(panelOpen);
  }, [panelOpen, isSidePanel, resizeSidePanelWindow]);

  const togglePanel = () => {
    const nextOpen = !panelOpen;
    // Some browser side-panel hosts ignore resizeTo after collapsing. If the
    // viewport is still too narrow, reopen in a fresh correctly-sized popup
    // instead of rendering fixed cards and modals inside the collapsed width.
    if (isSidePanel && nextOpen && window.innerWidth < 300) {
      const popup = window.open(
        window.location.href,
        "qq_sidecar_expanded",
        `width=${SIDE_PANEL_OPEN_WIDTH},height=${window.screen.availHeight},left=${isRight ? window.screen.availWidth - SIDE_PANEL_OPEN_WIDTH : 0},top=0,resizable=yes`
      );
      if (popup) {
        popup.focus();
        try { window.close(); } catch {}
        return;
      }
    }
    // Restore the popup width before rendering the expanded panel. Otherwise
    // the first render can calculate fixed panels/modals against the collapsed
    // 58px viewport and leave their narrow layout behind.
    if (isSidePanel) resizeSidePanelWindow(nextOpen);
    setPanelOpen(nextOpen);
  };

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
        {/* Toggle button — collapses/expands the panel (works in side panel mode too) */}
        <button
          onClick={togglePanel}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-all"
          style={{
            background: panelOpen ? "#0f172a" : "#f1f5f9",
            color: panelOpen ? "#fff" : "#64748b",
          }}
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          <span className={tipClass}>
            {panelOpen ? "Close panel" : "AISidecar"}
          </span>
        </button>

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "2px 0 6px" }} />

        {/* Clipboard capture — one-click save of any AI response */}
        <button
          onClick={handleClipboardCapture}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#fff", background: "#0f172a" }}
        >
          <ClipboardPaste className="relative z-10" style={{ width: 16, height: 16 }} />
          <span className={tipClass}>
            <span className="block font-semibold">Save from clipboard</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Save a copied AI response instantly</span>
          </span>
        </button>

        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />

        {/* Prompt icons */}
        {displayPrompts.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "restore") { openRestoreFlow(); return; }
              setActivePrompt({ label: item.label, prompt: item.prompt });
              setShowSave(false);
            }}
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
            <span className="block font-semibold">SOS recovery mode</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>When the AI goes sideways</span>
          </span>
        </button>

        {/* What's going on? situation guide */}
        <button
          onClick={openSituation}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#0369a1" }}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#e0f2fe" }} />
          <HelpCircle className="relative z-10" style={{ width: 18, height: 18 }} />
          <span className={tipClass}>
            <span className="block font-semibold">Help</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>What's going on right now?</span>
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
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Projects & files</span>
          </span>
        </button>

        {/* Pro — upgrade / activate (hidden once licensed) or status badge */}
        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />
        {licensed ? (
          <div className="relative group flex flex-col items-center gap-0.5 py-1">
            <div
              className="px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: "#fef3c7", color: "#b45309" }}
            >
              <Crown style={{ width: 11, height: 11 }} />
              <span className="text-[10px] font-bold">Pro</span>
            </div>
            <span className="text-[8px] font-semibold" style={{ color: "#16a34a" }}>Licensed ✓</span>
            <span className={tipClass}>
              <span className="block font-semibold">Sidecar Pro</span>
              <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Licensed ✓ · Unlimited saves</span>
            </span>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowPlans(true)}
              className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: "#fff", background: "#b45309" }}
            >
              <Crown className="relative z-10" style={{ width: 16, height: 16 }} />
              <span className={tipClass}>
                <span className="block font-semibold">Upgrade to Pro</span>
                <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Unlimited saves</span>
              </span>
            </button>
            <button
              onClick={() => setShowActivate(true)}
              className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: "#b45309" }}
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#fef3c7" }} />
              <KeyRound className="relative z-10" style={{ width: 16, height: 16 }} />
              <span className={tipClass}>
                <span className="block font-semibold">Activate Pro</span>
                <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Enter your license key</span>
              </span>
            </button>
          </>
        )}

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
                <span className="block font-semibold">Install as app</span>
                <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Launch straight from your desktop</span>
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
                <span className="block font-semibold">Pin beside your screen</span>
                <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Dock it narrow next to ChatGPT</span>
              </span>
            </button>
          </>
        )}

        {/* About — opens landing page in new tab */}
        <div style={{ width: 20, height: 1, background: "#e2e8f0", margin: "6px 0 2px" }} />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#64748b", textDecoration: "none" }}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#f1f5f9" }} />
          <Info className="relative z-10" style={{ width: 16, height: 16 }} />
          <span className={tipClass}>
            <span className="block font-semibold">About Sidecar</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Open in a new tab</span>
          </span>
        </a>

        {/* Side toggle — flip panel left/right (visible in all modes) */}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setPanelSide((s) => (s === "right" ? "left" : "right"))}
          className="relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ color: "#64748b", background: "#f1f5f9" }}
          title={isRight ? "Move to left" : "Move to right"}
        >
          <ArrowLeftRight style={{ width: 14, height: 14 }} />
          <span className={tipClass}>
            <span className="block font-semibold">{isRight ? "Move to left" : "Move to right"}</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>Switch panel side</span>
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
                <p className="text-xs font-bold text-slate-700 shrink-0">AISidecar</p>
                {activeProject && (
                  <div className="relative">
                    <button
                      onClick={() => setWorkflowMenuOpen((v) => !v)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all hover:opacity-80"
                      style={{
                        background: activeWorkflowDef ? "#eef2ff" : "#f1f5f9",
                        color: activeWorkflowDef ? "#4338ca" : "#64748b",
                      }}
                      title="Change workflow"
                    >
                      <span>{activeWorkflowDef ? `${activeWorkflowDef.emoji} ${activeWorkflowDef.label} mode` : "💻 Development mode (default)"}</span>
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
                            Reset to no workflow
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
                  {t === "today" ? "Today" : t === "prompts" ? "Prompts" : "Workspace"}
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
                  {/* Combine — build a prompt from existing saved files */}
                  <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Combine
                  </p>
                  {[
                    { id: "weekly", label: "Weekly Summary", description: "Last 7 days of files → a recap prompt", icon: CalendarDays, color: "#0ea5e9", onClick: handleWeeklySummary },
                    { id: "report", label: "Project Report", description: "Every file in this project → a status prompt", icon: ScrollText, color: "#6366f1", onClick: handleProjectReport },
                    { id: "briefing", label: "Resume Briefing", description: "Latest CURRENT + ANCHORS → a quick brief", icon: Rocket, color: "#f59e0b", onClick: handleResumeBriefing },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group cursor-pointer"
                    >
                      <item.icon className="mt-0.5 shrink-0" style={{ width: 15, height: 15, color: item.color }} />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  ))}
                  <div className="mx-4 my-2 border-t border-slate-100" />
                  {displayPrompts.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "restore") { openRestoreFlow(); return; }
                        setActivePrompt({ label: item.label, prompt: item.prompt });
                        setShowSave(false);
                      }}
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
                      title="Disconnect"
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
                      {fsConnecting ? "Connecting…" : "Reconnect"}
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
                            {fsConnecting ? "Choosing folder…" : "Choose Workspace Folder"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Save files straight to a local folder
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fef3c7" }}>
                          <HardDrive style={{ width: 15, height: 15, color: "#d97706" }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Browser not supported</p>
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
                      <p className="text-[11px] text-slate-400 mb-2">No projects yet</p>
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
                          {activeProject?.name ?? "Select a project"}
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
                                onClick={() => { if (confirm(`Delete the "${p.name}" project?\n\nAll files and folders inside it will be removed too. (If a local disk folder is linked, the files on disk stay.)`)) { ws.deleteProject(p.id); refreshWorkspace(); setProjectMenuOpen(false); } }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                title="Delete this project"
                              >
                                <Trash2 style={{ width: 12, height: 12 }} />
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
                          placeholder="Project name..."
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400"
                        />
                        <button
                          onClick={handleCreateProject}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "#0f172a", color: "#fff" }}
                        >
                          Create
                        </button>
                        <button
                          onClick={() => { setCreatingProject(false); setNewProjectName(""); setNewProjectWorkflow(null); }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-slate-100"
                          style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
                        >
                          Cancel
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">Workflow (optional)</p>
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
                            ? `Prompts will be tuned for ${getWorkflowDef(newProjectWorkflow)?.label}.`
                            : "If you skip this, you start on common (development default). You can change it later."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setCreatingProject(true); setProjectMenuOpen(false); }}
                      className="mt-2 w-full flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      New project
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
                      <p className="text-[11px] text-slate-400">Create a project and<br />the folder structure is built for you</p>
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
                      Save result
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
                    Click the button below to copy. (Dragging with your mouse only grabs what's visible on screen, so parts can get cut off.)
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
                    {copied ? <><Check style={{ width: 15, height: 15 }} /> Copied!</> : <><Copy style={{ width: 15, height: 15 }} /> Copy Prompt</>}
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
                        Save AI response
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
            ? `Original — ${new Date().toLocaleDateString("en-US")}`
            : activePrompt
              ? `${activePrompt.label} — ${new Date().toLocaleDateString("en-US")}`
              : ""
        }
        defaultContent={clipboardContent}
        defaultType={clipboardContent ? "note" : "summary"}
        defaultFolderName={clipboardContent ? "DRAFTS" : undefined}
        onClose={() => { setSaveModalOpen(false); setClipboardContent(""); }}
        onSaved={() => { markActivity(); refreshWorkspace(); setTab("today"); setPanelOpen(true); setClipboardContent(""); }}
        onLimitReached={() => setShowLimit(true)}
      />

      {/* ── Pro: plans / activation / free-limit ─────────── */}
      <PlanModal open={showPlans} onClose={() => setShowPlans(false)} />
      <ActivateModal
        open={showActivate}
        onClose={() => setShowActivate(false)}
        onActivated={() => { setLicensed(true); setShowActivate(false); }}
      />
      <LimitModal
        open={showLimit}
        onClose={() => setShowLimit(false)}
        onUpgrade={() => { setShowLimit(false); setShowPlans(true); }}
      />

      {/* ── Clipboard error toast ───────────────────────── */}
      <AnimatePresence>
        {clipboardError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-4 right-4 z-[100001] max-w-sm mx-auto px-4 py-3 rounded-xl text-xs font-semibold text-center"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
          >
            {clipboardError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save reminder toast ─────────────────────────── */}
      <SaveReminderToast
        suppressed={!!viewFile || saveModalOpen || showSOS || showSituation || showRestorePicker || showOnboarding || !!activePrompt || showPlans || showActivate || showLimit}
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
              aria-label="SOS recovery mode"
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
            >
              <div className="px-6 pt-6 pb-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg,#fee2e2,#fff)" }}>
                <Siren style={{ width: 28, height: 28, color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-800">SOS recovery mode</p>
                  <p className="text-xs text-slate-500 mt-1">What just happened? We'll open the right prompt for your situation.</p>
                </div>
                <button onClick={() => setShowSOS(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div className="px-4 py-3 space-y-2">
                {[
                  { id: "resume", emoji: "🧭", title: "I have no idea where I left off", desc: "Rebuild your working context fast.", action: "Open resume prompt" },
                  { id: "compress", emoji: "🌀", title: "The AI lost the context", desc: "It's rambling / can't remember the earlier chat. Make a compressed version and paste it into a fresh session. Also use this when responses are getting too long or the chat is hitting its limit.", action: "Open compress prompt" },
                  { id: "backup", emoji: "🛟", title: "Scared before a big edit", desc: "Grab a backup snapshot of the current state and save it to the SAFE folder.", action: "Open backup prompt" },
                  { id: "restore", emoji: "↺", title: "Need to go back to a backup", desc: "Paste a backup file you already saved into the AI to restore the context.", action: "Open restore prompt" },
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
                Just copy a prompt and paste it into ChatGPT/Claude. We're a safety net that isn't connected to any AI.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "What's going on?" Situation Guide Modal ────── */}
      <AnimatePresence>
        {showSituation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowSituation(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="What's going on right now?"
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
            >
              <div className="px-6 pt-6 pb-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg,#e0f2fe,#fff)" }}>
                <HelpCircle style={{ width: 26, height: 26, color: "#0369a1", flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-800">What's going on right now?</p>
                  <p className="text-xs text-slate-500 mt-1">Pick the closest — we'll show you what to use.</p>
                </div>
                <button onClick={() => setShowSituation(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* 3 big situation cards */}
              <div className="px-4 pt-3 grid grid-cols-1 gap-2">
                {[
                  { id: "resume", emoji: "▶️", title: "I lost where I was", desc: "Forgot how far you got. Pick this back up where you left off.", action: "Open Resume" },
                  { id: "compress", emoji: "🌀", title: "The AI lost the thread", desc: "It's rambling or forgot earlier context. Compress and paste into a fresh chat.", action: "Open Compress" },
                  { id: "backup", emoji: "🛟", title: "I'm about to make a big change", desc: "Take a safety snapshot before you touch anything.", action: "Open Backup" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickSituation(c.id)}
                    className="w-full text-left rounded-xl p-3 flex items-start gap-3 transition-all hover:scale-[1.01] active:scale-100"
                    style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{c.desc}</p>
                      <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: "#0369a1" }}>
                        {c.action} <ArrowRight style={{ width: 11, height: 11 }} />
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* smaller secondary rows */}
              <div className="px-4 pt-2 pb-3 grid grid-cols-2 gap-2">
                {[
                  { id: "anchors", emoji: "⚓", title: "Why did we decide that?", action: "Anchors" },
                  { id: "next", emoji: "✅", title: "What do I do next?", action: "Next" },
                  { id: "restore", emoji: "↺", title: "Go back to a backup", action: "Restore" },
                  { id: "summary", emoji: "📄", title: "Sum up everything", action: "Summary" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => pickSituation(r.id)}
                    className="text-left rounded-lg p-2.5 flex items-start gap-2 transition-all hover:scale-[1.01] active:scale-100"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 leading-snug">{r.title}</p>
                      <p className="text-[10px] font-semibold mt-1 flex items-center gap-1" style={{ color: "#0369a1" }}>
                        {r.action} <ArrowRight style={{ width: 9, height: 9 }} />
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-6 py-3 text-[10px] text-slate-400 text-center" style={{ borderTop: "1px solid #f1f5f9" }}>
                We copy a prompt for you to paste into ChatGPT/Claude. We're a safety net — not connected to any AI.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Restore Picker Modal ────────────────────────── */}
      <AnimatePresence>
        {showRestorePicker && (() => {
          const safeFiles = activeProjectId
            ? ws.getFilesInFolderByName(activeProjectId, "SAFE")
            : [];
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
              style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowRestorePicker(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="restore-picker-title"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{ background: "#fff", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
              >
                <div className="px-5 pt-5 pb-3 flex items-start gap-3" style={{ background: "linear-gradient(135deg,#ecfccb,#fff)" }}>
                  <RotateCcw style={{ width: 22, height: 22, color: "#65a30d", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p id="restore-picker-title" className="text-sm font-bold text-slate-800">Choose a backup file</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Pick a backup to restore and we'll build a ready-to-send prompt in one go.
                    </p>
                  </div>
                  <button onClick={() => setShowRestorePicker(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto px-3 py-2">
                  {safeFiles.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        No backup files in the SAFE folder yet.<br />
                        Grab a backup first with the <span className="font-semibold text-slate-700">Backup</span> icon.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {safeFiles.map((file) => {
                        const date = new Date(file.createdAt);
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
                        return (
                          <button
                            key={file.id}
                            onClick={() => openRestoreWithFile(file)}
                            className="w-full text-left rounded-lg px-3 py-2.5 transition-all hover:bg-slate-50 active:bg-slate-100"
                            style={{ border: "1px solid #e2e8f0" }}
                          >
                            <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dateStr}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
                  <p className="text-[10px] text-slate-400 flex-1">
                    {safeFiles.length > 0 ? "Click a file and it drops straight into the prompt." : ""}
                  </p>
                  <button
                    onClick={() => openRestoreWithFile(null)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
                  >
                    Open without a backup
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
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
              aria-label="Welcome to AISidecar"
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 30px 70px rgba(0,0,0,0.3)" }}
            >
              <div className="px-7 pt-8 pb-2">
                <p className="text-[22px] font-bold text-slate-900 leading-snug">
                  You closed the chat yesterday.
                </p>
                <p className="text-[22px] font-bold text-slate-900 leading-snug">
                  Today you opened a new one.
                </p>
                <p className="text-[22px] font-bold leading-snug" style={{ color: "#dc2626" }}>
                  It's all gone.
                </p>
              </div>

              <div className="px-7 py-3">
                <div className="flex flex-wrap gap-2">
                  {["Resume", "Compress", "Anchors", "Merge"].map((p) => (
                    <span
                      key={p}
                      className="px-3 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: "#f1f5f9", color: "#475569" }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Sidecar keeps your AI work in files — so you can pick up exactly where you left off.
                </p>
              </div>

              <div className="px-7 pt-2 pb-6 space-y-3">
                <button
                  onClick={startWithResume}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: "#0f172a", color: "#fff" }}
                >
                  Try Resume now <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
                <button
                  onClick={dismissOnboarding}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Skip for now
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
              The side panel opened in a new window
            </div>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              You don't need this tab anymore.<br/>
              Close it yourself, or use the button below.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { try { window.close(); } catch {} setSpawnedPopup(false); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "#0f172a", color: "#fff" }}
              >
                Close this tab
              </button>
              <button
                onClick={() => setSpawnedPopup(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-slate-50"
                style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }}
              >
                Keep using it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
