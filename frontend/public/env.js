// Runtime config placeholder. The Docker image regenerates this file at
// container startup from SUPABASE_URL / SUPABASE_ANON_KEY (see
// docker/40-runtime-env.sh). In local dev it stays empty and the app falls
// back to import.meta.env (.env.local).
window.__APP_CONFIG__ = {};
