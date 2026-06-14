import type { NextFunction, Request, Response } from "express";

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.API_KEY;
  const provided = req.headers["x-api-key"];

  if (!expected || provided !== expected) {
    console.log("[UNAUTHORIZED ❌] Invalid API Key.");
    return res.status(401).json({ message: "Invalid API Key" });
  }

  return next();
};
