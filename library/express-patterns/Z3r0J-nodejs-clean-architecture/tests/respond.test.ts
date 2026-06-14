import { respond } from "@controllers/helpers/respond";
import { BadRequestError } from "@error-custom/BadRequestError";
import { NotFoundError } from "@error-custom/NotFoundError";
import { ValidationError } from "@error-custom/ValidationError";
import type { Response } from "express";
import { err, errAsync, ok, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

const buildRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
};

describe("respond", () => {
  it("renders a successful Result with default 200 and raw value", async () => {
    const res = buildRes();
    await respond(res, ok({ name: "foo" }));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ name: "foo" });
  });

  it("applies successStatus and map options on success", async () => {
    const res = buildRes();
    await respond(res, okAsync({ id: 1 }), {
      successStatus: 201,
      map: (v) => ({ wrapped: v }),
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ wrapped: { id: 1 } });
  });

  it("renders a NotFoundError as 404 with { message }", async () => {
    const res = buildRes();
    await respond(res, err(new NotFoundError("missing")));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "missing" });
  });

  it("renders a BadRequestError as 400 with { message }", async () => {
    const res = buildRes();
    await respond(res, errAsync(new BadRequestError("bad input")));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "bad input" });
  });

  it("renders a ValidationError as 400 with { errors }", async () => {
    const res = buildRes();
    const validation = new ValidationError([
      { property: "name", constraints: ["should not be empty"] },
    ]);
    await respond(res, err(validation));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ property: "name", constraints: ["should not be empty"] }],
    });
  });
});
