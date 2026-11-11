// Only the PUBLIC anon/publishable key belongs here (safe in the browser because RLS protects the data).
// NEVER put a secret / service_role key in this project.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://xqwffihonsjrcwtgeplr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_OeDPalUC60NI-KpdmzBwJw_bNFfeUZA";

export const isConfigured = !SUPABASE_URL.includes("YOUR-PROJECT");
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const MEDIA_BUCKET = "folix-media";
// Storage folders: products/black, products/brown, gallery, banners, before-after
