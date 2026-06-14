import type { IUnitOfWork } from "@interfaces/common/IUnitOfWork";
import type { ITestRepository } from "@interfaces/repositories/ITestRepository";
import type { ITestServices } from "@interfaces/services/ITestServices";
import type { InjectionToken } from "tsyringe";
import type { DataSource } from "typeorm";

/**
 * DI tokens for tsyringe registrations.
 *
 * Why `Symbol` cast to `InjectionToken<T>`:
 *  - Symbols are guaranteed-unique references, so two files importing the
 *    same token always agree on identity (no risk of string collisions).
 *  - The `as InjectionToken<T>` cast carries the interface type, so
 *    `@inject(TOKENS.TestRepository)` resolves as `ITestRepository`, not
 *    `unknown`.
 *
 * Pattern: bind **interfaces**, not concrete classes. Consumers depend on
 * `ITestRepository`, the container decides which implementation answers.
 * To swap an implementation in tests, build a fresh container and register
 * a different value/class against the same token.
 */
export const TOKENS = {
  DataSource: Symbol("DataSource") as InjectionToken<DataSource>,
  UnitOfWork: Symbol("UnitOfWork") as InjectionToken<IUnitOfWork>,
  TestRepository: Symbol("TestRepository") as InjectionToken<ITestRepository>,
  TestServices: Symbol("TestServices") as InjectionToken<ITestServices>,
} as const;
