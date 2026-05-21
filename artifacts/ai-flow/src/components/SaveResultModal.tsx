import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, FolderOpen } from "lucide-react";
import { ws, type FileType } from "../lib/workspace";

interface Props {
  open: boolean;
  defaultTitle?: string;
  defaultContent?: string;
  defaultType?: FileType;
  projectId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS: { value: FileType; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "anchor", label: "Anchor" },
  { value: "code", label: "Code" },
  { value: "note", label: "Note" },
  { value: "prompt", label: "Prompt" },
];

export function SaveResultModal({
  open,
  defaultTitle = "",
  defaultContent = "",
  defaultType = "summary",
  projectId,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [type, setType] = useState<FileType>(defaultType);
  const [folderId, setFolderId] = useState("");
  const [saved, setSaved] = useState(false);

  const folders = projectId
    ? ws.getFolders(projectId).filter((f) => f.parentId === null)
    : [];

  const handleSave = () => {
    if (!projectId || !folderId || !title.trim()) return;
    ws.createFile(projectId, folderId, title.trim(), content, type);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved();
      onClose();
    }, 800);
  };

  const handleOpen = () => {
    setTitle(defaultTitle);
    setContent(defaultContent);
    setType(defaultType);
    setFolderId(folders[0]?.id ?? "");
    setSaved(false);
  };

  return (
    <AnimatePresence onExitComplete={handleOpen}>
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
                  <p className="text-sm font-bold text-slate-800">결과 저장</p>
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
                    먼저 워크스페이스 탭에서 프로젝트를 만들어주세요.
                  </div>
                )}

                {/* Folder picker */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">
                    저장 위치
                  </label>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    disabled={!projectId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400 transition-colors"
                  >
                    <option value="">폴더 선택...</option>
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
                    파일 종류
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setType(opt.value)}
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
                    제목
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="파일 제목..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">
                    내용 (AI 응답 붙여넣기)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="ChatGPT / Claude 응답을 여기 붙여넣으세요..."
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-colors resize-none font-mono leading-relaxed"
                  />
                </div>
              </div>

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
                  {saved ? "저장됨!" : "저장하기"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
