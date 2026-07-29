import "dotenv/config";
import express from "express";
import cors from "cors";
import type { DemoResponse } from "../shared/api";

/**
 * Express app used for:
 * - Vite middleware in local development (port 8080)
 * - Vercel serverless function (default export)
 *
 * All API routes must live in this file for the Vercel serverless architecture.
 */
export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", (_req, res) => {
    const response: DemoResponse = {
      message: "Hello from Express server",
    };
    res.json(response);
  });

  return app;
}

const app = createServer();

export default app;
