import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Formworks — Vehicle Assembly",
        short_name: "Formworks",
        description: "Build something worth driving.",
        theme_color: "#e86f35",
        background_color: "#111514",
        display: "standalone",
        orientation: "landscape",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 7000000,
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 2500 },
});
