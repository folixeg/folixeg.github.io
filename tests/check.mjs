// Run: node tests/check.mjs  — checks translations and the phone rule.
import { readFileSync, readdirSync } from "fs";
import { T } from "../assets/js/i18n.js?v=6"; import "../assets/js/i18n-extra.js?v=6";
const bad = [];
for (const f of ["index.html", "checkout.html", "order-success.html", "admin/index.html"])
  for (const m of readFileSync(new URL("../" + f, import.meta.url), "utf8").matchAll(/data-i18n(?:-ph)?="(\w+)"/g))
    if (!f.startsWith("admin") && !(m[1] in T.ar && m[1] in T.en)) bad.push(`${f}: missing key ${m[1]}`);
for (const f of readdirSync(new URL("../assets/js/", import.meta.url)))
  for (const m of readFileSync(new URL("../assets/js/" + f, import.meta.url), "utf8").matchAll(/\bt\("(\w+)"\)/g))
    if (!(m[1] in T.ar && m[1] in T.en)) bad.push(`${f}: t("${m[1]}") missing`);
for (const k in T.ar) if (!(k in T.en)) bad.push("EN missing " + k);
for (const k in T.en) if (!(k in T.ar)) bad.push("AR missing " + k);
const norm = p => p.replace(/[\s-]/g, "").replace(/^\+?2/, ""), ok = p => /^01[0125]\d{8}$/.test(norm(p));
for (const [p, e] of [["01012345678", 1], ["+201012345678", 1], ["010 1234 5678", 1], ["01312345678", 0], ["0101234567", 0], ["abc", 0]]) if (ok(p) !== !!e) bad.push("phone " + p);
console.log(bad.length ? bad.join("\n") : "All checks passed ✓"); process.exit(bad.length ? 1 : 0);
