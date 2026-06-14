# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — runs `tsx watch src/index.ts`. Re-executes on file changes. Use this during development.
- `pnpm start` — one-shot `tsx src/index.ts`. No build step; `tsx` (esbuild) handles TS + path aliases.
- `pnpm typecheck` — `tsc --noEmit` against `strict: true`.
- `pnpm lint` — `biome check .` (Biome is the single tool for both lint and format).
- `pnpm format` / `pnpm check` — Biome write modes (format-only / format+lint+fix).
- `pnpm test` — `vitest run` (smoke suite in `tests/`, DB-free).
- `pnpm test:watch` — `vitest` watch mode.
- `pnpm typeorm -- <args>` — TypeORM CLI via `typeorm-ts-node-commonjs`. Schema is auto-synced from entities (`synchronize: true`) at startup; only reach for the CLI for migration scaffolding if you flip that off.

## Environment

- Env loaded from **`src/.env`** (not repo root) via `dotenv` — the load runs at the top of `src/index.ts` **before** any other import, so module-scope code can read `process.env` safely.
- Template: `src/.env.example`. Required: `PORT`, `API_KEY`, and the `DB_*` group (`DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`).
- DB config is built in `src/application/helpers/databaseConfiguration.ts` — reads env with sane defaults, validates `DB_TYPE` against the TypeORM-supported set.

## Tooling

- **Package manager**: pnpm 10 (`packageManager` field in `package.json`). Lockfile is `pnpm-lock.yaml`.
- **Node**: 20 LTS minimum, 22 LTS pinned via `.nvmrc`. Enforced by `engines.node`.
- **Runtime**: `tsx` (esbuild). Resolves `tsconfig.json` path aliases natively — no `tsconfig-paths` runtime dep needed.
- **Lint / format**: `@biomejs/biome`, config in `biome.json`.
- **Tests**: Vitest with `vite-tsconfig-paths` for alias resolution. Smoke tests only — no DB integration tests in repo.
- **CI**: `.github/workflows/ci.yml` runs `lint → typecheck → test` on push/PR to `main`. Cancels superseded runs via concurrency group.
- **Dependency bot**: `renovate.json`. Groups non-major bumps into a weekly PR, auto-merges patch/minor/devDeps when CI is green, majors are separate and manual. Requires the Renovate GitHub App installed on the repo.

## Architecture

Clean Architecture in four concentric layers. Dependencies always point inward.

```
domain  ←  application  ←  infrastructure
                        ←  interfaces (HTTP)
```

- **`src/domain/entities/`** — TypeORM entities. `BaseEntity` defines `id`, `createdAt`, `updatedAt`; concrete entities extend it and add `@Column()` fields. Entity constructors take a partial of themselves and `Object.assign` — used to hydrate from DTOs.
- **`src/application/`** — business layer, framework-agnostic.
  - `interfaces/repositories/IGenericRepository.ts` and `interfaces/services/IGenericServices.ts` define CRUD contracts. `GetById` returns `T | null` — callers must null-check.
  - `interfaces/common/IUnitOfWork.ts` — `run<T>(work: (repos) => Promise<T>)`. Use this when an operation must read **and** write atomically (see `TestServices.createIfUnique` for the canonical example).
  - `services/GenericServices.ts` is an abstract base service that delegates to an `IGenericRepository`. Concrete services (`TestServices`) extend it; add custom methods (business rules, multi-step ops, transactions) on the subclass.
  - `dtos/` — request DTOs (`class-validator`-decorated, e.g. `createTestDTO.ts`) and response DTOs (`testResponseDTO.ts` with `static fromEntity(...)`). Controllers always return a response DTO, never a raw entity.
  - `helpers/logger.ts` + `interfaces/common/ILogger.ts` — custom logger emulating C# `ILogger<T>`. Backed by `picocolors`. Instantiate per class: `_logger: ILogger<MyClass> = new Logger<MyClass>()`.
- **`src/infrastructure/`** — concrete data access.
  - `typeorm.config.ts` exports `AppDataSource`. Every new entity must be added to its `entities: [...]` array. **This is the only file that names the singleton** — application code receives the `DataSource` via DI.
  - `repositories/GenericRepository.ts` — abstract base. Constructor takes a `RepositoryContext` (`DataSource | EntityManager`), so the same class works both for the default DI path and inside a transactional `EntityManager` from the UoW.
  - `UnitOfWork.ts` — `TypeORMUnitOfWork` wraps `dataSource.transaction(...)` and exposes transactional repositories via the `TxRepositories` shape declared in `IUnitOfWork`.
  - DB driver is `mysql2` (TypeORM auto-selects when `type: "mysql"`). Tests use `better-sqlite3` in-memory.
