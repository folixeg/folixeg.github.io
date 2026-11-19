import { supabase, isConfigured } from "../../config/supabase.js?v=6";
import { getLang, setLang, t } from "./i18n.js?v=6";
import "./i18n-extra.js?v=6";
import { getCart, saveCart, money, h } from "./cart.js?v=6";
import "./track.js?v=6";

const GOV = ["القاهرة","الجيزة","الإسكندرية","الدقهلية","البحر الأحمر","البحيرة","الفيوم","الغربية","الإسماعيلية","المنوفية","المنيا","القليوبية","الوادي الجديد","السويس","أسوان","أسيوط","بني سويف","بورسعيد","دمياط","الشرقية","جنوب سيناء","كفر الشيخ","مطروح","الأقصر","قنا","شمال سيناء","سوهاج"];
const $ = id => document.getElementById(id);
let S = null, lines = [];

setLang(getLang());
$("lang").onclick = () => setLang(getLang() === "ar" ? "en" : "ar");
const fillGov = () => { const v = $("gov").value; $("gov").replaceChildren(h("option", { value: "", textContent: t("choose") }), ...GOV.map(g => h("option", { value: g, textContent: g }))); $("gov").value = v; };

const persist = () => saveCart(lines.map(l => ({ variant_id: l.v.id, quantity: l.qty })));

function render() {
  const box = $("summary");
  if (!lines.length) { box.replaceChildren(h("p", { textContent: t("cart_empty") }), h("a", { className: "btn", href: "index.html", textContent: t("back_shop") })); $("go").disabled = true; return; }
  $("go").disabled = false;
  const cur = S?.currency || "EGP";
  const sub = lines.reduce((n, l) => n + l.v.products.price * l.qty, 0);
  const th = Number(S?.free_shipping_threshold || 0), ship = th > 0 && sub >= th ? 0 : Number(S?.shipping_fee || 0);   // threshold 0/empty = no free shipping
  const row = (k, v, c = "row") => h("div", { className: c }, h("span", { textContent: t(k) }), h("span", { textContent: v }));
  box.replaceChildren(
    ...lines.map((l, i) => {
      const dec = h("button", { type: "button", textContent: "−", ariaLabel: "−", disabled: l.qty <= 1, onclick: () => { l.qty--; persist(); render(); } });
      const inc = h("button", { type: "button", textContent: "+", ariaLabel: "+", disabled: l.qty >= 20, onclick: () => { l.qty++; persist(); render(); } });
      return h("div", { className: "line" },
        h("div", {}, h("b", { textContent: l.v.products.name }), h("br"), h("span", { textContent: `${t("color")}: ${l.v.color_name} · ${money(l.v.products.price, cur)}` })),
        h("div", { className: "qty" }, dec, h("output", { textContent: l.qty }), inc),
        h("button", { className: "rm", type: "button", textContent: t("remove"), onclick: () => { lines.splice(i, 1); persist(); render(); } }));
    }),
    row("subtotal", money(sub, cur)), row("shipping", ship ? money(ship, cur) : t("free")), row("total", money(sub + ship, cur), "row tot"), h("p", { className: "eta", textContent: t("eta") }));
}

async function load() {
  fillGov();
  if (!isConfigured) return render();
  const cart = getCart();
  if (cart.length) {
    const [st, vr] = await Promise.all([
      supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("product_variants").select("id,color_name,in_stock,products(id,name,price)").in("id", cart.map(c => c.variant_id)).eq("is_active", true)]);
    S = st.data;
    lines = cart.map(c => ({ v: vr.data?.find(x => x.id === c.variant_id), qty: c.quantity }))
      .filter(l => l.v && l.v.products && l.v.in_stock)
      .map(l => ({ ...l, qty: Math.min(l.qty, 20) }));
    persist();
  }
  render();
}

const PHONE = /^01[0125]\d{8}$/;
$("f").addEventListener("submit", async e => {
  e.preventDefault();
  $("form-err").hidden = true;
  const v = { name: $("name").value.trim(), phone: $("phone").value.replace(/[\s-]/g, "").replace(/^\+?2/, ""), gov: $("gov").value, city: $("city").value.trim(), addr: $("addr").value.trim() };
  const bad = { name: v.name.length < 2, phone: !PHONE.test(v.phone), gov: !v.gov, city: v.city.length < 2, addr: v.addr.length < 5 };
  for (const k in bad) $("e-" + k).textContent = bad[k] ? t("e_" + k) : "";
  const first = Object.keys(bad).find(k => bad[k]);
  if (first) return $(first).focus();
  if (!lines.length) return;

  const btn = $("go"); btn.disabled = true; btn.textContent = t("placing");
  // One key per attempt: resubmitting (double tap, refresh, retry) can never create a second order.
  const key = sessionStorage.getItem("folix_key") || crypto.randomUUID();
  sessionStorage.setItem("folix_key", key);
  const { data, error } = await supabase.rpc("place_order", {
    p_name: v.name, p_phone: v.phone, p_governorate: v.gov, p_city: v.city, p_address: v.addr,
    p_notes: $("notes").value.trim() || null,
    p_items: lines.map(l => ({ variant_id: l.v.id, quantity: l.qty })), p_idempotency_key: key });
  if (error) {
    const code = (error.message.match(/^(\w+)/) || [])[1];
    const msg = t("err_" + code); $("form-err").textContent = msg === "err_" + code ? t("err_generic") : msg; $("form-err").hidden = false;
    if (code === "out_of_stock" || code === "product_unavailable") { sessionStorage.removeItem("folix_key"); await load(); }
    btn.disabled = false; btn.textContent = t("place"); return;
  }
  // Meta Pixel: remember the order value so order-success.html can report the Purchase event.
  try {
    const sub = lines.reduce((n, l) => n + l.v.products.price * l.qty, 0);
    const th = Number(S?.free_shipping_threshold || 0), ship = th > 0 && sub >= th ? 0 : Number(S?.shipping_fee || 0);
    sessionStorage.setItem("folix_purchase", JSON.stringify({ id: data.order_number, value: sub + ship, currency: S?.currency || "EGP", ids: lines.map(l => l.v.products.id), num: lines.reduce((n, l) => n + l.qty, 0) }));
  } catch {}
  saveCart([]); sessionStorage.removeItem("folix_key");
  // The secret goes in the URL fragment (never sent to servers) and is kept in this browser so the customer can cancel later.
  try { localStorage.setItem("folix_last_order", JSON.stringify({ o: data.order_number, k: data.cancel_token })); } catch {}
  location.href = "order-success.html?o=" + encodeURIComponent(data.order_number) + (data.cancel_token ? "#k=" + data.cancel_token : "");
});
addEventListener("langchange", () => { fillGov(); render(); });
load();
