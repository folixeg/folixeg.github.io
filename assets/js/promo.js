/* Friday countdown. Fridays: live countdown to the end of the day (Cairo time). Other days: days until Friday.
   Shown only when the owner switches it on in Settings. */
import { t } from "./i18n.js?v=4";
import { h } from "./cart.js?v=4";

let timer, cfg;
const cairo = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
const p2 = v => String(v).padStart(2, "0");
const unit = (v, k) => h("span", { className: "u" }, h("b", { textContent: p2(v) }), h("small", { textContent: t(k) }));

function tick() {
  const box = document.getElementById("promo"), n = cairo(), sinceMidnight = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  const theme = cfg.friday_theme === "white" ? "white" : "black", fri = n.getDay() === 5;
  const days = (5 - n.getDay() + 7) % 7;
  const left = fri ? 86400 - sinceMidnight : days * 86400 - sinceMidnight;
  const parts = [];
  if (!fri) parts.push(unit(Math.floor(left / 86400), "d"));
  parts.push(unit(Math.floor(left % 86400 / 3600), "hh"), unit(Math.floor(left % 3600 / 60), "mm"), unit(left % 60, "ss"));
  box.replaceChildren(h("b", { className: "t", textContent: cfg.friday_text || t(theme === "white" ? "promo_white" : "promo_black") }),
    h("span", { textContent: t(fri ? "promo_ends" : "promo_in") }), h("span", { className: "us" }, ...parts));
}

export function initPromo(S) {
  const box = document.getElementById("promo"); clearInterval(timer);
  if (!box) return;
  if (!S?.friday_promo) { box.hidden = true; return; }
  cfg = S; box.className = "promo " + (S.friday_theme === "white" ? "white" : "black"); box.hidden = false;
  tick(); timer = setInterval(tick, 1000);
}
addEventListener("langchange", () => cfg && tick());
