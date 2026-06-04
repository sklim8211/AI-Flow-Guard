import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";

interface Props {
  /** Milliseconds since last save/copy activity. */
  intervalMs?: number;
  /** Check frequency in ms. */
  checkEveryMs?: number;
  /** Returns true if a modal/overlay is open and we should suppress. */
  suppressed: boolean;
}

const ACTIVITY_KEY = "qq_last_activity_at";

export function markActivity() {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function SaveReminderToast({
  intervalMs = 60 * 60 * 1000, // 1 hour
  checkEveryMs = 60 * 1000, // 1 min
  suppressed,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      if (suppressed) return;
      if (visible) return;
      const last = Number(localStorage.getItem(ACTIVITY_KEY) || "0");
      const now = Date.now();
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

  // Closing the toast resets the activity clock so the next nudge fires intervalMs from now.
  // No "snooze" or "save now" actions — the toast is purely informational; what to do is the user's call.
  const dismiss = () => {
    setVisible(false);
    markActivity();
  };

  // Auto-dismiss after 8s. dismiss() resets the activity clock, so the next
  // nudge fires intervalMs (1 hour) from now — same as a manual close.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(t);
  }, [visible]);

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
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#eef2ff", color: "#6366f1" }}
            >
              <Bell style={{ width: 16, height: 16 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800">Nothing saved in the last hour.</p>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-300 hover:text-slate-600 transition-colors shrink-0"
              aria-label="Close"
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
