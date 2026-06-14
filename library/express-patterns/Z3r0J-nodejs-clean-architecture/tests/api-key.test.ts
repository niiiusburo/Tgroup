import { apiKeyMiddleware } from "@middlewares/apikey.middleware";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const buildApp = () => {
  const app = express();
  app.get("/secure", apiKeyMiddleware, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
};

describe("apiKeyMiddleware", () => {
  const originalKey = process.env.API_KEY;

  beforeEach(() => {
    process.env.API_KEY = "test-secret";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = originalKey;
  });

  it("returns 401 when no key is provided", async () => {
    const res = await request(buildApp()).get("/secure");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid API Key" });
  });

  it("returns 401 when key is wrong", async () => {
    const res = await request(buildApp()).get("/secure").set("x-api-key", "wrong");
    expect(res.status).toBe(401);
  });

  it("calls next when key matches", async () => {
    const res = await request(buildApp()).get("/secure").set("x-api-key", "test-secret");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns 401 when API_KEY env is missing (denies by default)", async () => {
    delete process.env.API_KEY;
    const res = await request(buildApp()).get("/secure").set("x-api-key", "anything");
    expect(res.status).toBe(401);
  });
});
