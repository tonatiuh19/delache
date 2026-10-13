import { describe, expect, it } from "vitest";
import request from "supertest";
import { createServer } from "./index";

describe("public API routes", () => {
  const app = createServer();

  it("GET /api/ping returns pong payload", async () => {
    const res = await request(app).get("/api/ping");
    expect(res.status).toBe(200);
    expect(res.body.message).toBeTruthy();
  });

  it("GET /api/demo returns hello payload", async () => {
    const res = await request(app).get("/api/demo");
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Express");
  });
});

describe("protected API routes (no auth)", () => {
  const app = createServer();

  it("returns 401 for staff case list without token", async () => {
    const res = await request(app).get("/api/cases");
    expect(res.status).toBe(401);
  });

  it("returns 401 for dashboard stats without token", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });

  it("returns 401 for cases without token", async () => {
    const res = await request(app).get("/api/cases");
    expect(res.status).toBe(401);
  });

  it("returns 401 for finance invoices without token", async () => {
    const res = await request(app).get("/api/finance/invoices");
    expect(res.status).toBe(401);
  });
});
