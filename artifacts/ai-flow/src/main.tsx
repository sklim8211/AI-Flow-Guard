import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Build marker — bump this string before each republish to verify a deploy
// actually shipped. If you see this exact string in the browser console after
// a republish + reload, the new bundle is live.
const BUILD_MARKER = "QQ-BUILD redeploy-test-A 2026-05-26";
// eslint-disable-next-line no-console
console.log(`[${BUILD_MARKER}]`);

createRoot(document.getElementById("root")!).render(<App />);
