import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // No Netlify dev plugin: the site has no functions, edge functions or database, and the plugin's only use was emulating
  // the image service (/.netlify/images) locally. Without it a local page shows Square's original photo instead (src/v3/photo.ts
  // falls back on error); the live site is unchanged. It pulled in 12 high-severity advisories, some with no fixed release.
  plugins: [react()],
  // the deployed commit (Netlify sets COMMIT_REF), sent with browser error reports so they say which release broke
  define: {
    "import.meta.env.VITE_RELEASE": JSON.stringify((process.env.COMMIT_REF ?? "").slice(0, 7)),
  },
  root: ".",
  publicDir: "public",
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // The editor package (vendor/gleamshelf-react-*.tgz) finds its WebAssembly files next to its own code with new URL(..., import.meta.url);
  // pre-bundling would move that code into Vite's cache folder, where those files aren't.
  optimizeDeps: {
    exclude: ["@gleamshelf/react"],
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
