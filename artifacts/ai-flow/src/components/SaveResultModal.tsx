import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, FolderOpen, Sparkles, AlertTriangle } from "lucide-react";
import { ws, type FileType, type WFile } from "../lib/workspace";
import { fsAccess } from "../lib/fsAccess";
import { hasLicense, FREE_FILE_LIMIT } from "../lib/license";

interface Props {
  open: boolean;
  defaultTitle?: string;
  defaultContent?: string;
  defaultType?: FileType;
  /** Folder name (case-insensitive) used when no metadata kind is detected. */
  defaultFolderName?: string;
  projectId: string | null;
  rootHandle: FileSystemDirectoryHandle | null;
  onClose: () => void;
  onSaved: () => void;
  /** Called when a new-file save is blocked by the free plan limit. */
  onLimitReached?: () => void;
}

const TYPE_OPTIONS: { value: FileType; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "anchor", label: "Anchor" },
  { value: "code", label: "Code" },
  { value: "note", label: "Note" },
  { value: "prompt", label: "Prompt" },
];

// Keys include singular/plural and synonym aliases so AI-emitted kinds like
// "anchor" (singular) still route correctly. Parser lowercases + strips quotes.
const FOLDER_BY_KIND: Record<string, string> = {
  resume: "CURRENT",
  summary: "SUMMARIES",
  summaries: "SUMMARIES",
  anchor: "ANCHORS",
  anchors: "ANCHORS",
  compress: "CURRENT",
  next: "NEXT",
  backup: "SAFE",
};

const TYPE_BY_KIND: Record<string, FileType> = {
  resume: "note",
  summary: "summary",
  summaries: "summary",
  anchor: "anchor",
  anchors: "anchor",
  compress: "note",
  next: "note",
  backup: "note",
};

interface ParsedMetadata {
  kind?: string;
  summary?: string;
  filename?: string;
  workflow?: string;
}

function parseMetadata(raw: string): ParsedMetadata {
  if (!raw) return {};
  // Strip outer fenced code block if present (``` or ```markdown etc.)
  let body = raw.trim();
  const fenceMatch = body.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) body = fenceMatch[1];

  const result: ParsedMetadata = {};

  // Extract YAML frontmatter between first --- and second ---
  const yamlMatch = body.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const lines = yamlMatch[1].split("\n");
    for (const line of lines) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
      if (!m) continue;
      const key = m[1];
      // Strip surrounding quotes — AI often emits YAML values like kind: "anchors".
      const value = m[2].trim().replace(/^["']|["']$/g, "").trim();
      if (key === "kind") result.kind = value.toLowerCase();
      else if (key === "summary") result.summary = value;
      else if (key === "workflow") result.workflow = value.toLowerCase();
    }
  }

  // Extract filename line (last `filename:` occurrence wins)
  const fnMatches = [...body.matchAll(/^\s*filename:\s*([^\n\r]+\.md)\s*$/gm)];
  if (fnMatches.length > 0) {
    result.filename = fnMatches[fnMatches.length - 1][1].trim();
  }

  return result;
}

