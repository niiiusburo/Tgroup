# Express / API Service-Layer Patterns — Reference Library

> For TGClinic (React + Express + PostgreSQL, CommonJS, Express 5, raw `pg`).
> Goal: refactor large route files with inline SQL into controllers/services/repositories,
> standardize middleware, transactions, error responses, OpenAPI contracts, and background jobs.

---

## 1. Repositories Downloaded

| # | Repository | License | Why It Matters |
|---|---|---|---|
| 1 | `cdimascio-express-openapi-validator` | MIT | **OpenAPI contract-driven validation** — mounts `express-openapi-validator` middleware to auto-validate requests/responses against an OpenAPI 3.x spec. Shows how to serve the spec, wire validation, and format errors. |
| 2 | `anthonyhastings-nodejs-background-worker` | MIT | **BullMQ background jobs** — producer (Express API enqueues), separate worker processes, rate-limiting middleware, bull-board dashboard, exponential backoff, job progress logging. |
| 3 | `yazaldefilimone-clean-arch-express-starter` | MIT | **Clean Architecture starter** — thin controllers, use-cases (services), repository interfaces + implementations, custom domain errors (`AlreadyExistsError`, `NotFoundError`, `InvalidParamError`), `Either` result type. |
| 4 | `Z3r0J-nodejs-clean-architecture` | MIT | **UnitOfWork + GenericRepository** — `TypeORMUnitOfWork` wraps transactions, `GenericRepository` abstracts CRUD, custom error hierarchy (`CustomError`, `ValidationError`), centralized `ErrorHandler` middleware. |
| 5 | `restuwahyu13-express-rest-api-clean-architecture` | MIT | **Full layered Express + TypeORM** — controllers → services → repositories, DTOs, DI containers, `apiResponse` helper, `validator` middleware (class-validator), `permission` middleware (JWT + RBAC), `authorization` middleware. |
| 6 | `panagiop-nodejs-clean-architecture` | MIT | **Clean Architecture (JS)** — adapters/controllers, application services, use-cases, framework middleware (`errorHandlingMiddleware`, `authMiddleware`). Good JS reference without TypeScript. |
| 7 | `kunalkapadia-express-mongoose-es6-rest-api` | MIT | **Classic Express REST API** — `APIError` extendable error class, JWT auth controller, route guards, thin controller pattern. Good baseline for CommonJS/Express 5. |

---

## 2. Specific Patterns to Adopt

### 2.1 Service-Layer Extraction
**From:** `restuwahyu13` and `yazaldefilimone`

- Controllers should be **thin**: parse `req`/`res`, call services, return JSON.
- Services contain **business logic**: validation rules, orchestration, no `req`/`res`.
- Repositories contain **data access**: raw SQL or ORM queries, no business logic.

**Example (restuwahyu13):**
```ts
// Controller — thin
class ControllerUsers extends ServiceUsers {
  async registerUsersController(req, res) {
    const serviceResponse = await super.registerUsersService(req);
    return res.status(serviceResponse.stat_code).json(serviceResponse);
  }
}

// Service — business logic
class ServiceUsers extends Model {
  async registerUsersService(req) {
    const checkUserEmail = await super.model().users.findOne({ email: req.body.email });
    if (checkUserEmail) throw apiResponse(400, `Email already taken`);
    // ... create user
    return apiResponse(200, 'Create new account success');
  }
}
```

**TGClinic adaptation:**
- Extract inline SQL from `api/src/routes/*.js` into `api/src/repositories/<domain>.js`.
- Each repository receives `db` (from `getDb('dental'|'cosmetic')`) as a constructor arg or factory param.
- Services live in `api/src/services/<domain>.js` and call repositories.
- Controllers live in `api/src/controllers/<domain>.js` and are mounted by routes.

---

### 2.2 Repository Pattern
**From:** `Z3r0J` (`GenericRepository.ts`) and `yazaldefilimone`

- Abstract base repository with CRUD: `create`, `findById`, `findAll`, `update`, `delete`.
- Domain-specific repositories extend the generic one and add intent-based methods (e.g., `findByEmail`, `findActiveByCustomerId`).
- Repository methods accept `db` (pool/client) so the same repository can run inside or outside a transaction.

