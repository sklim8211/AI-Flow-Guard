import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

// Auto-update the service worker. With registerType "autoUpdate", a new build
// activates and the page reloads automatically — no manual cache clearing.
// We also poll for updates so long-open tabs / installed PWAs pick up new
// builds without needing a full navigation.
const UPDATE_CHECK_INTERVAL = 60 * 1000;
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => {
      registration.update().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    const interval = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkForUpdate);
    // Avoid duplicate intervals/listeners across HMR reloads in development.
    import.meta.hot?.dispose(() => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkForUpdate);
    });
  },
});

createRoot(document.getElementById("root")!).render(<App />);