export function SaveResultModal({
  open,
  defaultTitle = "",
  defaultContent = "",
  defaultType = "summary",
  defaultFolderName,
  projectId,
  rootHandle,
  onClose,
  onSaved,
  onLimitReached,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [type, setType] = useState<FileType>(defaultType);
  const [folderId, setFolderId] = useState("");
  const [saved, setSaved] = useState(false);
  const [fsSaving, setFsSaving] = useState(false);
  const [autoDetected, setAutoDetected] = useState<ParsedMetadata | null>(null);
  const [collisionAction, setCollisionAction] = useState<"new" | "overwrite">("new");
  const [emptyError, setEmptyError] = useState(false);
  // Tracks fields the user manually edited — we won't overwrite those.
  const [touched, setTouched] = useState<{ title: boolean; folder: boolean; type: boolean }>({
    title: false,
    folder: false,
    type: false,
  });

  const folders = projectId
    ? ws.getFolders(projectId).filter((f) => f.parentId === null)
    : [];

  // Detect a same-name file in the chosen folder (case-insensitive).
  const existingFile: WFile | null = useMemo(() => {
    if (!projectId || !folderId || !title.trim()) return null;
    const trimmed = title.trim().toLowerCase();
    return (
      ws.getFilesInFolder(folderId).find((f) => f.name.toLowerCase() === trimmed) ?? null
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, folderId, title, saved]);

  // Compute the next available "name_N" if user picks "new".
  const suggestedNewName = useMemo(() => {
    if (!folderId || !existingFile) return title.trim();
    const base = title.trim().replace(/_(\d+)$/i, "");
    const taken = new Set(
      ws.getFilesInFolder(folderId).map((f) => f.name.toLowerCase())
    );
    let n = 2;
    while (taken.has(`${base}_${n}`.toLowerCase())) n++;
    return `${base}_${n}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, existingFile, title]);

  // Reset action default to "new" whenever a new collision appears.
  useEffect(() => {
    if (existingFile) setCollisionAction("new");
  }, [existingFile?.id]);

  // Memoize parse result so we don't reparse on every render
  const parsed = useMemo(() => parseMetadata(content), [content]);

  // Auto-apply parsed metadata when content changes (only fields user hasn't touched)
  useEffect(() => {
    if (!open) return;
    const hasAny = parsed.kind || parsed.filename || parsed.summary;
    if (!hasAny) {
      setAutoDetected(null);
      return;
    }
    setAutoDetected(parsed);

    // Auto-fill title from filename (strip .md, fsAccess re-appends it)
    if (!touched.title && parsed.filename) {
      const cleanTitle = parsed.filename.replace(/\.md$/i, "");
      setTitle(cleanTitle);
    }

    // Auto-fill type from kind
    if (!touched.type && parsed.kind && TYPE_BY_KIND[parsed.kind]) {
      setType(TYPE_BY_KIND[parsed.kind]);
    }

    // Auto-fill folder from kind → folder name
    if (!touched.folder && parsed.kind && FOLDER_BY_KIND[parsed.kind]) {
      const targetName = FOLDER_BY_KIND[parsed.kind];
      const match = folders.find((f) => f.name.toUpperCase() === targetName);
      if (match) setFolderId(match.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.kind, parsed.filename, parsed.summary, open]);

  const handleSave = async () => {
    if (!projectId || !folderId || !title.trim()) return;
    // Block saving empty / whitespace-only content — nothing meaningful to keep.
    if (!content.replace(/\s/g, "")) {
      setEmptyError(true);
      return;
    }
    // Free plan file limit — only blocks NEW files (overwrites don't grow the count).
    const willCreateNew = !(existingFile && collisionAction === "overwrite");
    if (willCreateNew && !hasLicense() && ws.getFiles().length >= FREE_FILE_LIMIT) {
      onLimitReached?.();
      return;
    }
    // Decide final name based on collision action
    const finalName =
      existingFile && collisionAction === "new" ? suggestedNewName : title.trim();

    if (existingFile && collisionAction === "overwrite") {
      ws.updateFile(existingFile.id, { name: finalName, content });
    } else {
      ws.createFile(projectId, folderId, finalName, content, type);
    }
    setSaved(true);

    // Write to real filesystem if connected
    if (rootHandle) {
      setFsSaving(true);
      try {
        const projectName = ws.getProjectName(projectId);
        const folderPath = ws.getFolderPath(folderId);
        const rootFolder = folderPath[0] ?? "MISC";
        const subPath = folderPath.slice(1);
        await fsAccess.writeFile(rootHandle, projectName, subPath.length > 0 ? [rootFolder, ...subPath] : [rootFolder], finalName, content);
      } catch (e) {
        console.warn("FS write failed", e);
      }
      setFsSaving(false);
    }

    setTimeout(() => {
      setSaved(false);
      onSaved();
      onClose();
    }, 800);
  };

  // Deterministically sync defaults whenever the modal transitions to open.
  // Using `open` (not exit-complete) guarantees first-time and rapid reopen flows
  // both pick up the latest defaultContent / defaultFolderName.
  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setContent(defaultContent);
    setType(defaultType);
    const fallback = defaultFolderName
      ? folders.find((f) => f.name.toUpperCase() === defaultFolderName.toUpperCase())
      : undefined;
    setFolderId(fallback?.id ?? folders[0]?.id ?? "");
    setSaved(false);
    setAutoDetected(null);
    setEmptyError(false);
    setTouched({ title: false, folder: false, type: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[199998]"
            style={{ background: "rgba(15,23,42,0.3)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
            className="fixed inset-0 flex items-center justify-center z-[199999] px-6"
            style={{ paddingRight: 72 }}
          >
            <div
              className="w-full max-w-md overflow-hidden"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                boxShadow: "0 20px 60px rgba(0,0,0,0.14)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen style={{ width: 15, height: 15, color: "#f59e0b" }} />
                  <p className="text-sm font-bold text-slate-800">Save result</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* No project warning */}
                {!projectId && (
                  <div
                    className="text-xs text-amber-700 px-3 py-2 rounded-lg"
                    style={{ background: "#fef3c7", border: "1px solid #fde68a" }}
                  >
                    Create a project in the Workspace tab first.
                  </div>
                )}

                {/* Auto-detection badge */}
                {autoDetected && (autoDetected.kind || autoDetected.filename) && (
                  <div
                    className="text-[11px] px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#166534" }}
                  >
                    <Sparkles style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">Auto-detected</p>
                      <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "#15803d" }}>
                        {autoDetected.kind && <>Kind: <b>{autoDetected.kind}</b> · </>}
                        {autoDetected.workflow && autoDetected.workflow !== "common" && <>Workflow: <b>{autoDetected.workflow}</b> · </>}
                        {autoDetected.filename && <>Filename: <b>{autoDetected.filename}</b></>}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">You can change any of these below.</p>
                    </div>
                  </div>
                )}

                {/* Folder picker */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">
                    Save to
                  </label>
                  <select
                    value={folderId}
                    onChange={(e) => { setFolderId(e.target.value); setTouched((t) => ({ ...t, folder: true })); }}
                    disabled={!projectId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400 transition-colors"
                  >
                    <option value="">Select a folder...</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        /{f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File type */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">
                    File type
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setType(opt.value); setTouched((t) => ({ ...t, type: true })); }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          background: type === opt.value ? "#0f172a" : "#f1f5f9",
                          color: type === opt.value ? "#fff" : "#64748b",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setTouched((t) => ({ ...t, title: true })); }}
                    placeholder="File title..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">
                    Content (paste AI reply)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); if (emptyError) setEmptyError(false); }}
                    placeholder="Paste your ChatGPT / Claude reply here. If it has metadata, it gets sorted automatically."
                    rows={5}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none transition-colors resize-none font-mono leading-relaxed"
                    style={{ borderColor: emptyError ? "#fca5a5" : undefined }}
                  />
                  {emptyError && (
                    <p className="mt-1.5 text-[11px] font-medium" style={{ color: "#dc2626" }}>
                      Nothing to save — paste an AI reply first
                    </p>
                  )}
                </div>
              </div>

              {/* Collision warning */}
              {existingFile && !saved && (
                <div className="px-5 pb-2">
                  <div
                    className="text-[11px] px-3 py-2.5 rounded-lg"
                    style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">A file with this name already exists</p>
                        <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "#a16207" }}>
                          <b>{existingFile.name}</b> is already in this folder.
                          {" "}Overwriting will erase the old content{rootHandle ? " (both the app and your linked folder)" : ""}.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5 pl-[19px]">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="collision"
                          checked={collisionAction === "new"}
                          onChange={() => setCollisionAction("new")}
                          className="mt-0.5 cursor-pointer"
                        />
                        <span className="text-[11px] leading-snug" style={{ color: "#92400e" }}>
                          Create new → <b>{suggestedNewName}</b>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="collision"
                          checked={collisionAction === "overwrite"}
                          onChange={() => setCollisionAction("overwrite")}
                          className="mt-0.5 cursor-pointer"
                        />
                        <span className="text-[11px] leading-snug" style={{ color: "#92400e" }}>
                          Overwrite (old content is lost)
                        </span>
                      </label>
                      <p className="text-[10px]" style={{ color: "#a16207" }}>
                        Or change the <b>Title</b> above to something different.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save button */}
              <div className="px-5 pb-5">
                <button
                  onClick={handleSave}
                  disabled={!projectId || !folderId || !title.trim() || saved}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: saved ? "#f0fdf4" : "#0f172a",
                    color: saved ? "#16a34a" : "#fff",
                    border: saved ? "1px solid #bbf7d0" : "none",
                  }}
                >
                  <Save style={{ width: 14, height: 14 }} />
                  {fsSaving
                    ? "Writing to disk..."
                    : saved
                    ? "Saved!"
                    : existingFile && collisionAction === "overwrite"
                    ? "Overwrite"
                    : existingFile && collisionAction === "new"
                    ? `Create new (${suggestedNewName})`
                    : rootHandle
                    ? "Save + create file"
                    : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
