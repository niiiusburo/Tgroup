# REST API — Node.js + TypeScript + MongoDB

A small REST API example written in TypeScript using Express and Mongoose. It provides CRUD operations for a simple Task model and includes tests with Jest and an in-memory MongoDB for CI-friendly testing.

## Features

- TypeScript + Express
- Mongoose models with validation and timestamps
- CRUD endpoints for Tasks
- Tests using Jest and mongodb-memory-server
- Docker Compose setup included

## Quick start

Prerequisites

- Node.js (recommended: >= 18)
- npm
- MongoDB (or use the provided Docker Compose)

Install dependencies

```bash
npm install
```

Create a `.env` file in the project root (example below) and set your MongoDB connection string and optional port.

```env
# .env
MONGODB_URI=mongodb://localhost:27017/tasks-db
PORT=3000
```

Build

```bash
npm run build
```

Run (production)

```bash
npm start
```

Run in development (auto-rebuild + restart)

```bash
npm run dev
```

The `dev` script uses `dotenv-cli` and `tsc-watch` to rebuild and run `dist/index.js` when TypeScript files change.

## Docker

A `docker-compose.yml` is included in the repository. To start the app and a MongoDB service with Docker Compose:

```bash
docker-compose up --build
```

This will use the configuration in `docker-compose.yml`; adjust environment variables there if needed.

## Environment variables

- `MONGODB_URI` (required) — MongoDB connection string used by the app (example: `mongodb://mongo:27017/tasks-db`)
- `PORT` (optional) — HTTP port (defaults to `3000`)

The code reads `process.env.MONGODB_URI` and `process.env.PORT` in `src/db.ts` and `src/index.ts`.

## API

Base URL: `http://localhost:3000` (or the `PORT` you set)

Endpoints (implemented in `src/routes/tasks.ts`):

- GET /tasks

  - Query params (optional): `name`, `dueDateFrom`, `dueDateTo`
  - Response: `{ tasks: [ ... ] }`

- GET /tasks/:id

  - Response: `{ task: { ... } }` or 404 if not found

- POST /tasks

  - Body (JSON): `{ name: string, description?: string, dueDate?: string (ISO), completed?: boolean }
  - Response: 201 `{ task: { ... } }`

- PUT /tasks/:id

  - Body: same shape as POST
  - Response: `{ task: { ... } }` or 404 if not found

- DELETE /tasks/:id
  - Response: `{ message: "Task deleted successfully" }` or 404 if not found

Example: create a task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"Write README","description":"Add README for project","dueDate":"2025-01-01T00:00:00.000Z"}'
```

Example: get tasks

```bash
curl http://localhost:3000/tasks
```

Task model fields (from `src/models/Task.ts`)

- `name` (string, required)
- `description` (string, optional)
- `dueDate` (Date, optional)
- `completed` (boolean, default `false`)
- `createdAt`, `updatedAt` (timestamps)

## Tests

Run tests with:

```bash
npm test
```

The test setup uses `jest` and `mongodb-memory-server` so tests can run without an external MongoDB instance. See `tests/` for the test files and `tests/mongoSetup.ts` for in-memory server wiring.

## Project structure

- `src/` — TypeScript source files
  - `server.ts` — Express app wiring and middleware
  - `index.ts` — server start + DB connect
  - `db.ts` — MongoDB connection
  - `routes/` — Express routers (`tasks.ts`)
  - `models/` — Mongoose models (`Task.ts`)
  - `repositories/` — data-layer repository for tasks
  - `middleware/` — error handlers
- `tests/` — Jest tests
- `docker-compose.yml` — development Docker configuration
- `package.json` — scripts and dependencies

## Scripts (from `package.json`)

- `npm run build` — compile TypeScript
- `npm start` — run compiled code from `dist`
- `npm run dev` — development mode (uses `tsc-watch` + `dotenv`)
- `npm test` — run tests (Jest)
