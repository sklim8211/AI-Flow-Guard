import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Save } from "lucide-react";

interface Props {
  /** Milliseconds since last save/copy activity. */
  intervalMs?: number;
  /** Check frequency in ms. */
  checkEveryMs?: number;
  /** Returns true if a modal/overlay is open and we should suppress. */
  suppressed: boolean;
  onSaveClick: () => void;
}

const ACTIVITY_KEY = "qq_last_activity_at";
const SNOOZE_KEY = "qq_reminder_snooze_until";

export function markActivity() {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function SaveReminderToast({
  intervalMs = 60 * 60 * 1000, // 1 hour
  checkEveryMs = 60 * 1000, // 1 min
  suppressed,
  onSaveClick,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      if (suppressed) return;
      if (visible) return;
      const last = Number(localStorage.getItem(ACTIVITY_KEY) || "0");
      const snooze = Number(localStorage.getItem(SNOOZE_KEY) || "0");
      const now = Date.now();
      if (now < snooze) return;
      if (last === 0) {
        // initialize to now so we don't fire on first load
        markActivity();
        return;
      }
      if (now - last >= intervalMs) {
        setVisible(true);
      }
    };
    // initial check after a short delay so other init completes
    const t0 = setTimeout(check, 5000);
    const id = setInterval(check, checkEveryMs);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [intervalMs, checkEveryMs, suppressed, visible]);

  const dismiss = () => {
    setVisible(false);
    // small reset so next nudge is intervalMs from now
    markActivity();
  };

  const snooze = () => {
    setVisible(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + intervalMs));
  };

  const save = () => {
    setVisible(false);
    markActivity();
    onSaveClick();
  };

  return (
    <AnimatePresence>
      {visible && !suppressed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-[10000] max-w-sm mx-auto"
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: 14,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#eef2ff", color: "#6366f1" }}
            >
              <Bell style={{ width: 16, height: 16 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 mb-0.5">잠깐 정리하시겠어요?</p>
              <p className="text-[11px] text-slate-500">한 시간 정도 저장이 없어요.</p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={save}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{ background: "#0f172a", color: "#fff" }}
                >
                  <Save style={{ width: 11, height: 11 }} />
                  지금 저장
                </button>
                <button
                  onClick={snooze}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  1시간 뒤
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-300 hover:text-slate-600 transition-colors shrink-0"
              aria-label="닫기"
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
