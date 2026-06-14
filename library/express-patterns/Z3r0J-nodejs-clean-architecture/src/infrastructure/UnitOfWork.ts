import { TOKENS } from "@container/tokens";
import type { IUnitOfWork, TxRepositories } from "@interfaces/common/IUnitOfWork";
import { TestRepository } from "@repositories/TestRepository";
import { inject, injectable } from "tsyringe";
import type { DataSource } from "typeorm";

@injectable()
export class TypeORMUnitOfWork implements IUnitOfWork {
  constructor(@inject(TOKENS.DataSource) private readonly dataSource: DataSource) {}

  async run<T>(work: (repos: TxRepositories) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const repos: TxRepositories = {
        test: new TestRepository(manager),
      };
      return work(repos);
    });
  }
}
