import { createClient } from "@supabase/supabase-js";

// Runtime config (window.__APP_CONFIG__, from /env.js) wins over build-time
// env so a container's .env overrides values baked in by a source build. In
// dev the placeholder env.js leaves it empty and import.meta.env applies.
const runtime = (typeof window !== "undefined" && window.__APP_CONFIG__) || {};
const url = runtime.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const anonKey = runtime.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase config. Docker: set SUPABASE_URL and SUPABASE_ANON_KEY " +
      "in the .env file next to compose.yaml. Local dev: copy " +
      "frontend/.env.example to frontend/.env.local and set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, anonKey);
