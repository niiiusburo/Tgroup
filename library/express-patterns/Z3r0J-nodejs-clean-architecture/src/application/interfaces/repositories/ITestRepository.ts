import type { Test } from "@entities/Test";
import type { IGenericRepository } from "@interfaces/repositories/IGenericRepository";

export interface ITestRepository extends IGenericRepository<Test> {
  findByName(name: string): Promise<Test | null>;
}