- **`src/container/`** — DI container (**tsyringe**).
  - `tokens.ts` — `Symbol`-backed `InjectionToken<T>` for each interface (`DataSource`, `UnitOfWork`, `TestRepository`, `TestServices`).
  - `index.ts` — `buildContainer(dataSource)` returns a child container with all bindings. Singletons for `UnitOfWork` and services; `TestRepository` is a `useFactory` so the DataSource is wired in once at resolve time.
- **`src/interfaces/`** — HTTP edge (Express 5).
  - `routes/*.route.ts` exports a **factory** (`buildTestRoute(container)`) — no module-scope `new`. The factory resolves the controller from the container and wires routes.
  - `controllers/` are `@injectable()`, receive services via `@inject(TOKENS.XService)`, validate DTOs with `class-validator`, return response DTOs, and forward errors to `next(error)`.
  - `middlewares/apikey.middleware.ts` checks `x-api-key` against `process.env.API_KEY`. **Denies by default if `API_KEY` is unset.**
  - `middlewares/error.handler.middleware.ts` must be `app.use`'d **after** all routes.
- **`src/config/express.config.ts`** — `ExpressConfig.init(container)` mounts middleware, the route factories, and the error handler. Bootstrapped from `src/index.ts` after `AppDataSource.initialize()`.
- **`src/error-handling/`** — `CustomError` (base, has `statusCode`), `NotFoundError`, `BadRequestError`. Throw these from controllers/services; the error middleware handles the response.

## Path aliases

`tsconfig.json` defines path aliases — `tsx` resolves them at runtime, `vite-tsconfig-paths` resolves them in tests. Always import via aliases, not relative paths:

```
@controllers/*, @services/*, @entities/*, @repositories/*,
@middlewares/*, @routes/*, @helpers/*, @dtos/*,
@interfaces/services/*, @interfaces/repositories/*, @interfaces/common/*,
@error-custom/*, @typeorm-config, @express-config,
@container/*, @unit-of-work
```

## Adding a new resource (recipe)

1. **Entity** in `src/domain/entities/`, extending `BaseEntity`. Register it in `AppDataSource.entities` (`src/infrastructure/typeorm.config.ts`).
2. **DTOs** in `src/application/dtos/` — a request DTO with `class-validator` decorators, plus a response DTO with `static fromEntity(...)`.
3. **Repository interface + impl**: `application/interfaces/repositories/IXRepository.ts` extends `IGenericRepository<X>` and adds custom finders (e.g. `findByName`). Concrete class in `infrastructure/repositories/XRepository.ts` extends `GenericRepository<X>` and takes a `RepositoryContext` in the constructor.
4. **Service interface + impl**: `application/interfaces/services/IXServices.ts` extends `IGenericServices<X>` and adds business operations. Concrete class in `application/services/XServices.ts` is `@injectable()`, extends `GenericServices<X>`, and injects `TOKENS.XRepository` + `TOKENS.UnitOfWork`. Use `uow.run(repos => ...)` for any multi-step / read-then-write operation.
5. **Tokens**: add `XRepository` and `XServices` symbols to `src/container/tokens.ts`.
6. **Container**: register them in `src/container/index.ts` (factory for the repo, singleton for the service).
7. **UoW**: extend `TxRepositories` in `IUnitOfWork.ts` with `x: IXRepository` and the `TypeORMUnitOfWork.run` factory with `x: new XRepository(manager)`.
8. **Controller** in `interfaces/controllers/` — `@injectable()`, `@inject(TOKENS.XServices)`, always returns response DTOs (`XResponseDTO.fromEntity(...)`).
9. **Route factory** in `interfaces/routes/x.route.ts` — `buildXRoute(container)` resolves the controller and defines routes. Mount it in `ExpressConfig.init`.
10. **Tests**: a unit test under `tests/` mocking the repository for service behavior, plus an integration test using an in-memory `better-sqlite3` `DataSource` for repository behavior.
