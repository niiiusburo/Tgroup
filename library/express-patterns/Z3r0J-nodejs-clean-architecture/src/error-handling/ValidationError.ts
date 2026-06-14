import { CustomError } from "@error-custom/CustomError";

export interface ValidationDetail {
  property: string;
  constraints: string[];
}

export class ValidationError extends CustomError {
  constructor(public readonly details: ValidationDetail[]) {
    super("Validation failed", 400);
  }
  name = "ValidationError";
}
