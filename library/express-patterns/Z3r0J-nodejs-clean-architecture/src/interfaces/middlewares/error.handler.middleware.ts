import { CustomError } from "@error-custom/CustomError";
import { ValidationError } from "@error-custom/ValidationError";
import type { NextFunction, Request, Response } from "express";

export const ErrorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ errors: err.details });
  }

  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error("[ErrorHandler] uncaught", err);
  return res.status(500).json({ message: "Internal server error" });
};
