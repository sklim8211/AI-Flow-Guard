import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit3, Save, Copy, Check, Trash2 } from "lucide-react";
import { ws, type WFile } from "../lib/workspace";
import { markActivity } from "./SaveReminderToast";

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
  const [wrappedCopy, setWrappedCopy] = useState(false);

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
    markActivity();
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

  // Folder-aware copy wrappers.
  // The standard prompts produce well-formed handoff documents (Resume/Next/Anchors).
  // But when a user pastes such a document into a fresh AI message without a follow-up
  // instruction, the AI tends to acknowledge ("got it, looks great") instead of acting.
  // We append a short, intent-specific instruction at copy time so the document becomes
  // an actionable prompt. The DRAFTS wrapper is the inverse case: prevent the AI from
  // over-interpreting saved reference material.
  type Wrapper = { prefix?: string; suffix?: string; hint: string; confirm: string };
  const WRAPPERS: Record<string, Wrapper> = {
    DRAFTS: {
      prefix:
        "[참고 자료 — 읽기만 해주세요]\n" +
        "아래는 제가 나중에 다시 보려고 저장해둔 이전 AI 응답입니다.\n" +
        "지금은 요약·해석·평가·이어쓰기를 하지 마시고, 조용히 읽고 대기만 해주세요.\n" +
        "다음 메시지에서 제가 무엇을 할지 알려드릴게요.\n\n" +
        "---\n",
      suffix: "\n---\n(여기까지 참고 자료입니다. 다음 지시를 기다려주세요.)",
      hint: "📎 복사 시 AI가 장황하게 해석하지 않도록 '참고 자료' 안내 문구가 앞뒤에 자동으로 붙습니다.",
      confirm: "✓ '참고용으로 읽기만 해줘' 안내와 함께 복사됨. AI에 붙여넣고 다음 지시를 보내세요.",
    },
    NEXT: {
      suffix:
        "\n\n---\n" +
        "위 계획대로 IMMEDIATE 항목부터 실제 작업을 시작해줘. " +
        "막혀있는 BLOCKERS가 있으면 먼저 그것부터 같이 풀자.",
      hint: "📎 복사 시 'IMMEDIATE 부터 시작해줘' 명령이 자동으로 뒤에 붙어요. AI에 붙여넣으면 바로 작업이 시작됩니다.",
      confirm: "✓ '작업 시작 명령'과 함께 복사됨. AI에 그대로 붙여넣으면 즉시 작업이 시작됩니다.",
    },
    CURRENT: {
      suffix:
        "\n\n---\n" +
        "위 내용은 내가 직전 작업을 어디까지 했는지 정리한 컨텍스트야. " +
        "지금 이 시점에서 자연스럽게 이어 작업할 수 있도록 도와줘. " +
        "내가 빠뜨린 게 보이면 짚어주고, 다음 단계 한 가지만 추천해줘.",
      hint: "📎 복사 시 '이어서 작업해줘' 안내가 자동으로 뒤에 붙어요.",
      confirm: "✓ '이어서 작업' 안내와 함께 복사됨.",
    },
    ANCHORS: {
      suffix:
        "\n\n---\n" +
        "위 결정들은 이 프로젝트에서 이미 합의된 안전선이야. " +
        "앞으로 작업할 때 이 기준에서 벗어나는 제안을 하기 전엔 반드시 먼저 알려줘.",
      hint: "📎 복사 시 '이 결정 기준으로 작업해줘' 안내가 자동으로 뒤에 붙어요.",
      confirm: "✓ '결정 기준' 안내와 함께 복사됨.",
    },
  };

  const folderName = file ? ws.getFolderPath(file.folderId)[0]?.toUpperCase() : undefined;
  const wrapper = folderName ? WRAPPERS[folderName] : undefined;
  const isDraft = folderName === "DRAFTS";

  const handleCopy = () => {
    if (!file) return;
    const text = wrapper
      ? (wrapper.prefix ?? "") + file.content + (wrapper.suffix ?? "")
      : file.content;
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setWrappedCopy(!!wrapper);
    setTimeout(() => { setCopied(false); setWrappedCopy(false); }, 2200);
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
                    title={wrapper ? `복사 (AI 명령 자동 추가: ${folderName})` : "복사"}
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

              {/* Wrapper hint or copy confirmation */}
              {wrapper && (
                <div
                  className="px-5 py-2 flex items-center gap-2 flex-shrink-0"
                  style={{
                    background: wrappedCopy ? "#ecfdf5" : isDraft ? "#fef3c7" : "#eff6ff",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <span
                    className="text-[10px] font-semibold leading-snug"
                    style={{ color: wrappedCopy ? "#047857" : isDraft ? "#92400e" : "#1d4ed8" }}
                  >
                    {wrappedCopy ? wrapper.confirm : wrapper.hint}
                  </span>
                </div>
              )}

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
