import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Workout Tracker",
        short_name: "Workouts",
        description: "Log workouts, track progress, and time your rests.",
        display: "standalone",
        start_url: "/",
        theme_color: "#ffffff",
        background_color: "#ffffff",
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