**Example (Z3r0J):**
```ts
export abstract class GenericRepository<T> {
  protected repository: Repository<T>;
  constructor(context: RepositoryContext, entity: EntityTarget<T>) {
    this.repository = context.getRepository(entity);
  }
  async Create(entity: T): Promise<T> { return this.repository.save(entity); }
  async GetById(id?: number): Promise<T | null> { return this.repository.findOne({ where: { id } }); }
  // ...
}
```

**TGClinic adaptation (CommonJS, raw `pg`):**
```js
// repositories/userRepository.js
function createUserRepository(db) {
  return {
    async findByEmail(email) {
      const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      return rows[0] || null;
    },
    async create(user) {
      const { rows } = await db.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
        [user.email, user.password]
      );
      return rows[0];
    },
  };
}
module.exports = { createUserRepository };
```

---

### 2.3 Transaction Wrapper / Unit-of-Work
**From:** `Z3r0J` (`UnitOfWork.ts`)

- Wrap multi-step operations in a single transaction.
- Pass a `work` function that receives repositories backed by the same `EntityManager` (or `pg` client).
- If any step throws, the entire transaction rolls back.

**Example (Z3r0J):**
```ts
export class TypeORMUnitOfWork implements IUnitOfWork {
  async run<T>(work: (repos: TxRepositories) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const repos: TxRepositories = { test: new TestRepository(manager) };
      return work(repos);
    });
  }
}
```

**TGClinic adaptation (raw `pg`):**
```js
// db/transaction.js
const { getDb } = require('./index');

async function withTransaction(dbName, work) {
  const db = getDb(dbName);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
module.exports = { withTransaction };
```

---

### 2.4 Error Middleware & Standardized API Responses
**From:** `restuwahyu13` (`helper.apiResponse.ts`, `helper.error.ts`), `Z3r0J` (`error.handler.middleware.ts`), `kunalkapadia` (`APIError.js`)

- **Custom error classes** with `statusCode` and `message`.
- **Centralized error handler** at the end of Express middleware stack.
- **Consistent JSON shape** for all API errors.

**Example (restuwahyu13):**
```ts
export const apiResponse = (code, message, data?, pagination?): APIResponse => ({
  stat_code: code,
  stat_message: message,
  data,
  pagination,
});
```

**Example (Z3r0J centralized handler):**
```ts
export const ErrorHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ errors: err.details });
  }
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error("[ErrorHandler] uncaught", err);
  return res.status(500).json({ message: "Internal server error" });
};
```

**Example (kunalkapadia — extendable error):**
```js
class APIError extends ExtendableError {
  constructor(message, status = httpStatus.INTERNAL_SERVER_ERROR, isPublic = false) {
    super(message, status, isPublic);
  }
}
```

**TGClinic adaptation:**
```js
// middleware/error.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }
  console.error('[ErrorHandler] uncaught', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
module.exports = { AppError, errorHandler };
```

> This matches the `ApiError` shape already consumed by the frontend (`website/src/lib/api/core.ts` lines 130–190).

---

### 2.5 Middleware Patterns (Auth, Validation, Permission)
**From:** `restuwahyu13` (`middleware.authorization.ts`, `middleware.permission.ts`, `middleware.validator.ts`), `panagiop` (`authMiddleware.js`)

- **Auth middleware**: verify JWT, attach user to `req.session` or `req.user`.
- **Permission middleware**: check `req.user.role` against allowed roles array.
- **Validation middleware**: use `class-validator` + `class-transformer` to validate `req.body`/`req.params`/`req.query` against a DTO class.

**Example (restuwahyu13 permission middleware):**
```ts
export const permission = (roles: string[]): Handler => {
  return async (req, res, next) => {
    const decodedToken = await verifyToken(accessToken);
    const checkRoleAccess = await repository.model().roles.findOne({ id: decodedToken['role_id'] });
    if (!roles.includes(checkRoleAccess.name)) throw apiResponse(401, 'Your role is not allowed');
    next();
  };
};
```

