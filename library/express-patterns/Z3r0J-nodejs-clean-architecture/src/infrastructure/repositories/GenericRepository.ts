import type { BaseEntity } from "@entities/BaseEntity";
import type { IGenericRepository } from "@interfaces/repositories/IGenericRepository";
import type {
  DataSource,
  EntityManager,
  EntityTarget,
  FindOptionsWhere,
  Repository,
} from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

export type RepositoryContext = DataSource | EntityManager;

export abstract class GenericRepository<T extends BaseEntity> implements IGenericRepository<T> {
  protected repository: Repository<T>;

  constructor(context: RepositoryContext, entity: EntityTarget<T>) {
    this.repository = context.getRepository(entity);
  }

  async Create(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  async GetAll(): Promise<T[]> {
    return this.repository.find();
  }

  async GetById(id?: number): Promise<T | null> {
    return this.repository.findOne({ where: { id } as FindOptionsWhere<T> });
  }

  async Update(id: number, entity: T): Promise<T> {
    await this.repository.update(id, entity as QueryDeepPartialEntity<T>);
    return entity;
  }

  async Delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
