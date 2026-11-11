/* Store / checkout strings (merged into the main dictionary). */
import { T } from "./i18n.js?v=4";
Object.assign(T.ar, {
  cart: "السلة", color: "اللون", qty: "الكمية", stock: "المتاح", out: "نفد المخزون",
  add: "أضف إلى السلة", order_now: "اطلب الآن", added: "تمت الإضافة للسلة ✓",
  unavail: "المنتج غير متاح حاليًا.", not_configured: "لم يتم ربط Supabase بعد. أضف الرابط والمفتاح في config/supabase.js.", load_err: "تعذّر تحميل المنتج. حاول مرة أخرى.",
  co_h: "إتمام الطلب", cart_empty: "السلة فارغة.", back_shop: "العودة للمتجر", subtotal: "المجموع", shipping: "الشحن", free: "مجاني", total: "الإجمالي", remove: "حذف",
  f_name: "الاسم بالكامل", f_phone: "رقم الموبايل", f_gov: "المحافظة", f_city: "المدينة / المنطقة", f_addr: "العنوان بالتفصيل", f_notes: "ملاحظات (اختياري)", choose: "اختر المحافظة",
  place: "تأكيد الطلب · الدفع عند الاستلام", placing: "جارٍ إرسال الطلب…",
  e_name: "اكتب اسمك (حرفان على الأقل).", e_phone: "رقم موبايل مصري غير صحيح (مثال: 01012345678).", e_gov: "اختر المحافظة.", e_city: "اكتب المدينة أو المنطقة.", e_addr: "اكتب العنوان بالتفصيل.",
  err_out_of_stock: "الكمية المطلوبة غير متاحة. تم تحديث السلة، راجعها وحاول مرة أخرى.", err_product_unavailable: "أحد المنتجات لم يعد متاحًا.",
  err_store_closed: "المتجر مغلق مؤقتًا.", err_rate_limited: "طلبات كثيرة من نفس الرقم. حاول لاحقًا.", err_generic: "حدث خطأ. حاول مرة أخرى.",
  ok_h: "تم استلام طلبك", ok_no: "رقم الطلب", ok_msg: "سنتصل بك قريبًا لتأكيد الطلب. الدفع عند الاستلام."
});
Object.assign(T.en, {
  cart: "Cart", color: "Color", qty: "Quantity", stock: "In stock", out: "Out of stock",
  add: "Add to cart", order_now: "Order now", added: "Added to cart ✓",
  unavail: "This product is currently unavailable.", not_configured: "Supabase isn't connected yet. Add the URL and key in config/supabase.js.", load_err: "Couldn't load the product. Please try again.",
  co_h: "Checkout", cart_empty: "Your cart is empty.", back_shop: "Back to shop", subtotal: "Subtotal", shipping: "Shipping", free: "Free", total: "Total", remove: "Remove",
  f_name: "Full name", f_phone: "Mobile number", f_gov: "Governorate", f_city: "City / Area", f_addr: "Full address", f_notes: "Notes (optional)", choose: "Choose governorate",
  place: "Place order · Cash on delivery", placing: "Placing order…",
  e_name: "Enter your name (2+ characters).", e_phone: "Invalid Egyptian mobile (e.g. 01012345678).", e_gov: "Choose a governorate.", e_city: "Enter your city or area.", e_addr: "Enter your full address.",
  err_out_of_stock: "The requested quantity isn't available. Your cart was updated; review and try again.", err_product_unavailable: "An item is no longer available.",
  err_store_closed: "The store is temporarily closed.", err_rate_limited: "Too many orders from this number. Try later.", err_generic: "Something went wrong. Please try again.",
  ok_h: "Order received", ok_no: "Order number", ok_msg: "We'll call you shortly to confirm. Cash on delivery."
});

Object.assign(T.ar, { eyebrow: "ألياف بناء الشعر", h1: "رجّع ثقتك في دقيقتين", sub: "رشّة بسيطة تغطّي المناطق الخفيفة وتديك مظهر طبيعي تحب تشوفه في المراية. من غير صبغة ولا لزق.", t1: "الدفع عند الاستلام", t2: "توصيل لكل المحافظات", t3: "لونان طبيعيان" });
Object.assign(T.en, { eyebrow: "Hair building fibers", h1: "Get your confidence back in two minutes", sub: "One light sprinkle covers thin areas and gives a natural look you'll love in the mirror. No dye, no glue.", t1: "Cash on delivery", t2: "Delivery nationwide", t3: "Two natural shades" });

Object.assign(T.ar, { t2: "توصيل خلال 3–5 أيام", eta: "التوصيل خلال 3 إلى 5 أيام", q5: "هل أقدر ألغي أو أعدّل الطلب؟", a5: "أكيد، كلّمنا على واتساب بأسرع وقت وقبل ما الطلب يتشحن، وهنلغيه أو نعدّله لك.", cancel_note: "عايز تلغي أو تعدّل الطلب؟ كلّمنا على واتساب قبل ما يتشحن.", wa_cancel: "إلغاء / تعديل الطلب على واتساب" });
Object.assign(T.en, { t2: "Delivery in 3–5 days", eta: "Delivery within 3 to 5 days", q5: "Can I cancel or change my order?", a5: "Yes. Message us on WhatsApp as soon as possible, before the order ships, and we'll cancel or change it.", cancel_note: "Want to cancel or change your order? Message us on WhatsApp before it ships.", wa_cancel: "Cancel / change order on WhatsApp" });

Object.assign(T.ar, { cancel_btn: "إلغاء الطلب", cancel_confirm: "متأكد إنك عايز تلغي الطلب؟", cancelled_ok: "تم إلغاء طلبك.", too_late: "الطلب اتجهّز أو اتشحن ومينفعش يتلغى من هنا. كلّمنا على واتساب.", cancel_err: "تعذّر الإلغاء. كلّمنا على واتساب." });
Object.assign(T.en, { cancel_btn: "Cancel order", cancel_confirm: "Are you sure you want to cancel this order?", cancelled_ok: "Your order has been cancelled.", too_late: "The order is already being prepared or shipped and can't be cancelled here. Message us on WhatsApp.", cancel_err: "Couldn't cancel. Please message us on WhatsApp." });

Object.assign(T.ar, { in_stock: "متوفر" }); Object.assign(T.en, { in_stock: "In stock" });

Object.assign(T.ar, { promo_black: "بلاك فرايداي", promo_white: "وايت فرايداي", promo_ends: "ينتهي عرض الجمعة بعد", promo_in: "عرض الجمعة بعد", d: "يوم", hh: "ساعة", mm: "دقيقة", ss: "ثانية", cancel_easy: "إلغاء سهل قبل الشحن" });
Object.assign(T.en, { promo_black: "Black Friday", promo_white: "White Friday", promo_ends: "Friday offer ends in", promo_in: "Friday offer in", d: "days", hh: "hrs", mm: "min", ss: "sec", cancel_easy: "Easy cancel before shipping" });

Object.assign(T.ar, { ship_fee: "الشحن", free_over: "شحن مجاني للطلبات فوق", ship_free: "شحن مجاني" });
Object.assign(T.en, { ship_fee: "Shipping", free_over: "free shipping over", ship_free: "Free shipping" });
