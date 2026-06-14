# Node.js Clean Architecture Starter — TypeScript, Express 5, TypeORM 1, Docker

> **Production-ready boilerplate for building scalable REST APIs with Node.js, TypeScript, Clean Architecture, Dependency Injection (tsyringe), Unit of Work, Result Pattern (neverthrow), Docker, and CI/CD.**

[![CI](https://github.com/Z3r0J/nodejs-clean-architecture/actions/workflows/ci.yml/badge.svg)](https://github.com/Z3r0J/nodejs-clean-architecture/actions/workflows/ci.yml)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://docs.renovatebot.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000?logo=express)](https://expressjs.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-1.0-FE0902?logo=typeorm&logoColor=white)](https://typeorm.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, opinionated **TypeScript starter** for building Node.js REST APIs the right way. Heavy on patterns, light on ceremony. Use it as a template, fork it, or steal the parts you like.

**Keywords**: nodejs, typescript, express, typeorm, clean-architecture, ddd, dependency-injection, tsyringe, unit-of-work, result-pattern, neverthrow, docker, docker-compose, mysql, vitest, biome, pnpm, boilerplate, starter, template, rest-api.

---

## ✨ Features

- 🏛️ **Clean Architecture** — four concentric layers (domain → application → infrastructure → interfaces), dependencies always point inward.
- 💉 **Dependency Injection** with [tsyringe](https://github.com/microsoft/tsyringe) — bind by interface, swap implementations in tests, no manual `new` chains.
- 🔁 **Unit of Work** — multi-step operations wrapped in a single transaction, with typed access to transactional repositories.
- 🎯 **Result Pattern** with [neverthrow](https://github.com/supermacro/neverthrow) — explicit `Result<T, E>` / `ResultAsync` at the service boundary; no thrown control-flow.
- 🗃️ **TypeORM 1.0** — `DataSource` API, generic repository base, MySQL via `mysql2` driver, optional `better-sqlite3` for tests.
- 🐳 **Docker first-class** — multi-stage `Dockerfile` (slim runtime, non-root user, healthcheck) + `docker-compose.yml` for app + MySQL.
- 🛡️ **Validation** with [class-validator](https://github.com/typestack/class-validator) + a single `ValidationError` channel — controllers never `res.status(400)` inline.
- 🔐 **API Key middleware** — denies by default when `API_KEY` env is unset.
- 🧪 **Vitest** with in-memory SQLite repository integration tests + mocked service unit tests.
- 🤖 **GitHub Actions CI** + **Renovate** auto-merge for non-major bumps.
- ⚡ **tsx** runtime in dev (no rebuild loop), **tsc + tsc-alias** for production builds (smaller image, faster cold-start).
- 🎨 **Biome** as the single lint + format binary (no ESLint/Prettier sprawl).

---

## 📦 Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js 22 LTS | Active LTS through 2027 |
| Language | TypeScript 6 (`strict`) | Latest stable, full strictness |
| HTTP | Express 5 | Built-in async error catching |
| ORM | TypeORM 1.0 + mysql2 | Stable major, decorator-based entities |
| DI | tsyringe | Microsoft, decorators, fits the stack |
| Result | neverthrow | Type-safe, ~3KB, great ergonomics |
| Validation | class-validator | DTO decorators |
| Tests | Vitest + supertest | Fast, TS-native |
| Lint/format | Biome | One binary, no plugins |
| Pkg mgr | pnpm 10 | Fast, disk-efficient |
| Container | Docker + Compose | Multi-stage, slim, non-root |
| CI | GitHub Actions | Lint → typecheck → test |
| Deps bot | Renovate | Grouped weekly PRs, auto-merge |

---

## 🚀 Quick start

### Option A — Docker (recommended for first run)

```bash
git clone https://github.com/Z3r0J/nodejs-clean-architecture.git
cd nodejs-clean-architecture

# Optional: customise creds via a root .env file (compose picks it up)
cp src/.env.example .env

docker compose up --build
```

The API is up on `http://localhost:3000` with a fresh MySQL 8.4 next to it.

### Option B — Local development with tsx

```bash
git clone https://github.com/Z3r0J/nodejs-clean-architecture.git
cd nodejs-clean-architecture

# Install pnpm via corepack (already pinned in package.json)
corepack enable

pnpm install
cp src/.env.example src/.env   # then edit src/.env with your DB creds
pnpm dev
```

> **Just need the DB locally?** `docker compose up db -d` starts only MySQL on `localhost:3306` — point `src/.env` at it and run `pnpm dev`.

---

## 📁 Project layout

```
src/
├── domain/                # entities (TypeORM @Entity)
├── application/
│   ├── dtos/              # request DTOs (class-validator) + response DTOs
│   ├── helpers/           # logger, DB config, EventId
│   ├── interfaces/        # IRepository, IServices, IUnitOfWork, ILogger
│   └── services/          # business logic, returns Result/ResultAsync
├── infrastructure/
│   ├── repositories/      # TypeORM repos (decoupled from singleton)
│   ├── UnitOfWork.ts      # transactional repo factory
│   └── typeorm.config.ts  # AppDataSource (the only singleton site)
├── container/             # tsyringe tokens + buildContainer()
├── interfaces/
│   ├── controllers/       # @injectable, return DTOs, no try/catch
│   │   └── helpers/       # respond(res, result), parseId
│   ├── middlewares/       # api-key, error handler (safety net)
│   └── routes/            # route factories: buildXRoute(container)
├── error-handling/        # CustomError + NotFound/BadRequest/Validation
├── config/                # ExpressConfig
└── index.ts               # bootstrap: dotenv → DataSource → container → server

tests/                     # vitest suite
.github/workflows/ci.yml   # lint + typecheck + test
Dockerfile                 # multi-stage slim runtime
docker-compose.yml         # app + MySQL
renovate.json              # weekly bot
biome.json                 # lint + format
```

---

## 🛠️ Common commands

```bash
pnpm dev          # tsx watch mode
pnpm start        # tsx one-shot (dev runtime)
pnpm build        # tsc → JavaScript + tsc-alias (path-alias rewrite) → ./build
pnpm start:prod   # node build/index.js (what runs inside Docker)
pnpm test         # vitest run
pnpm test:watch   # vitest watch
pnpm lint         # biome check
pnpm format       # biome format --write
pnpm check        # biome check --write (lint + format auto-fix)
pnpm typecheck    # tsc --noEmit (strict)
pnpm typeorm -- migration:generate ...   # TypeORM CLI passthrough
```

---

## 🐳 Docker

The `Dockerfile` is a 5-stage multi-stage build:

1. `base` — pinned `node:22-slim` + Corepack-managed pnpm.
2. `deps` — installs the full dep graph (cached via BuildKit mount).
3. `build` — `tsc` + `tsc-alias` to `./build`.
4. `prod-deps` — fresh install of **production** deps only.
5. `runner` — copies `build/` + prod `node_modules` onto a non-root `nodejs` user. Includes a `HEALTHCHECK` that hits `/`.

Build manually:

```bash
docker build -t nodejs-clean-architecture .
docker run --rm -p 3000:3000 --env-file .env nodejs-clean-architecture
```

Multi-arch (Apple Silicon + Linux x86):

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t you/nodejs-clean-architecture --push .
```

---

## 🧩 Architecture patterns

### Dependency Injection (tsyringe)

```ts
// src/container/index.ts
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
```

- Tokens are `Symbol("Name") as InjectionToken<T>` — type-safe, collision-free.
- Bind **interfaces**, not classes — swap implementations in tests by registering a different value against the same token.
- Child container per app (and per test) keeps bindings isolated from the global `container`.

### Unit of Work (atomic multi-step)

```ts
async createIfUnique(name: string): ResultAsync<Test, BadRequestError> {
  return ResultAsync.fromPromise(
    this.uow.run(async (repos) => {
      if (await repos.test.findByName(name)) {
        throw new BadRequestError(`Test "${name}" already exists`);
      }
      return repos.test.Create(new Test({ name }));
    }),
    (e) => (e instanceof BadRequestError ? e : new BadRequestError(String(e)))
  );
}
```

- One `uow.run` ⇒ one `START TRANSACTION` / `COMMIT` round-trip.
- Repositories inside the callback share the same transactional `EntityManager`.
- A thrown `BadRequestError` rolls back; the `ResultAsync` wraps it back into a typed `Err`.

### Result pattern at the controller boundary

```ts
getAll = (_req: Request, res: Response) =>
  respond(
    res,
    ResultAsync.fromSafePromise(this._testServices.GetAll()).andThen((rows) =>
      rows.length === 0 ? errAsync(new NotFoundError("No data")) : okAsync(rows)
    ),
    { map: TestResponseDTO.fromEntities }
  );
```

- Every handler is a single pipeline that terminates at `respond(res, ...)`.
- `respond` does the `.match`: success → `res.status(...).json(map(value))`, failure → `res.status(err.statusCode).json({ message })` (or `{ errors }` for `ValidationError`).
- The `ErrorHandler` middleware is the safety net for genuinely uncaught exceptions only.

---

## 🤝 Contributing

PRs welcome. The CI gate is `lint → typecheck → test`; all green before review.

```bash
pnpm install
pnpm check        # auto-fix lint/format
pnpm typecheck
pnpm test
```

Renovate handles routine dep bumps. For major bumps, open a PR manually.

---

## 📚 Adding a new resource

There's a 10-step recipe in [`CLAUDE.md`](./CLAUDE.md) that walks through:
entity → DTOs → repository (with `findByX`) → service (with business logic + UoW) → token + container binding → `@injectable` controller → route factory → tests.

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

## 🙋 FAQ

**Q: Is this overkill for a small API?**
Probably. The patterns shine when you outgrow a single file but want to keep the surface manageable. If you're just doing a CRUD prototype, you don't need DI containers and UoW — use Express + a single route file.

**Q: Why tsyringe and not Inversify?**
Smaller API, lighter footprint, Microsoft-maintained. Inversify is more powerful (scopes, decorators, middleware) but the surface is bigger than this template needs.

**Q: Why neverthrow and not just throw?**
Two reasons: known business outcomes become part of the type signature, and controllers stop being littered with `try { ... } catch (e) { next(e); }`. The `ErrorHandler` middleware is still there for genuine bugs.

**Q: Can I use Postgres / SQLite / SQL Server?**
Yes — set `DB_TYPE` in env. TypeORM picks the right driver. Add the driver package (`pg`, `better-sqlite3`, `mssql`).

**Q: Why Express 5, not Fastify / Hono / Elysia?**
Express 5 is now stable, ubiquitous, and the path of least resistance for most teams. Fastify is a great swap if you need raw throughput — only the `src/interfaces/` layer would change.

---

## 🌟 Star history

If this template saved you time, a star is the easiest way to say thanks and helps others find it.

##### Made with ❤️ by [Jean Carlos Reyes](https://github.com/Z3r0J)