**TGClinic adaptation:**
- Keep existing `api/src/middleware/auth.js` logic but extract JWT verify + user fetch into a standalone `authenticate` middleware.
- Add `authorize(roles)` middleware that reads `req.user` and checks against the permission system already in place.
- Add `validate(dtoSchema)` middleware using a lightweight validator (Joi or Zod) to avoid `class-validator` dependency in CommonJS.

---

### 2.6 OpenAPI / Contract-Driven API Design
**From:** `cdimascio-express-openapi-validator`

- Write `openapi/api.yaml` as the single source of truth.
- Mount `express-openapi-validator` middleware to auto-validate requests and responses.
- Serve Swagger UI from the same spec.
- Use `openapi-diff` in CI to detect breaking changes.

**Example (cdimascio):**
```js
const OpenApiValidator = require('express-openapi-validator');
app.use(OpenApiValidator.middleware({ apiSpec: './openapi/api.yaml', validateResponses: true }));
```

**TGClinic adaptation:**
- Start with one domain (e.g., `Payments`) and write `openapi/payments.yaml`.
- Run `express-openapi-validator` in staging with `validateResponses: true`.
- Do NOT enforce in production initially — let the frontend `ApiError` parser (already handling multiple error shapes) absorb any mismatches during migration.

---

### 2.7 Background Job Patterns (Async Processing)
**From:** `anthonyhastings-nodejs-background-worker`

- **Producer**: Express route enqueues job to BullMQ queue, returns 202 immediately.
- **Worker**: Separate Node process consumes jobs, handles retries, progress, logging.
- **Dashboard**: `bull-board` mounted at `/admin/queues` for monitoring.
- **Rate limiting**: `Worker.rateLimit()` pauses queue when downstream API returns 429.

**Example (anthonyhastings — producer):**
```js
const job = await standardQueue.add('example job', data, {
  attempts: 10,
  backoff: { type: 'exponential', delay: 1000 },
});
res.status(202).json({ jobId: job.id });
```

**Example (anthonyhastings — worker):**
```js
const standardQueueWorker = new Worker('standard-queue', processingFunc, {
  connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
});
standardQueueWorker.on('completed', (job, returnValue) => {
  logger.info(`Job ${job.id} completed.`, returnValue);
});
```

**TGClinic adaptation:**
- Use BullMQ for: payment receipt generation, commission calculation, end-of-day reports, email notifications.
- Keep workers in a separate file (`workers/<queue>.js`) or Docker container.
- Mount `bull-board` under `/admin/queues` with the existing auth middleware.

---

## 3. Recommendations for Refactoring TGClinic Route Files

### Current state
- `api/src/routes/` has many large route files with inline SQL.
- `api/src/db/index.js` provides a dual-pool factory (`getDb('dental'|'cosmetic')`).
- `api/src/middleware/auth.js` handles JWT + permission checks.

### Step-by-step migration (no breaking contracts)

1. **Create repository layer** (`api/src/repositories/<domain>.js`)
   - Extract inline SQL from route files into repository functions.
   - Each function accepts `db` (pool or client) as first argument.
   - Keep the exact same SQL to avoid data model changes.

2. **Create service layer** (`api/src/services/<domain>.js`)
   - Move business logic (validation, calculations, permission checks) from routes into services.
   - Services call repositories and throw `AppError` on failures.
   - Services are framework-agnostic: no `req`/`res`.

3. **Create controller layer** (`api/src/controllers/<domain>.js`)
   - Thin wrappers: extract params/body from `req`, call service, return JSON.
   - Controllers catch `AppError` and pass to `next(err)` for the centralized handler.
   - Keep route URLs and response shapes identical to the current frontend contract.

4. **Add transaction wrapper** (`api/src/db/transaction.js`)
   - Use `withTransaction(dbName, work)` for multi-step operations (payments, commissions).
   - Pass the `client` from the transaction into repositories so all queries share the same transaction.

5. **Centralize error handling** (`api/src/middleware/error.js`)
   - Replace ad-hoc `res.status(500).json({ error: '...' })` with `next(new AppError(...))`.
   - Ensure the JSON shape matches what the frontend `ApiError` parser expects:
     ```json
     { "error": { "code": "...", "message": "...", "field?": "..." } }
     ```

