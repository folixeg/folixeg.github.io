/* Cart: stores ONLY variant ids + quantities. Prices/stock are always re-read from Supabase. */
import { getLang } from "./i18n.js?v=4";
const K = "folix_cart";
export const getCart = () => { try { return JSON.parse(localStorage.getItem(K)) || []; } catch { return []; } };
export const saveCart = c => { try { localStorage.setItem(K, JSON.stringify(c)); } catch {} dispatchEvent(new Event("cartchange")); };
export const cartCount = () => getCart().reduce((n, i) => n + i.quantity, 0);
export function addToCart(variant_id, quantity, max) {
  const c = getCart(), l = c.find(i => i.variant_id === variant_id);
  if (l) l.quantity = Math.min(l.quantity + quantity, max); else c.push({ variant_id, quantity: Math.min(quantity, max) });
  saveCart(c);
}
export const money = (n, cur = "EGP") => new Intl.NumberFormat(getLang() === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
export const h = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
