import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit3, Save, Copy, Check, Trash2 } from "lucide-react";
import { ws, type WFile } from "../lib/workspace";

interface Props {
  file: WFile | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function FileViewModal({ file, onClose, onRefresh }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState(false);

  const open = !!file;

  const startEdit = () => {
    if (!file) return;
    setEditName(file.name);
    setEditContent(file.content);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!file) return;
    ws.updateFile(file.id, { name: editName.trim() || file.name, content: editContent });
    setEditing(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (!file) return;
    if (confirm(`"${file.name}"을 삭제할까요?`)) {
      ws.deleteFile(file.id);
      onRefresh();
      onClose();
    }
  };

  const handleCopy = () => {
    if (!file) return;
    navigator.clipboard.writeText(file.content).catch(() => {
      const el = document.createElement("textarea");
      el.value = file.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const typeColor: Record<string, string> = {
    summary: "#f59e0b",
    code: "#6366f1",
    anchor: "#8b5cf6",
    note: "#64748b",
    prompt: "#06b6d4",
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && file && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[299998]"
            style={{ background: "rgba(15,23,42,0.25)", backdropFilter: "blur(4px)" }}
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.25 }}
            className="fixed inset-0 flex items-center justify-center z-[299999] px-6"
            style={{ paddingRight: 72 }}
          >
            <div
              className="w-full max-w-lg overflow-hidden flex flex-col"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
                maxHeight: "80vh",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{
                    background: (typeColor[file.type] ?? "#64748b") + "1a",
                    color: typeColor[file.type] ?? "#64748b",
                  }}
                >
                  {file.type}
                </span>
                {editing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-slate-400"
                  />
                ) : (
                  <p className="flex-1 text-sm font-bold text-slate-800 truncate">
                    {file.name}
                  </p>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="복사"
                  >
                    {copied ? (
                      <Check style={{ width: 14, height: 14, color: "#16a34a" }} />
                    ) : (
                      <Copy style={{ width: 14, height: 14 }} />
                    )}
                  </button>
                  {editing ? (
                    <button
                      onClick={saveEdit}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                      title="저장"
                    >
                      <Save style={{ width: 14, height: 14 }} />
                    </button>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      title="편집"
                    >
                      <Edit3 style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: "#f8fafc" }}>
                {editing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full min-h-[200px] bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-mono leading-relaxed resize-none focus:outline-none focus:border-slate-400 transition-colors"
                    style={{ minHeight: 240 }}
                  />
                ) : (
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                    {file.content || (
                      <span className="text-slate-300 italic">내용 없음</span>
                    )}
                  </pre>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3 flex items-center justify-between flex-shrink-0"
                style={{ borderTop: "1px solid #f1f5f9" }}
              >
                <span className="text-[10px] text-slate-400">
                  {new Date(file.updatedAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {editing && (
                  <button
                    onClick={saveEdit}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: "#0f172a", color: "#fff" }}
                  >
                    저장
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
