import { Test } from "@entities/Test";
import type { ITestRepository } from "@interfaces/repositories/ITestRepository";
import { GenericRepository, type RepositoryContext } from "@repositories/GenericRepository";

export class TestRepository extends GenericRepository<Test> implements ITestRepository {
  constructor(context: RepositoryContext) {
    super(context, Test);
  }

  async findByName(name: string): Promise<Test | null> {
    return this.repository.findOne({ where: { name } });
  }
}
