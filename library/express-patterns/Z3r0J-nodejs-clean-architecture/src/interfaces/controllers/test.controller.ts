import { TOKENS } from "@container/tokens";
import { parseId } from "@controllers/helpers/parseId";
import { respond } from "@controllers/helpers/respond";
import { CreateTestDTO } from "@dtos/createTestDTO";
import { TestResponseDTO } from "@dtos/testResponseDTO";
import { Test } from "@entities/Test";
import { NotFoundError } from "@error-custom/NotFoundError";
import { ValidationError } from "@error-custom/ValidationError";
import { Logger } from "@helpers/logger";
import type { ILogger } from "@interfaces/common/ILogger";
import type { ITestServices } from "@interfaces/services/ITestServices";
import { validate } from "class-validator";
import type { Request, Response } from "express";
import { err, errAsync, okAsync, ResultAsync } from "neverthrow";
import { inject, injectable } from "tsyringe";

const validateDTO = async (dto: CreateTestDTO) => {
  const errors = await validate(dto);
  if (errors.length === 0) return null;
  return new ValidationError(
    errors.map((e) => ({
      property: e.property,
      constraints: Object.values(e.constraints ?? {}),
    }))
  );
};

@injectable()
export class TestController {
  private readonly _logger: ILogger<TestController> = new Logger<TestController>();

  constructor(@inject(TOKENS.TestServices) private readonly _testServices: ITestServices) {}

  getAll = (_req: Request, res: Response) =>
    respond(
      res,
      ResultAsync.fromSafePromise(this._testServices.GetAll()).andThen((rows) => {
        if (rows.length === 0) {
          this._logger.logWarning("No data found");
          return errAsync(new NotFoundError("No data found"));
        }
        return okAsync(rows);
      }),
      { map: TestResponseDTO.fromEntities }
    );

  getById = (req: Request, res: Response) =>
    respond(
      res,
      parseId(req.params.id).asyncAndThen((id) =>
        ResultAsync.fromSafePromise(this._testServices.GetById(id)).andThen((row) =>
          row ? okAsync(row) : errAsync(new NotFoundError("No data found"))
        )
      ),
      { map: TestResponseDTO.fromEntity }
    );

  create = async (req: Request, res: Response) => {
    const dto = new CreateTestDTO(req.body);
    const validationError = await validateDTO(dto);
    if (validationError) {
      return respond(res, err(validationError));
    }

    return respond(
      res,
      ResultAsync.fromSafePromise(this._testServices.Create(new Test(req.body))),
      { successStatus: 201, map: TestResponseDTO.fromEntity }
    );
  };

  createUnique = async (req: Request, res: Response) => {
    const dto = new CreateTestDTO(req.body);
    const validationError = await validateDTO(dto);
    if (validationError) {
      return respond(res, err(validationError));
    }

    return respond(res, this._testServices.createIfUnique(dto.name), {
      successStatus: 201,
      map: TestResponseDTO.fromEntity,
    });
  };

  update = async (req: Request, res: Response) => {
    const dto = new CreateTestDTO(req.body);
    const validationError = await validateDTO(dto);
    if (validationError) {
      return respond(res, err(validationError));
    }

    return respond(
      res,
      parseId(req.params.id).asyncAndThen((id) =>
        ResultAsync.fromSafePromise(this._testServices.Update(id, new Test(req.body))).andThen(
          (row) => (row ? okAsync(row) : errAsync(new NotFoundError("No data found")))
        )
      ),
      { map: TestResponseDTO.fromEntity }
    );
  };
}
