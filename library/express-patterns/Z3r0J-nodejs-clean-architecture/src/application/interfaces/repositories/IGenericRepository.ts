export interface IGenericRepository<T> {
  Create(entity: T): Promise<T>;
  GetAll(): Promise<T[]>;
  GetById(id?: number): Promise<T | null>;
  Update(id: number, entity: T): Promise<T>;
  Delete(id: number): Promise<void>;
}
