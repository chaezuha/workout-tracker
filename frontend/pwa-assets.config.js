import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Generates the PNG app icons (192/512, maskable, apple-touch) from the SVG
// favicon: `npm run generate-pwa-assets`. The maskable/apple icons get a
// white background and padding so the glyph stays inside the safe zone.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.3,
      resizeOptions: { background: "#ffffff", fit: "contain" },
    },
    apple: {
      sizes: [180],
      padding: 0.3,
      resizeOptions: { background: "#ffffff", fit: "contain" },
    },
  },
  images: ["public/favicon.svg"],
})
