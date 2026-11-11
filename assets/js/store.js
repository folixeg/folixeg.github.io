/* Storefront: everything (price, stock, images, contact) comes from Supabase. DB text is inserted as text, never HTML. */
import { supabase, isConfigured, SUPABASE_URL } from "../../config/supabase.js?v=4";
import { t } from "./i18n.js?v=4";
import { addToCart, money, h } from "./cart.js?v=4";
import { initPromo } from "./promo.js?v=4";

/* WhatsApp: accepts 01xxxxxxxxx or 201xxxxxxxxx. The number saved in store_settings overrides the fallback below. */
const waLink = raw => { let n = (raw || "").replace(/\D/g, ""); if (n.startsWith("0")) n = "20" + n.slice(1); return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent("مرحبًا، عندي سؤال عن المنتج") : "#"; };
const setWa = raw => document.querySelectorAll(".js-wa").forEach(a => { a.href = waLink(raw); a.target = "_blank"; a.rel = "noopener"; });
setWa("01275971995");   // fallback until Supabase settings load

const info = document.getElementById("pinfo"), stage = document.getElementById("stage");
let S, P, V = [], IMG = [], cur = 0, qty = 1;

const say = k => { stage.removeAttribute("aria-busy"); stage.replaceChildren(h("p", { textContent: t(k) })); info.replaceChildren(); };

function pickImage(v) {
  const mine = IMG.filter(i => i.variant_id === v.id);
  return mine.find(i => i.is_primary) || mine[0] || IMG.find(i => !i.variant_id && i.is_primary) || IMG.find(i => !i.variant_id) || null;
}

function shipLine() {   // shipping text straight from store_settings (what you set in the dashboard)
  const f = Number(S?.shipping_fee || 0), th = Number(S?.free_shipping_threshold || 0);
  return f > 0 ? `${t("ship_fee")}: ${money(f, S?.currency)}` + (th > 0 ? ` · ${t("free_over")} ${money(th, S?.currency)}` : "") : t("ship_free");
}

function render() {
  if (!P) return;
  const v = V[cur], max = 20; qty = Math.min(Math.max(qty, 1), max);
  const im = pickImage(v);
  stage.removeAttribute("aria-busy");
  stage.replaceChildren(im ? h("img", { src: im.image_url, alt: `${P.name} – ${v.color_name}`, loading: "lazy" }) : h("p", { textContent: P.name }));

  const opts = h("div", { className: "opts", role: "group", ariaLabel: t("color") });
  V.forEach((x, i) => {
    const b = h("button", { className: "opt", type: "button", onclick: () => { cur = i; render(); } }, h("i", { className: "sw" }), x.color_name);
    b.firstChild.style.background = x.color_code; b.setAttribute("aria-pressed", i === cur); opts.append(b);
  });
  const price = h("p", { className: "price" }, h("b", { textContent: money(P.price, S?.currency) }));
  if (P.old_price) price.append(h("s", { textContent: money(P.old_price, S?.currency) }));

  const dec = h("button", { type: "button", textContent: "−", ariaLabel: "−", onclick: () => { qty--; render(); } });
  const inc = h("button", { type: "button", textContent: "+", ariaLabel: "+", onclick: () => { qty++; render(); } });
  dec.disabled = qty <= 1; inc.disabled = qty >= max;
  const stepper = h("div", { className: "qty" }, dec, h("output", { textContent: qty }), inc);

  const add = h("button", { className: "btn ghost", type: "button", textContent: t("add"), onclick: () => { addToCart(v.id, qty, 20); add.textContent = t("added"); } });
  const now = h("a", { className: "btn", textContent: t("order_now"), href: "checkout.html", onclick: () => addToCart(v.id, qty, 20) });
  const sold = !v.in_stock;
  if (sold) { add.disabled = true; now.setAttribute("aria-disabled", "true"); now.removeAttribute("href"); }

  info.replaceChildren(
    h("h2", { textContent: P.name }), price,
    h("p", { className: "lead", textContent: P.description || "" }),
    opts,
    h("p", { className: sold ? "" : "ok", textContent: sold ? t("out") : t("in_stock") }),
    h("div", { className: "opts" }, stepper),
    h("p", { className: "eta", textContent: t("eta") }),
    ...(S ? [h("p", { className: "eta", textContent: shipLine() })] : []),
    h("div", { className: "cta", style: "justify-content:flex-start" }, now, add),
    h("ul", { className: "pills" }, h("li", { textContent: t("t1") })));
}

async function init() {
  if (!isConfigured) { say("not_configured"); stage.append(h("small", { textContent: SUPABASE_URL })); return; }
  try {
    const [st, pr] = await Promise.all([
      supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("products").select("*").eq("is_active", true).order("created_at").limit(1).maybeSingle()]);
    S = st.data; P = pr.data; initPromo(S);
    if (S?.announcement_text) document.querySelector(".bar").textContent = S.announcement_text;
    if (S?.whatsapp_number) setWa(S.whatsapp_number);
    const gal = await supabase.from("product_images").select("*").in("image_type", ["before_after", "gallery"]).order("display_order");
    const root = document.querySelector("[data-gallery-root]");
    if (gal.data?.length) { root.className = "gal"; root.removeAttribute("data-i18n"); root.replaceChildren(...gal.data.map(g => h("img", { src: g.image_url, alt: "", loading: "lazy" }))); }
    const rv = await supabase.from("reviews").select("*").eq("is_published", true).order("display_order").order("created_at", { ascending: false });
    const rr = document.querySelector("[data-reviews-root]");
    if (rv.data?.length) { rr.className = "revs"; rr.removeAttribute("data-i18n");
      rr.replaceChildren(...rv.data.map(r => h("figure", { className: "rev" }, h("div", { className: "stars", textContent: "★".repeat(r.rating) + "☆".repeat(5 - r.rating) }), h("blockquote", { textContent: r.comment }), h("figcaption", { textContent: r.customer_name })))); }
    if (!P) return say("unavail");
    const [vr, ir] = await Promise.all([
      supabase.from("product_variants").select("id,product_id,color_name,color_code,in_stock").eq("product_id", P.id).eq("is_active", true).order("color_name"),
      supabase.from("product_images").select("*").eq("product_id", P.id).in("image_type", ["product", "thumbnail"]).order("display_order")]);
    V = vr.data || []; IMG = ir.data || [];
    if (!V.length) return say("unavail");
    render();
    const ld = document.createElement("script"); ld.type = "application/ld+json";   // structured data for Google
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: P.name, description: P.description, image: IMG.map(i => i.image_url),
      offers: { "@type": "Offer", seller: { "@type": "Organization", name: S?.store_name || "FOLIX" }, priceCurrency: S?.currency || "EGP", price: P.price, availability: V.some(v => v.in_stock) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } });
    document.head.append(ld);
  } catch (e) { console.error(e); say("load_err"); }
}
addEventListener("langchange", render);
init();
