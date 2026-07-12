import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@motion-anchor/app": resolve(repoRoot, "src"),
    },
  },
  build: {
    outDir: resolve(repoRoot, "dist-site"),
    emptyOutDir: true,
  },
  server: {
    port: 1422,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
});
