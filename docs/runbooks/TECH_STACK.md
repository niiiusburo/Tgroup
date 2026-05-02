# TECH_STACK.md

> Operational stack reference for TGClinic.

## Packages

| Area | Path | Stack |
|---|---|---|
| Root | `package.json` | Private workspace utilities, Husky prepare script |
| Frontend | `website/` | React 18, Vite 5, TypeScript 5, Tailwind 3 |
| API | `api/` | Node.js, Express 5, CommonJS, pg, JWT |
| Contracts | `contracts/` | TypeScript, Zod, generated `dist/` for local package use |

## Frontend

- React Router DOM 6 for routing.
- React Context and hooks for auth, location, timezone, and UI state.
- `website/src/lib/api/` is the frontend API boundary.
- `website/src/i18n/` owns English and Vietnamese UI copy.
- Vitest and Testing Library cover unit/component behavior.
- Playwright covers end-to-end flows.

## Backend

- `api/src/server.js` mounts Express routes and public paths.
- `api/src/db.js` owns the shared PostgreSQL pool.
- Route modules in `api/src/routes/` perform most domain work today.
- Auth and permission checks live under `api/src/middleware/`.
- Tests live under `api/tests/` and route-local `__tests__/` folders.

## Contracts

Use `contracts/` when a shared API shape should be validated by both frontend and backend. Build it with:

```bash
npm --prefix contracts install
npm --prefix contracts run build
```

Do not add a shared contract only to avoid thinking through domain ownership. Contracts are useful when multiple runtime surfaces consume the same shape.
