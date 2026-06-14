import { BadRequestError } from "@error-custom/BadRequestError";
import { CustomError } from "@error-custom/CustomError";
import { NotFoundError } from "@error-custom/NotFoundError";
import { describe, expect, it } from "vitest";

describe("error-handling", () => {
  it("CustomError carries status code and message", () => {
    const err = new CustomError("boom", 418);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("boom");
  });

  it("NotFoundError defaults to 404", () => {
    const err = new NotFoundError("missing");
    expect(err).toBeInstanceOf(CustomError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("missing");
  });

  it("BadRequestError defaults to 400", () => {
    const err = new BadRequestError("bad");
    expect(err).toBeInstanceOf(CustomError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("bad");
  });
});
