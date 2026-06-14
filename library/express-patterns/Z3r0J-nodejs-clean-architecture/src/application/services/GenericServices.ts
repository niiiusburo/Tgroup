import type { BaseEntity } from "@entities/BaseEntity";
import type { IGenericRepository } from "@interfaces/repositories/IGenericRepository";
import type { IGenericServices } from "@interfaces/services/IGenericServices";

export abstract class GenericServices<Entity extends BaseEntity>
  implements IGenericServices<Entity>
{
  constructor(protected repository: IGenericRepository<Entity>) {}

  Create(entity: Entity): Promise<Entity> {
    return this.repository.Create(entity);
  }
  GetAll(): Promise<Entity[]> {
    return this.repository.GetAll();
  }
  GetById(id?: number): Promise<Entity | null> {
    return this.repository.GetById(id);
  }
  Update(id: number, entity: Entity): Promise<Entity> {
    return this.repository.Update(id, entity);
  }
  Delete(id: number): Promise<void> {
    return this.repository.Delete(id);
  }
}
