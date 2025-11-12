import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Removed jsxLocPlugin and vitePluginManusRuntime for production compatibility
const plugins = [react(), tailwindcss()];

export default defineConfig({
  plugins,
  optimizeDeps: {
    include: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(__dirname),
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client", "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id) => {
          // Prevent tree-shaking of lucide-react
          if (id.includes('lucide-react')) {
            return true;
          }
          return 'no-treeshake';
        },
      },
      output: {
        manualChunks(id) {
          // Force all lucide-react imports into a single chunk
          if (id.includes('lucide-react') || id.includes('lib/icons')) {
            return 'lucide';
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: ['.manusvm.computer', 'localhost'],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
