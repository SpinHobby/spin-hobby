import { defineConfig, type Alias } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * `npm run dev:gleamshelf`: the admin runs the editor straight from a Gleamshelf checkout (../gleamshelf, or GLEAMSHELF_DIR), not from the
 * packed copy in vendor/, so editor changes show in the admin as they are saved. Builds always use the packed copy.
 */
function liveGleamshelf(mode: string, command: string): { alias: Alias[]; dir: string } | null {
  if (mode !== "gleamshelf" || command !== "serve") return null;
  const dir = resolve(__dirname, process.env.GLEAMSHELF_DIR ?? "../gleamshelf");
  const src = resolve(dir, "packages/react/src");
  if (!existsSync(resolve(src, "index.ts")))
    throw new Error(`No Gleamshelf editor at ${src}: clone gleamshelf next to spin-hobby, or set GLEAMSHELF_DIR`);
  if (!existsSync(resolve(dir, "node_modules"))) throw new Error(`Gleamshelf at ${dir} has no node_modules: run npm ci there first`);
  console.log(`\n  Admin editor: live from ${dir}\n`);
  return {
    dir,
    alias: [
      // the source's components import their own CSS; the packed copy's single stylesheet is not needed
      { find: /^@gleamshelf\/react\/style\.css$/, replacement: resolve(__dirname, "scripts/empty.css") },
      { find: /^@gleamshelf\/react\/(scene|avatar|market|game)$/, replacement: `${src}/$1.ts` },
      { find: /^@gleamshelf\/react$/, replacement: `${src}/index.ts` },
    ],
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const live = liveGleamshelf(mode, command);
  return {
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
      alias: [...(live?.alias ?? []), { find: "@", replacement: resolve(__dirname, "./src") }],
      // the editor's source would otherwise bring Gleamshelf's own copy of React: hooks need exactly one
      dedupe: ["react", "react-dom"],
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
      ...(live ? { fs: { allow: [__dirname, live.dir] } } : {}),
    },
  };
});
