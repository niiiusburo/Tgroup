import { TOKENS } from "@container/tokens";
import { Test } from "@entities/Test";
import { BadRequestError } from "@error-custom/BadRequestError";
import type { IUnitOfWork } from "@interfaces/common/IUnitOfWork";
import type { ITestRepository } from "@interfaces/repositories/ITestRepository";
import type { ITestServices } from "@interfaces/services/ITestServices";
import { GenericServices } from "@services/GenericServices";
import { ResultAsync } from "neverthrow";
import { inject, injectable } from "tsyringe";

@injectable()
export class TestServices extends GenericServices<Test> implements ITestServices {
  constructor(
    @inject(TOKENS.TestRepository) repository: ITestRepository,
    @inject(TOKENS.UnitOfWork) private readonly uow: IUnitOfWork
  ) {
    super(repository);
  }

  createIfUnique(name: string): ResultAsync<Test, BadRequestError> {
    return ResultAsync.fromPromise(
      this.uow.run(async (repos) => {
        const existing = await repos.test.findByName(name);
        if (existing) {
          throw new BadRequestError(`Test with name "${name}" already exists`);
        }
        return repos.test.Create(new Test({ name } as Test));
      }),
      (e) => (e instanceof BadRequestError ? e : new BadRequestError(String(e)))
    );
  }
}
