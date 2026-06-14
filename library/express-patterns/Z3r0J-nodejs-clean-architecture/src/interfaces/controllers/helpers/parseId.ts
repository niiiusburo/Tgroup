import { BadRequestError } from "@error-custom/BadRequestError";
import { err, ok, type Result } from "neverthrow";

export const parseId = (raw: string | string[] | undefined): Result<number, BadRequestError> => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return err(new BadRequestError(`Invalid id: ${value}`));
  }
  return ok(parsed);
};
