/* Anonymous visit counter: a random id lives in the visitor's browser. No names, no IP, no personal data. */
import { supabase, isConfigured } from "../../config/supabase.js?v=6";

const KEY = "folix_vid";
const isAdminBrowser = () => { try { return Object.keys(localStorage).some(k => k.startsWith("sb-") && k.endsWith("-auth-token")); } catch { return false; } };
const vid = () => { try { let v = localStorage.getItem(KEY); if (!v) { v = crypto.randomUUID(); localStorage.setItem(KEY, v); } return v; } catch { return null; } };
const device = matchMedia("(max-width: 800px)").matches ? "mobile" : "desktop";
const source = (() => {
  try {
    const u = new URLSearchParams(location.search).get("utm_source"); if (u) return u.toLowerCase();
    if (document.referrer) { const h = new URL(document.referrer).hostname.replace(/^www\./, ""); if (h !== location.hostname) return h; }
  } catch {}
  return "direct";
})();

function ping() {
  if (!isConfigured || document.hidden || isAdminBrowser()) return;   // your own visits (logged-in admin) are not counted
  const v = vid(); if (!v) return;
  supabase.rpc("track_visit", { p_visitor: v, p_path: location.pathname.split("/").pop() || "index.html", p_device: device, p_source: source }).then(() => {}, () => {});
}
ping();
setInterval(ping, 45000);   // heartbeat keeps "online now" accurate
document.addEventListener("visibilitychange", () => { if (!document.hidden) ping(); });
