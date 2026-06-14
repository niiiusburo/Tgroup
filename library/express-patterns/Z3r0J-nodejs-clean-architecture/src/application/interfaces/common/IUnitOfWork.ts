import type { ITestRepository } from "@interfaces/repositories/ITestRepository";

export interface TxRepositories {
  test: ITestRepository;
}

export interface IUnitOfWork {
  run<T>(work: (repos: TxRepositories) => Promise<T>): Promise<T>;
}
