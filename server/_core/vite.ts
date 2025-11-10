import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const clientRoot = path.resolve(projectRoot, "client");
  
  const serverOptions = {
    middlewareMode: true,
    hmr: false, // Disable HMR to fix timeout issues
    allowedHosts: ['.manusvm.computer', 'localhost'], // Allow Manus VM hosts
  };

  console.log('[Vite] Creating Vite server...');
  console.log('[Vite] projectRoot:', projectRoot);
  console.log('[Vite] clientRoot:', clientRoot);
  console.log('[Vite] viteConfig.server:', viteConfig.server);
  console.log('[Vite] serverOptions:', serverOptions);
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    root: clientRoot, // Override root to correct path
    resolve: {
      alias: {
        "@": path.resolve(clientRoot, "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    server: {
      ...serverOptions,
      ...viteConfig.server,
      allowedHosts: ['.manusvm.computer', 'localhost'], // Ensure this is not overridden
    },
    appType: "custom",
    optimizeDeps: {
      force: false,
    },
  });
  console.log('[Vite] Vite server created successfully');

  app.use(vite.middlewares);
  
  // Serve index.html for all non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error('[Vite] Error:', e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
