#!/bin/sh
# Writes the runtime config the frontend reads on load (window.__APP_CONFIG__).
# Empty values are allowed so a source-built image with baked-in VITE_* vars
# still runs; compose.yaml is what fails fast on missing vars.
set -eu

: "${SUPABASE_URL:=}"
: "${SUPABASE_ANON_KEY:=}"

# Values land inside double-quoted JS string literals, so backslashes and
# quotes must be escaped (and newlines dropped) or a stray character would
# break — or inject into — env.js.
js_escape() {
  printf '%s' "$1" | tr -d '\n\r' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

SUPABASE_URL_JS="$(js_escape "${SUPABASE_URL}")"
SUPABASE_ANON_KEY_JS="$(js_escape "${SUPABASE_ANON_KEY}")"

cat > /usr/share/nginx/html/env.js <<EOF
window.__APP_CONFIG__ = {
  SUPABASE_URL: "${SUPABASE_URL_JS}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY_JS}"
};
EOF

echo "40-runtime-env.sh: wrote /env.js (SUPABASE_URL=${SUPABASE_URL:-<empty>})"
