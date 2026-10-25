import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Cloudflare の認証なしでローカルに動かすための設定。D1 は Miniflare がローカルの SQLite で再現する。
// DOCS: https://tanstack.com/start/latest/docs/framework/react/guide/hosting#cloudflare-workers
export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    include: ["motion/react"],
  },
  plugins: [
    cloudflare({
      configPath: "./wrangler.local.jsonc",
      viteEnvironment: { name: "ssr" },
      persistState: { path: "../../.wrangler/state" },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