6. **Add validation middleware** (`api/src/middleware/validate.js`)
   - Use a lightweight schema validator (Joi or Zod) to validate `req.body` before it reaches the controller.
   - Return 400 with the same `error` shape on validation failures.

7. **Introduce OpenAPI gradually**
   - Write `openapi/<domain>.yaml` for new or heavily refactored domains.
   - Run `express-openapi-validator` in staging/dev only.
   - Once stable, serve Swagger UI at `/api/docs`.

8. **Add background jobs for heavy operations**
   - Identify slow endpoints (report generation, bulk imports, commission recalculation).
   - Enqueue jobs instead of blocking the HTTP request.
   - Return 202 with a `jobId` that the frontend can poll.

### Migration order (lowest risk first)
1. **Error middleware** — global, no route changes.
2. **Repository extraction** — internal refactor, no API contract changes.
3. **Service extraction** — internal refactor, no API contract changes.
4. **Controller thinning** — internal refactor, no API contract changes.
5. **Validation middleware** — additive, only improves 400 responses.
6. **Transaction wrapper** — use for new multi-step features first.
7. **OpenAPI** — start with one new domain or a read-only domain.
8. **Background jobs** — new endpoints only (e.g., `/reports/generate`).

---

## 4. Key Files to Study

### cdimascio-express-openapi-validator
- `examples/1-standard/app.js` — how to wire OpenAPI validator into Express.
- `src/middlewares/openapi.security.ts` — security scheme handlers.
- `examples/1-standard/services/index.js` — thin service class pattern.

### anthonyhastings-nodejs-background-worker
- `src/service.mjs` — Express producer, bull-board dashboard, rate-limiting middleware.
- `src/worker-standard.mjs` — standard BullMQ worker with progress updates.
- `src/worker-rate-limited.mjs` — rate-limited worker with `Worker.rateLimit()`.
- `src/rate-limiter.mjs` — simple in-memory rate-limiting middleware.

### yazaldefilimone-clean-arch-express-starter
- `src/infrastructure/controllers/user/sign-user-controller.ts` — thin controller, `Either` result handling.
- `src/infrastructure/repositories/user/user-repository.ts` — repository interface + implementation.
- `src/domain/errors/*.ts` — custom domain errors (`AlreadyExistsError`, `NotFoundError`, etc.).
- `src/domain/user/use-cases/sign-user-usecase.ts` — pure business logic, no framework dependencies.

### Z3r0J-nodejs-clean-architecture
- `src/infrastructure/UnitOfWork.ts` — transaction wrapper pattern.
- `src/infrastructure/repositories/GenericRepository.ts` — generic CRUD base.
- `src/interfaces/middlewares/error.handler.middleware.ts` — centralized error handler.
- `src/error-handling/CustomError.ts` — base custom error class.
- `src/application/services/GenericServices.ts` — service base delegating to repository.

### restuwahyu13-express-rest-api-clean-architecture
- `src/helpers/helper.apiResponse.ts` — standardized API response helper.
- `src/helpers/helper.error.ts` — custom `ExpressError` base class.
- `src/middlewares/middleware.validator.ts` — class-validator + class-transformer validation middleware.
- `src/middlewares/middleware.authorization.ts` — JWT auth middleware.
- `src/middlewares/middleware.permission.ts` — RBAC permission middleware.
- `src/controllers/controller.users.ts` — thin controller calling service.
- `src/services/service.users.ts` — service with business logic and repository calls.

### panagiop-nodejs-clean-architecture
- `frameworks/webserver/middlewares/errorHandlingMiddleware.js` — simple centralized error handler (JS).
- `frameworks/webserver/middlewares/authMiddleware.js` — JWT auth middleware (JS).
- `adapters/controllers/authController.js` — adapter pattern for controllers.
- `application/services/authService.js` — application-layer service.

### kunalkapadia-express-mongoose-es6-rest-api
- `server/helpers/APIError.js` — extendable error class with `status`, `isPublic`, `isOperational`.
- `server/auth/auth.controller.js` — thin JWT auth controller.
- `server/auth/auth.route.js` — route mounting pattern.

---

## 5. License Summary

All downloaded repositories are **MIT licensed** and safe for study, adaptation, and pattern reuse in TGClinic.
