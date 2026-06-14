import { TOKENS } from "@container/tokens";
import { TestRepository } from "@repositories/TestRepository";
import { TestServices } from "@services/TestServices";
import { TypeORMUnitOfWork } from "@unit-of-work";
import { container, type DependencyContainer, instancePerContainerCachingFactory } from "tsyringe";
import type { DataSource } from "typeorm";

/**
 * Builds a child container with all application bindings.
 *
 * - **`DataSource`**: `useValue` — the already-initialised TypeORM connection
 *   handed in by the bootstrap. Single instance, shared everywhere.
 * - **`TestRepository`**: `useFactory` + `Transient` — a new instance per
 *   resolve. The repository is cheap to build and the UoW also constructs
 *   transactional instances on demand, so caching has no value here.
 * - **`UnitOfWork`**: `useFactory` + `Singleton` — explicit dependency on
 *   `DataSource` is visible at the registration site (no need to follow
 *   `@inject` decorators to understand wiring).
 * - **`TestServices`**: `Singleton` via `registerSingleton` — stateless,
 *   safe to share. tsyringe resolves the `@inject`-decorated constructor.
 *
 * The container is a **child of the global tsyringe container**, so it is
 * isolated from any other code that might `import { container }` — useful
 * for tests, which can build their own container with mock bindings.
 */
export const buildContainer = (dataSource: DataSource): DependencyContainer => {
  const c = container.createChildContainer();

  c.register(TOKENS.DataSource, { useValue: dataSource });

  c.register(TOKENS.TestRepository, {
    useFactory: (dep) => new TestRepository(dep.resolve(TOKENS.DataSource)),
  });

  c.register(TOKENS.UnitOfWork, {
    useFactory: instancePerContainerCachingFactory(
      (dep) => new TypeORMUnitOfWork(dep.resolve(TOKENS.DataSource))
    ),
  });

  c.registerSingleton(TOKENS.TestServices, TestServices);

  return c;
};
