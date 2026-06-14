import type { CustomError } from "@error-custom/CustomError";
import { ValidationError } from "@error-custom/ValidationError";
import type { Response } from "express";
import type { Result, ResultAsync } from "neverthrow";

export interface RespondOptions<T, U> {
  successStatus?: number;
  map?: (value: T) => U;
}

const renderError = (res: Response, err: CustomError): Response => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ errors: err.details });
  }
  return res.status(err.statusCode).json({ message: err.message });
};

const renderUnknownError = (res: Response, err: unknown): Response => {
  console.error("[respond] uncaught", err);
  return res.status(500).json({ message: "Internal server error" });
};

export const respond = async <T, E extends CustomError, U = T>(
  res: Response,
  result: Result<T, E> | ResultAsync<T, E>,
  options: RespondOptions<T, U> = {}
): Promise<Response> => {
  try {
    const resolved =
      "match" in result && typeof result.match === "function" ? await result : result;
    return resolved.match(
      (value) => {
        const body = options.map ? options.map(value) : value;
        return res.status(options.successStatus ?? 200).json(body);
      },
      (err) => renderError(res, err)
    );
  } catch (err) {
    return renderUnknownError(res, err);
  }
};
