import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // This site has no Netlify edge functions or database. Leaving them on makes
    // `npm run dev` try to boot Deno + a local Postgres, which crashes on most machines.
    netlify({ edgeFunctions: { enabled: false }, database: { enabled: false } }),
  ],
  root: ".",
  publicDir: "public",
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          paypal: ["@paypal/react-paypal-js"],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
