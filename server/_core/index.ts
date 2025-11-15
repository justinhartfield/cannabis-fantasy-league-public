import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { healthRouter } from "../healthRouter";
import authRouter from "../routes/auth";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { scoringScheduler } from "../scoringScheduler";
import { initDailyChallengeScheduler } from "../dailyChallengeScheduler";
import { initPredictionScheduler } from "../predictionScheduler";
import { getDailyStatsScheduler } from "../dailyStatsScheduler";
import { wsManager } from "../websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, '0.0.0.0', () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Configure cookie parser
  app.use(cookieParser());
  // Health check endpoints
  app.use("/api", healthRouter);
  // Auth endpoints
  app.use("/api/auth", authRouter);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Initialize WebSocket manager
    wsManager.initialize(server);
    console.log('[WebSocket] Manager initialized');
    
    // Start scoring scheduler
    scoringScheduler.start();
    console.log('[Scoring] Scheduler started');
    
    // Start daily challenge scheduler
    initDailyChallengeScheduler();
    console.log('[DailyChallenge] Scheduler started');
    
    // Start daily stats aggregation scheduler
    const dailyStatsScheduler = getDailyStatsScheduler();
    dailyStatsScheduler.start();
    console.log('[DailyStats] Scheduler started');
    
    // Start prediction scheduler
    initPredictionScheduler();
    console.log('[Prediction] Scheduler started');
  });
}

startServer().catch(console.error);
