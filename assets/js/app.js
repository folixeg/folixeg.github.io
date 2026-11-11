import { getLang, setLang, t } from "./i18n.js?v=4";
import "./i18n-extra.js?v=4";
import { cartCount } from "./cart.js?v=4";
import "./store.js?v=4";

setLang(getLang());
document.getElementById("lang").addEventListener("click", () => setLang(getLang() === "ar" ? "en" : "ar"));

/* Hero: fibres pour from the sachet onto the X, once on load. Respects reduced motion. */
(function pour() {
  const img = document.getElementById("logo");
  const cv = document.getElementById("fibres");
  if (!img || !cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d");
  let w, h, ps = [], t0;

  const size = () => {
    const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    w = cv.width = r.width * dpr; h = cv.height = r.height * dpr;
  };
  // Sachet mouth position as a fraction of the cropped logo image.
  const spawn = () => ({
    x: w * (0.924 + Math.random() * .006), y: h * 0.210,
    vx: -w * (.0004 + Math.random() * .0008), vy: h * (.002 + Math.random() * .002),
    life: 0, max: 50 + Math.random() * 40, r: (.6 + Math.random() * 1.1) * (devicePixelRatio || 1)
  });
  const frame = t => {
    t0 ??= t;
    const el = t - t0;
    ctx.clearRect(0, 0, w, h);
    if (el < 2600) for (let i = 0; i < 5; i++) ps.push(spawn());
    ps = ps.filter(p => p.life++ < p.max);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += h * .00008;
      ctx.fillStyle = `rgba(20,16,12,${1 - p.life / p.max})`;
      ctx.fillRect(p.x, p.y, p.r, p.r * 2.2);
    }
    if (el < 2600 || ps.length) requestAnimationFrame(frame);
  };
  const go = () => { size(); requestAnimationFrame(frame); };
  img.complete ? go() : img.addEventListener("load", go);
  addEventListener("resize", size);
})();

const badge = () => { const e = document.getElementById("cart-count"), n = cartCount(); e.textContent = n; e.dataset.n = n; };
const cartLabel = () => document.getElementById("cart-link").setAttribute("aria-label", t("cart"));
cartLabel(); addEventListener("langchange", cartLabel);
badge(); addEventListener("cartchange", badge);

/* Gentle fade-up as sections scroll into view (skipped for reduced motion). */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll(".sec .wrap").forEach(el => { el.classList.add("rv"); io.observe(el); });
}

/* Little touches: header shadow on scroll, cart pill bumps when something is added. */
const hd = document.querySelector(".hdr");
addEventListener("scroll", () => hd.classList.toggle("sc", scrollY > 8), { passive: true });
addEventListener("cartchange", () => { const e = document.getElementById("cart-link"); e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); });
