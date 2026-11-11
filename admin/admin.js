import { supabase, MEDIA_BUCKET } from "../config/supabase.js?v=4";
import { h, money } from "../assets/js/cart.js?v=4";

/* ---------- auth guard (authorization = is_admin() in the DB; RLS enforces it again on every query) ---------- */
const { data: { session } } = await supabase.auth.getSession();
if (!session) location.replace("login.html");
else if (!(await supabase.rpc("is_admin")).data) { await supabase.auth.signOut(); location.replace("login.html?denied=1"); }

/* ---------- i18n (English falls back to the column/status name) ---------- */
const D = {
  ar: { overview: "نظرة عامة", products: "المنتجات والمخزون", orders: "الطلبات", images: "الصور", reviews: "آراء العملاء", new_review: "رأي جديد", comment: "التعليق", rating: "التقييم (1-5)", display_order: "الترتيب", settings: "الإعدادات", logout: "خروج", save: "حفظ", add: "إضافة", new_product: "منتج جديد", new_variant: "لون جديد", search: "بحث بالاسم أو الموبايل", all: "الكل", saved: "تم الحفظ ✓", total_orders: "إجمالي الطلبات", pending: "معلّق", confirmed: "مؤكد", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي", revenue: "الإيرادات (المُسلَّمة)", products_n: "المنتجات", low: "مخزون منخفض", new_order: "طلب جديد", order_cancelled: "العميل ألغى الطلب", name: "الاسم", slug: "الرابط", description: "الوصف", price: "السعر", old_price: "السعر القديم", is_active: "مفعّل", color_name: "اللون", color_code: "كود اللون", stock_quantity: "المخزون", type: "النوع", upload: "رفع", primary: "رئيسية", replace: "استبدال", del: "حذف", drag: "اسحب لإعادة الترتيب", items: "المنتجات", history: "السجل", status: "الحالة", date: "من تاريخ", customer_name: "العميل", phone: "الموبايل", total: "الإجمالي", empty: "لا توجد بيانات", none: "بدون", cancelled_is_final: "الطلب الملغي نهائي ولا يمكن تغييره.", store_name: "اسم المتجر", logo_url: "رابط اللوجو", currency: "العملة", shipping_fee: "رسوم الشحن", free_shipping_threshold: "حد الشحن المجاني (اتركه فاضي لو مفيش)", whatsapp_number: "واتساب (بدون +)", contact_email: "البريد", announcement_text: "نص الإعلان", social_links: "روابط التواصل (JSON)", is_store_open: "المتجر مفتوح", low_stock_threshold: "حد المخزون المنخفض", friday_promo: "تفعيل عدّاد الجمعة", friday_theme: "شكل العدّاد (black أو white)", friday_text: "عنوان العرض (اختياري)", address: "العنوان", notes: "ملاحظات", created_at: "التاريخ" },
  en: { overview: "Overview", products: "Products & stock", orders: "Orders", images: "Images", reviews: "Reviews", new_review: "New review", settings: "Settings", logout: "Log out", save: "Save", add: "Add", new_product: "New product", new_variant: "New color", search: "Search name or phone", all: "All", saved: "Saved ✓", total_orders: "Total orders", revenue: "Revenue (delivered)", products_n: "Products", low: "Low stock", new_order: "New order", order_cancelled: "Customer cancelled order", upload: "Upload", primary: "Primary", replace: "Replace", del: "Delete", drag: "Drag to reorder", empty: "No data", none: "None", date: "From date", cancelled_is_final: "Cancelled orders are final." }
};
let L = localStorage.getItem("folix_admin_lang") || "ar";
const t = k => D[L][k] ?? k.replace(/_/g, " ");
const STAT = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const $ = id => document.getElementById(id);
const toast = m => { const e = $("toast"); e.textContent = m; e.style.display = "block"; setTimeout(() => e.style.display = "none", 6000); };
const tbl = (head, rows) => h("table", { className: "tb" }, h("thead", {}, h("tr", {}, ...head.map(x => h("th", { textContent: x })))), h("tbody", {}, ...rows));
const td = x => h("td", { textContent: x ?? "" });
const card = (l, v) => h("div", { className: "card" }, h("small", { textContent: l }), h("b", { textContent: v }));

/* Generic row editor: cols = [[column, type]] types: text|area|num|bool|color|json */
function editor(table, row, cols, after) {
  const inp = {}, box = h("div", { className: "ed" });
  for (const [k, ty] of cols) {
    const el = (ty === "area" || ty === "json") ? h("textarea") : h("input", { type: ty === "bool" ? "checkbox" : ty === "num" ? "number" : ty === "color" ? "color" : "text", step: "any" });
    const v = row[k];
    if (ty === "bool") el.checked = !!v; else el.value = ty === "json" ? JSON.stringify(v ?? {}) : (v ?? "");
    inp[k] = [el, ty]; box.append(h("label", {}, t(k), el));
  }
  const msg = h("span");
  box.append(h("button", { className: "btn", textContent: t("save"), onclick: async () => {
    const o = {};
    try { for (const k in inp) { const [el, ty] = inp[k]; o[k] = ty === "bool" ? el.checked : ty === "num" ? (el.value === "" ? null : Number(el.value)) : ty === "json" ? JSON.parse(el.value || "{}") : (el.value.trim() || null); } }
    catch { msg.textContent = "JSON ✗"; return; }
    const { error } = row.id != null ? await supabase.from(table).update(o).eq("id", row.id) : await supabase.from(table).insert({ ...o, ...(row._extra || {}) });
    msg.textContent = error ? error.message : t("saved"); if (!error && after) after();
  } }), msg);
  if (table === "reviews" && row.id) box.append(h("button", { className: "btn", style: "background:#b3261e", textContent: t("del"), onclick: async () => { if (!confirm("?")) return; await supabase.from("reviews").delete().eq("id", row.id); go(); } }));
  return box;
}

/* ---------- Overview ---------- */
async function vOverview() {
  const [o, v, p, s] = await Promise.all([
    supabase.from("orders").select("order_status,total"), supabase.from("product_variants").select("color_name,stock_quantity,is_active"),
    supabase.from("products").select("id", { count: "exact", head: true }), supabase.from("store_settings").select("*").eq("id", 1).maybeSingle()]);
  const os = o.data || [], c = x => os.filter(i => i.order_status === x).length, th = s.data?.low_stock_threshold ?? 5;
  const rev = os.filter(i => i.order_status === "delivered").reduce((n, i) => n + Number(i.total), 0);
  const low = (v.data || []).filter(x => x.is_active && x.stock_quantity <= th);
  return h("div", {}, h("div", { className: "cards" }, card(t("total_orders"), os.length), card(t("pending"), c("pending")), card(t("delivered"), c("delivered")), card(t("cancelled"), c("cancelled")),
    card(t("revenue"), money(rev, s.data?.currency)), card(t("products_n"), p.count ?? 0)),
    h("h3", { textContent: t("low") }), low.length ? tbl([t("color_name"), t("stock_quantity")], low.map(x => h("tr", {}, td(x.color_name), td(x.stock_quantity)))) : h("p", { textContent: "—" }));
}

/* ---------- Products + inventory (stock is edited per color) ---------- */
const PC = [["name", "text"], ["slug", "text"], ["description", "area"], ["price", "num"], ["old_price", "num"], ["is_active", "bool"]];
const VC = [["color_name", "text"], ["color_code", "color"], ["stock_quantity", "num"], ["sku", "text"], ["is_active", "bool"]];
async function vProducts() {
  const { data } = await supabase.from("products").select("*, product_variants(*)").order("created_at");
  const root = h("div");
  for (const p of data || []) {
    root.append(h("h3", { textContent: p.name }), editor("products", p, PC, go));
    for (const v of p.product_variants.sort((a, b) => a.color_name.localeCompare(b.color_name))) root.append(editor("product_variants", v, VC, go));
    const b = h("button", { className: "btn", textContent: "+ " + t("new_variant"), onclick: () => b.replaceWith(editor("product_variants", { _extra: { product_id: p.id } }, VC, go)) });
    root.append(b);
  }
  const nb = h("button", { className: "btn", style: "margin-top:1.5rem", textContent: "+ " + t("new_product"), onclick: () => nb.replaceWith(editor("products", {}, PC, go)) });
  root.append(h("div", {}, nb)); return root;
}

/* ---------- Orders ---------- */
async function vOrders() {
  const q = h("input", { placeholder: t("search") }), dt = h("input", { type: "date", title: t("date") });
  const st = h("select", {}, h("option", { value: "", textContent: t("all") }), ...STAT.map(s => h("option", { value: s, textContent: t(s) })));
  const list = h("div"), det = h("div");
  const run = async () => {
    let r = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    const s = q.value.replace(/[%,()]/g, "").trim();
    if (s) r = r.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
    if (st.value) r = r.eq("order_status", st.value); if (dt.value) r = r.gte("created_at", dt.value);
    const { data } = await r;
    list.replaceChildren(data?.length ? tbl(["#", t("customer_name"), t("phone"), t("total"), t("status"), t("created_at")],
      data.map(o => h("tr", { onclick: () => show(o) }, td(o.order_number), td(o.customer_name), td(o.phone), td(money(o.total)), td(t(o.order_status)), td(new Date(o.created_at).toLocaleString(L === "ar" ? "ar-EG" : "en-GB"))))) : h("p", { textContent: t("empty") }));
  };
  const show = async o => {
    const [it, hs] = await Promise.all([supabase.from("order_items").select("*").eq("order_id", o.id), supabase.from("order_status_history").select("*").eq("order_id", o.id).order("created_at")]);
    const sel = h("select", {}, ...STAT.map(s => h("option", { value: s, textContent: t(s), selected: s === o.order_status }))), msg = h("span");
    const ub = h("button", { className: "btn", textContent: t("save"), onclick: async () => {
      const { error } = await supabase.from("orders").update({ order_status: sel.value }).eq("id", o.id);   // DB trigger handles stock restore + history
      if (error) msg.textContent = error.message.includes("cancelled_is_final") ? t("cancelled_is_final") : error.message; else { run(); show({ ...o, order_status: sel.value }); }
    } });
    det.replaceChildren(h("div", { className: "pane" }, h("h3", { textContent: o.order_number }),
      ...[["customer_name", o.customer_name], ["phone", o.phone], ["address", `${o.governorate} - ${o.city} - ${o.address}`], ["notes", o.notes], ["total", `${money(o.subtotal)} + ${money(o.shipping_fee)} = ${money(o.total)}`]].map(([k, v]) => h("p", { textContent: `${t(k)}: ${v ?? "—"}` })),
      h("h3", { textContent: t("items") }), ...(it.data || []).map(i => h("p", { textContent: `${i.product_name_snapshot} · ${i.color_name_snapshot} × ${i.quantity} = ${money(i.total_price)}` })),
      h("h3", { textContent: t("status") }), sel, ub, msg,
      h("h3", { textContent: t("history") }), ...(hs.data || []).map(x => h("p", { textContent: `${new Date(x.created_at).toLocaleString()} · ${t(x.from_status || "")} → ${t(x.to_status)}` }))));
    det.scrollIntoView({ behavior: "smooth" });
  };
  [q, st, dt].forEach(e => e.addEventListener(e === q ? "input" : "change", run)); run();
  return h("div", {}, h("div", { className: "bar2" }, q, st, dt), list, det);
}

/* ---------- Images: upload (resized to WebP), replace, delete, primary, drag-reorder ---------- */
const TYPES = ["product", "thumbnail", "gallery", "banner", "before_after"];
const folderOf = (ty, v) => ty === "product" ? "products/" + ((v?.color_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "misc") : { thumbnail: "products/thumbs", gallery: "gallery", banner: "banners", before_after: "before-after" }[ty];
async function toWebp(file) {
  const bm = await createImageBitmap(file), s = Math.min(1, 1600 / Math.max(bm.width, bm.height)), c = document.createElement("canvas");
  c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s); c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, "image/webp", .85));
}
async function upload(file, folder) {
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, await toWebp(file), { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error; return { path, url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}
async function vImages() {
  const [{ data: vs }, { data: imgs }] = await Promise.all([supabase.from("product_variants").select("id,color_name,product_id").order("color_name"), supabase.from("product_images").select("*").order("display_order")]);
  const ty = h("select", {}, ...TYPES.map(x => h("option", { value: x, textContent: x.replace("_", " ") })));
  const vr = h("select", {}, h("option", { value: "", textContent: t("none") }), ...(vs || []).map(v => h("option", { value: v.id, textContent: v.color_name })));
  const fi = h("input", { type: "file", accept: "image/*", multiple: true }), prev = h("div", { className: "grid" }), msg = h("span");
  fi.onchange = () => prev.replaceChildren(...[...fi.files].map(f => h("div", { className: "im" }, h("img", { src: URL.createObjectURL(f), alt: "" }))));   // preview before saving
  const ub = h("button", { className: "btn", textContent: t("upload"), onclick: async () => {
    const isP = ["product", "thumbnail"].includes(ty.value), v = isP ? vs.find(x => x.id === vr.value) : null, pid = v?.product_id || (isP ? vs[0]?.product_id : null);
    if (isP && !pid) return msg.textContent = "Create a product first.";
    let n = (imgs || []).filter(i => i.image_type === ty.value).length;
    try { for (const f of fi.files) { const u = await upload(f, folderOf(ty.value, v)); const { error } = await supabase.from("product_images").insert({ product_id: pid, variant_id: v?.id || null, image_url: u.url, storage_path: u.path, image_type: ty.value, display_order: n++ }); if (error) throw error; } go(); }
    catch (e) { msg.textContent = e.message; }
  } });
  ty.onchange = () => { vr.disabled = !["product", "thumbnail"].includes(ty.value); }; ty.onchange();   // color only matters for product images
  const out = h("div", {}, h("div", { className: "ed" }, h("label", {}, t("type"), ty), h("label", {}, t("color_name"), vr), h("label", {}, "", fi), ub, msg), prev);
  for (const type of TYPES) {
    const items = (imgs || []).filter(i => i.image_type === type); if (!items.length) continue;
    const g = h("div", { className: "grid" }); let drag = -1;
    items.forEach((im, idx) => {
      const rf = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async () => {
        const u = await upload(rf.files[0], im.storage_path ? im.storage_path.split("/").slice(0, -1).join("/") : folderOf(type));
        await supabase.from("product_images").update({ image_url: u.url, storage_path: u.path }).eq("id", im.id);
        if (im.storage_path) await supabase.storage.from(MEDIA_BUCKET).remove([im.storage_path]); go(); } });
      const b = (k, fn) => h("button", { textContent: t(k), onclick: fn });
      const el = h("div", { className: "im" + (im.is_primary ? " pr" : ""), draggable: true,
        ondragstart: () => drag = idx, ondragover: e => e.preventDefault(),
        ondrop: async () => { if (drag < 0 || drag === idx) return; const a = [...items]; a.splice(idx, 0, a.splice(drag, 1)[0]); await Promise.all(a.map((x, i) => supabase.from("product_images").update({ display_order: i }).eq("id", x.id))); go(); } },
        h("img", { src: im.image_url, alt: "", loading: "lazy" }),
        im.product_id ? b("primary", async () => {
          let r = supabase.from("product_images").update({ is_primary: false }); r = im.variant_id ? r.eq("variant_id", im.variant_id) : r.eq("product_id", im.product_id).is("variant_id", null);
          await r; await supabase.from("product_images").update({ is_primary: true }).eq("id", im.id); go(); }) : "",
        b("replace", () => rf.click()), rf,
        b("del", async () => { if (!confirm("?")) return; if (im.storage_path) await supabase.storage.from(MEDIA_BUCKET).remove([im.storage_path]); await supabase.from("product_images").delete().eq("id", im.id); go(); }));
      g.append(el);
    });
    out.append(h("h3", { textContent: `${type.replace("_", " ")} — ${t("drag")}` }), g);
  }
  return out;
}

