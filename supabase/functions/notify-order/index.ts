// Forwards new-order notifications to Telegram. Triggered by a Database Webhook on notifications INSERT.
// Secrets live in Supabase (never in frontend code). The message carries no address or notes.
Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });
  const rec = (await req.json())?.record; const p = rec?.payload;
  if (!p) return new Response("ok");
  const text = rec.type === "order_cancelled" ? `❌ Order #${p.order_number} was cancelled by the customer` : `🛒 New FOLIX order\n#${p.order_number}\n${p.customer_name} · ${p.phone}\n${p.color} × ${p.quantity}\nTotal: ${p.total}`;
  const bot = Deno.env.get("TELEGRAM_BOT_TOKEN"), chat = Deno.env.get("TELEGRAM_CHAT_ID");
  if (bot && chat) await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text }) });
  // Add WhatsApp / email providers here the same way (read their keys from Deno.env).
  return new Response("ok");
});
