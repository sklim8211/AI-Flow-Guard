import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, KeyRound, Check, ArrowRight, Sparkles } from "lucide-react";
import { CHECKOUT_URLS, setLicenseKey } from "../lib/license";

const OVERLAY_STYLE = {
  background: "rgba(15,23,42,0.55)",
  backdropFilter: "blur(4px)",
} as const;

const CARD_STYLE = {
  background: "#fff",
  boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
} as const;

function openCheckout(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ── PART 1 — Plan selection modal ───────────────────────── */
export function PlanModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200001] flex items-center justify-center p-4"
          style={OVERLAY_STYLE}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Sidecar Pro"
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={CARD_STYLE}
          >
            <div
              className="px-6 pt-6 pb-4 flex items-start gap-3"
              style={{ background: "linear-gradient(135deg,#fef3c7,#fff)" }}
            >
              <Crown style={{ width: 26, height: 26, color: "#b45309", flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1">
                <p className="text-base font-bold text-slate-800">Upgrade to Sidecar Pro</p>
                <p className="text-xs text-slate-500 mt-1">Unlimited saves. Keep every AI output as a file, forever.</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Monthly */}
              <div className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-slate-800">Sidecar Pro</p>
                  <p className="text-sm font-bold text-slate-800">$8 <span className="text-xs font-medium text-slate-400">/ month</span></p>
                </div>
                <button
                  onClick={() => openCheckout(CHECKOUT_URLS.monthly)}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-100"
                  style={{ background: "#0f172a", color: "#fff" }}
                >
                  Get started <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* Annual — recommended */}
              <div className="rounded-xl p-4 relative" style={{ background: "#fffbeb", border: "2px solid #fbbf24" }}>
                <span
                  className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: "#f59e0b", color: "#fff" }}
                >
                  Save 25%
                </span>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-slate-800">Sidecar Pro (Annual)</p>
                  <p className="text-sm font-bold text-slate-800">$72 <span className="text-xs font-medium text-slate-400">/ year</span></p>
                </div>
                <button
                  onClick={() => openCheckout(CHECKOUT_URLS.annual)}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-100"
                  style={{ background: "#b45309", color: "#fff" }}
                >
                  Get started <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 text-[10px] text-slate-400 text-center" style={{ borderTop: "1px solid #f1f5f9" }}>
              Checkout opens in a new tab. After purchase you'll get a license key to activate.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── PART 2 — License activation modal ───────────────────── */
export function ActivateModal({
  open,
  onClose,
  onActivated,
}: {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setKey("");
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleActivate = () => {
    if (!key.trim()) {
      setError("Please enter a valid license key.");
      return;
    }
    setLicenseKey(key);
    setError(null);
    setSuccess(true);
    setTimeout(() => onActivated(), 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200001] flex items-center justify-center p-4"
          style={OVERLAY_STYLE}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Activate your license"
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={CARD_STYLE}
          >
            <div
              className="px-6 pt-6 pb-4 flex items-start gap-3"
              style={{ background: "linear-gradient(135deg,#e0f2fe,#fff)" }}
            >
              <KeyRound style={{ width: 24, height: 24, color: "#0369a1", flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1">
                <p className="text-base font-bold text-slate-800">Activate your license</p>
                <p className="text-xs text-slate-500 mt-1">Enter the license key you received after purchase.</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="px-6 py-5">
              {success ? (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}
                >
                  <Check style={{ width: 16, height: 16 }} />
                  Pro activated. Unlimited saves unlocked.
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => { setKey(e.target.value); if (error) setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleActivate(); }}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    autoFocus
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none transition-colors font-mono tracking-wider"
                    style={{ borderColor: error ? "#fca5a5" : "#e2e8f0" }}
                  />
                  {error && (
                    <p className="mt-2 text-[12px] font-medium" style={{ color: "#dc2626" }}>{error}</p>
                  )}
                  <button
                    onClick={handleActivate}
                    className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-100"
                    style={{ background: "#0f172a", color: "#fff" }}
                  >
                    <KeyRound style={{ width: 14, height: 14 }} /> Activate
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── PART 4 — Free plan file limit modal ─────────────────── */
export function LimitModal({
  open,
  onClose,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
          style={OVERLAY_STYLE}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Free plan limit reached"
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={CARD_STYLE}
          >
            <div
              className="px-6 pt-6 pb-4 flex items-start gap-3"
              style={{ background: "linear-gradient(135deg,#fef3c7,#fff)" }}
            >
              <Sparkles style={{ width: 24, height: 24, color: "#b45309", flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1">
                <p className="text-base font-bold text-slate-800">You've reached the free plan limit</p>
                <p className="text-xs text-slate-500 mt-1">You've saved 50 files. Upgrade to Pro for unlimited saves.</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-2">
              <button
                onClick={onUpgrade}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-100"
                style={{ background: "#b45309", color: "#fff" }}
              >
                Upgrade to Pro <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#f1f5f9", color: "#64748b" }}
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
