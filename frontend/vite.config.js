import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// https://vite.dev/config/
export default defineConfig({
  // Shown in the About dialog.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": a waiting SW is surfaced by ReloadPrompt.jsx instead of
      // silently activating on the next visit.
      registerType: "prompt",
      manifest: {
        name: "Workout Tracker",
        short_name: "Workouts",
        description: "Log workouts, track progress, and time your rests.",
        display: "standalone",
        start_url: "/",
        theme_color: "#ffffff",
        background_color: "#fafafb",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // woff2 must be listed explicitly: Geist ships via @fontsource and
        // the default glob would leave fonts uncached offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // env.js is regenerated at container startup (runtime config);
        // precaching it would pin the empty build-time placeholder forever.
        globIgnores: ["**/env.js"],
        runtimeCaching: [
          {
            // NetworkFirst: a changed .env takes effect on the next online
            // load, while offline PWA launches still get the last-seen copy.
            urlPattern: ({ url }) => url.pathname === "/env.js",
            handler: "NetworkFirst",
            options: { cacheName: "runtime-config" },
          },
        ],
        navigateFallback: "/index.html",
        // Supabase responses are never cached: the localStorage mirror is
        // the offline data layer, and a SW cache would be a second, staler
        // source of truth.
      },
      // A dev-mode SW outlives the dev server and serves stale precache;
      // test the SW via `npm run build && npm run preview` instead.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