/* ---------- Reviews (real ones only, added by you) ---------- */
const RC = [["customer_name", "text"], ["rating", "num"], ["comment", "area"], ["display_order", "num"], ["is_published", "bool"]];
async function vReviews() {
  const { data } = await supabase.from("reviews").select("*").order("display_order").order("created_at", { ascending: false });
  const root = h("div"); (data || []).forEach(r => root.append(editor("reviews", r, RC, go)));
  const nb = h("button", { className: "btn", textContent: "+ " + t("new_review"), onclick: () => nb.replaceWith(editor("reviews", { rating: 5, is_published: true }, RC, go)) });
  root.append(nb); return root;
}

/* ---------- Settings ---------- */
async function vSettings() {
  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
  return editor("store_settings", data || { id: 1 }, [["store_name", "text"], ["logo_url", "text"], ["currency", "text"], ["shipping_fee", "num"], ["free_shipping_threshold", "num"], ["whatsapp_number", "text"], ["contact_email", "text"], ["announcement_text", "text"], ["social_links", "json"], ["low_stock_threshold", "num"], ["is_store_open", "bool"], ["friday_promo", "bool"], ["friday_theme", "text"], ["friday_text", "text"]]);
}

/* ---------- Router, language, realtime notifications ---------- */
const V = { overview: vOverview, products: vProducts, orders: vOrders, images: vImages, reviews: vReviews, settings: vSettings };
let cur;
async function go() {
  cur = V[location.hash.slice(1)] ? location.hash.slice(1) : "overview";
  document.querySelectorAll(".top a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + cur));
  try { $("view").replaceChildren(await V[cur]()); } catch (e) { $("view").textContent = e.message; }
}
function applyLang() {
  document.documentElement.lang = L; document.documentElement.dir = L === "ar" ? "rtl" : "ltr"; $("lang").textContent = L === "ar" ? "EN" : "عربي";
  document.querySelectorAll("[data-t]").forEach(e => e.textContent = t(e.dataset.t)); go();
}
$("lang").onclick = () => { L = L === "ar" ? "en" : "ar"; localStorage.setItem("folix_admin_lang", L); applyLang(); };
$("out").onclick = async () => { await supabase.auth.signOut(); location.href = "login.html"; };
addEventListener("hashchange", go);
// New order → toast instantly (Supabase Realtime; only admins can read notifications thanks to RLS).
supabase.channel("orders-feed").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, p => {
  if (p.new.type === "order_cancelled") { toast(`${t("order_cancelled")} ${p.new.payload.order_number}`); if (cur === "overview" || cur === "orders") go(); return; }
  const x = p.new.payload; toast(`${t("new_order")} ${x.order_number} · ${x.customer_name} · ${x.color} × ${x.quantity} · ${money(x.total)}`);
  if (cur === "overview" || cur === "orders") go();
}).subscribe();
applyLang();
