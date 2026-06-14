# Testing Patterns Reference Library

> Battle-tested open-source repositories for E2E, integration, contract, and visual regression testing.
> Curated for TGClinic (React + Express + PostgreSQL) — covers Playwright, Supertest/Jest, Pact, and test data factories.

---

## Table of Contents

1. [Repository Index](#repository-index)
2. [Playwright E2E Best Practices](#1-playwright-e2e-best-practices--checklyplaywright-examples)
3. [API Integration Testing](#2-api-integration-testing--alexrusinrest-api-nodejs-mongo)
4. [Contract Testing](#3-contract-testing--pact-foundationpact-workshop-js)
5. [Test Data Factories](#4-test-data-factories--davidtkramertypical-data)
6. [Visual Regression Testing](#5-visual-regression-testing--percyexample-percy-playwright)
7. [TGClinic-Specific Recommendations](#tgclinic-specific-recommendations)
8. [Hardening Without Brittle Selectors](#hardening-without-brittle-selectors)

---

## Repository Index

| # | Repository | License | Why It Matters | Key Files |
|---|-----------|---------|---------------|-----------|
| 1 | `checkly/playwright-examples` | MIT | Playwright POM + fixtures + auth state patterns | `fixtures-rock/`, `project-setup-and-storage-state/`, `network-monitoring/`, `api-schema-validation/` |
| 2 | `alexrusin/rest-api-nodejs-mongo` | ISC | Jest + Supertest + in-memory MongoDB integration test setup | `src/tests/tasks.test.ts`, `src/tests/mongoSetup.ts`, `jest.config.mjs` |
| 3 | `pact-foundation/pact-workshop-js` | MIT | Consumer-driven contract testing (Pact.js) with provider verification | `consumer/src/api.pact.spec.js`, `provider/product/product.pact.test.js` |
| 4 | `davidtkramer/typical-data` | MIT | TypeScript test data factories + in-memory DB for MSW/React Testing Library | `src/factory.ts`, `src/database.ts`, `README.md` |
| 5 | `percy/example-percy-playwright` | MIT | Visual regression snapshot testing with Playwright + Percy | `tests/todomvc_snapshot.spec.js`, `tests/bstackdemo_screenshot_*.spec.js` |

---

## 1. Playwright E2E Best Practices — `checkly/playwright-examples`

**What it is:** A curated collection of small, focused Playwright example projects demonstrating advanced patterns.

**Why TGClinic needs it:**
- TGClinic already uses Playwright in `website/e2e/` with auth-setup → storage state reuse.
- This repo shows how to scale that pattern with **Page Object Models (POMs)** and **custom fixtures**.

### Key Patterns to Study

#### A. Page Object Model + Fixtures (`fixtures-rock/`)

```typescript
// tests/poms/dashboard.ts
export class DashboardPage {
  readonly page: Page;
  readonly user: User;
  readonly $email: Locator;
  readonly $password: Locator;
  readonly $login: Locator;

  constructor(page: Page, user: User) {
    this.page = page;
    this.user = user;
    this.$email = page.getByPlaceholder("yours@example.com");
    this.$password = page.getByPlaceholder("your password");
    this.$login = page.getByLabel("Log In");
  }

  public async login() {
    await this.page.goto("...");
    await this.$email.fill(this.user.email);
    await this.$password.fill(this.user.password);
    await this.$login.click();
    await expect(this.$homeDashboard).toBeVisible();
  }
}
```

```typescript
// tests/base.ts — custom test fixture extending @playwright/test
export const test = base.extend<TestOptions>({
  dashboardPage: async ({ page, user }, use) => {
    const dashboard = new DashboardPage(page, user);
    await use(dashboard);
  },
  user: [{ email: "...", password: "..." }, { option: true }],
});
```

**Lesson for TGClinic:** Instead of inline `page.locator('#email')` in every test, centralize selectors in POM classes and inject them via fixtures. This makes tests readable and resilient to UI changes.

#### B. Auth State Reuse (`project-setup-and-storage-state/`)

```typescript
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], storageState: ".auth/user.json" },
    dependencies: ["setup"],
  },
];
```

```typescript
// tests/session.setup.ts
setup("authenticate", async ({ page }) => {
  await page.goto("https://app.checklyhq.com");
  await page.getByPlaceholder("yours@example.com").fill(process.env.USER!);
  await page.getByPlaceholder("your password").fill(process.env.PW!);
  await page.getByLabel("Log In").click();
  await expect(page.getByLabel("Home")).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
```

**Lesson for TGClinic:** TGClinic already does this in `auth-setup.spec.ts` → `.auth/admin.json`. This repo validates the pattern and shows how to extend it for **multiple roles** (admin, CTV, employee) with separate storage state files.

#### C. Network Error Monitoring (`network-monitoring/`)

```typescript
// tests/base.ts — auto fixture that fails tests on 4xx/5xx responses
export const test = base.extend<{ networkErrorMonitor: Page }>({
  networkErrorMonitor: [
    async ({ page }, use, testInfo) => {
      const errorData: ErrorRequest[] = [];
      page.on("response", async (response) => {
        if (response.status() >= 400) {
          errorData.push({ url: response.url(), status: response.status() });
        }
      });
      await use(page);
      if (errorData.length > 0) {
        await testInfo.attach("error-requests.json", {
          body: JSON.stringify(errorData, null, 2),
        });
        throw new Error(`Network errors detected: ${errorData.length} requests failed`);
      }
    },
    { auto: true },
  ],
});
```

**Lesson for TGClinic:** The `nk3-live-cosmetic-lob-routing-audit.spec.ts` already intercepts API requests. This pattern generalizes it: attach an **auto fixture** to every test that catches unexpected 4xx/5xx and attaches them to the test report.

#### D. API Schema Validation (`api-schema-validation/`)

```typescript
// tests/api.spec.ts
import { z } from "zod";

test("[Complex] API call has a valid response schema", async ({ request }) => {
  const response = await request.get(`/complex`);
  const body = await response.json();

  const schema = z.object({
    id: z.string(),
    name: z.string(),
    relatedPeople: z.array(z.object({ name: z.string(), id: z.string() })).or(z.null()),
  });

  expect(() => schema.parse(body)).not.toThrow();
});
```

**Lesson for TGClinic:** Use Zod schemas in Playwright API tests to validate backend response shapes. This catches contract drift before it hits the frontend.

---

## 2. API Integration Testing — `alexrusin/rest-api-nodejs-mongo`

**What it is:** A complete Express + TypeScript REST API with Jest + Supertest integration tests using an in-memory MongoDB.

**Why TGClinic needs it:**
- TGClinic has `api/src/routes/__tests__/` with Jest/Supertest tests.
- This repo shows a clean pattern for **test database lifecycle** (setup → beforeEach cleanup → teardown).

### Key Files to Study

#### `src/tests/mongoSetup.ts` — Test Database Lifecycle

```typescript
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

**Lesson for TGClinic:** For PostgreSQL, use `pg-mem` or `testcontainers` with a similar pattern: `beforeAll` create DB, `beforeEach` truncate tables, `afterAll` destroy container.

#### `src/tests/tasks.test.ts` — Full CRUD Integration Test

```typescript
import request from "supertest";
import app from "../server";
import Task from "../models/Task";

beforeEach(async () => {
  await Task.deleteMany({}); // Clean slate per test
});

describe("GET /tasks", () => {
  it("should return an empty array when no tasks exist", async () => {
    const response = await request(app).get("/tasks");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return all tasks", async () => {
    await Task.create({ name: "Task 1", completed: false });
    const response = await request(app).get("/tasks");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});
```

**Lesson for TGClinic:**
- Use `beforeEach` to reset DB state — prevents test interdependence.
- Test both happy path and error cases (404, 500, validation errors).
- For TGClinic's payment/CTV routes, this pattern ensures each test starts with a known DB state.

#### `jest.config.mjs` — Minimal Jest Config for Integration Tests

```javascript
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./src/tests"],
  transform: { "^.+\\.ts?$": "ts-jest" },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$",
};
```

---

## 3. Contract Testing — `pact-foundation/pact-workshop-js`

**What it is:** The official Pact.js workshop — a step-by-step guide to consumer-driven contract testing between a frontend and a backend API.

**Why TGClinic needs it:**
- TGClinic has a React frontend (`website/`) and Express backend (`api/`).
- Contract tests prevent the "frontend expects X, backend returns Y" drift that causes production bugs.

### Key Files to Study

#### `consumer/src/api.pact.spec.js` — Consumer Pact Test

```javascript
import { PactV3, MatchersV3, SpecificationVersion } from "@pact-foundation/pact";
const { eachLike, like } = MatchersV3;

const provider = new PactV3({
  consumer: "FrontendWebsite",
  provider: "ProductService",
  dir: path.resolve(process.cwd(), "pacts"),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V2,
  host: "127.0.0.1",
});

describe("getting all products", () => {
  test("products exists", async () => {
    await provider.addInteraction({
      states: [{ description: "products exist" }],
      uponReceiving: "get all products",
      withRequest: { method: "GET", path: "/products" },
      willRespondWith: {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: eachLike({
          id: like("09"),
          type: "CREDIT_CARD",
          name: "Gem Visa",
          version: "v1",
        }),
      },
    });

    await provider.executeTest(async (mockService) => {
      const products = await API.getAllProducts(mockService.url);
      expect(products).toHaveLength(2);
    });
  });
});
```

**Lesson for TGClinic:** Write Pact tests for critical API clients (payment, CTV, auth). The consumer test generates a JSON contract that the backend must satisfy.

#### `provider/product/product.pact.test.js` — Provider Verification

```javascript
const { Verifier } = require("@pact-foundation/pact");

describe("Pact Verification", () => {
  it("validates the expectations of ProductService", () => {
    const opts = {
      providerBaseUrl: "http://127.0.0.1:8080",
      provider: "ProductService",
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      stateHandlers: {
        "product with ID 10 exists": () => {
          controller.repository.products = new Map([
            ["10", new Product("10", "CREDIT_CARD", "28 Degrees", "v1")],
          ]);
        },
        "products exist": () => {
          controller.repository.products = new Map([...]);
        },
      },
    };
    return new Verifier(opts).verifyProvider();
  });
});
```

**Lesson for TGClinic:**
- `stateHandlers` let you seed the provider DB to match the contract's expected state.
- For TGClinic: "payment with ID 123 exists" → seed a payment row before verification.
- Run provider verification in CI after every backend deploy.

### Workshop Steps (13 branches)

The repo has 13 git branches (`step1` → `step13`) covering:
1. Consumer creation
2. Unit tests with mocked APIs
3. Writing Pact consumer tests
4. Provider verification
5. Fixing consumer assumptions
6. 404 / missing resource contracts
7. Provider states
8. Auth / 401 contracts
9. Request filters
10. Pact Broker integration
11. CI/CD integration
12. Webhooks for contract change triggers
13. Pactflow (managed broker)

**Recommendation:** Walk through `step1` → `step7` to understand the core loop. Skip broker steps if not using Pactflow yet.

---

## 4. Test Data Factories — `davidtkramer/typical-data`

**What it is:** A TypeScript library for building mock data with factories and querying it via a lightweight in-memory database.

**Why TGClinic needs it:**
- TGClinic has complex domain objects: patients, appointments, payments, CTV records, services, employees.
- Hard-coded fixtures become unmaintainable. Factories generate valid objects with sensible defaults, allowing per-test overrides.

### Key Patterns to Study

#### Factory Definition

```typescript
import { createFactory } from "typical-data";

export const contactFactory = createFactory<Contact>({
  id: ({ sequence }) => sequence,
  email: "email@example.com",
  phone: "(555) 123-4567",
  name: "name",
});
```

#### Builder Callback Notation (Advanced)

```typescript
const contactFactory = createFactory((factory) =>
  factory
    .extends(parentFactory)
    .transient({ areaCode: 555, downcaseName: false })
    .attributes<Contact>({
      id: 1,
      email: "email@example.com",
      phone({ transientParams }) {
        return `(${transientParams.areaCode}) 123-4567`;
      },
      name: "Alice",
    })
    .trait("business", { type: "business" })
    .afterBuild(({ entity, transientParams }) => {
      if (transientParams.downcaseName) {
        entity.name = entity.name.toLowerCase();
      }
    })
);
```

#### In-Memory Database

```typescript
import { createDatabase } from "typical-data";

export const db = createDatabase({
  factories: {
    contacts: contactFactory,
    users: userFactory,
  },
});

// In tests:
const contact = db.contacts.create({ name: "Alice", email: "test@example.com" });
expect(db.contacts).toHaveLength(1);
```

**Lesson for TGClinic:**
- Create a `factories/` directory in `website/src/__tests__/` with factories for `Patient`, `Appointment`, `Payment`, `Service`.
- Use `typical-data` patterns (or port the ideas) to generate test data with realistic defaults (Vietnamese names, valid phone numbers, etc.).
- For MSW (Mock Service Worker) handlers, use the in-memory DB to serve consistent data across component tests.

---

## 5. Visual Regression Testing — `percy/example-percy-playwright`

**What it is:** An example app showing Percy visual regression testing integrated with Playwright.

**Why TGClinic needs it:**
- TGClinic has complex UI flows (payment forms, CTV portal, calendar, patient profiles).
- Visual regression catches unintended UI changes (CSS drift, layout breaks) that functional tests miss.

### Key Files to Study

#### `tests/todomvc_snapshot.spec.js`

```javascript
const percySnapshot = require("@percy/playwright");
const { test, expect } = require("@playwright/test");

test("Loads the app", async function ({ page }) {
  let mainContainer = await page.$("section.todoapp");
  expect(mainContainer).toBeDefined();
  await percySnapshot(page, "Loads the app");
});

test("Accepts a new todo", async function ({ page }) {
  await page.type(".new-todo", "New fancy todo");
  await page.keyboard.press("Enter");
  let todoCount = await page.evaluate(() => document.querySelectorAll(".todo-list li").length);
  expect(todoCount).toEqual(1);
  await percySnapshot(page, "Snapshot with new todo", { widths: [300] });
});
```

**Lesson for TGClinic:**
- Add `percySnapshot(page, "payment-form-empty")` after loading the payment page.
- Add `percySnapshot(page, "ctv-portal-dashboard")` after CTV login.
- Use `widths: [768, 992, 1200]` to test responsive breakpoints.

#### `tests/bstackdemo_screenshot_*.spec.js` — Before/After Comparison

These files show how to take screenshots before and after a change, then compare them with Percy. Useful for:
- Verifying that a bug fix doesn't break other UI elements.
- Confirming that a design system update applies consistently.

---

## TGClinic-Specific Recommendations

### Current State Analysis

| Area | Current | Gap | Reference to Apply |
|------|---------|-----|-------------------|
| E2E Auth | `auth-setup.spec.ts` → `.auth/admin.json` | No multi-role support | `checkly/project-setup-and-storage-state/` — add `ctv-setup.spec.ts`, `employee-setup.spec.ts` |
| E2E Selectors | Inline `page.locator('#email')` in many tests | Brittle, hard to maintain | `checkly/fixtures-rock/` — POM classes for `LoginPage`, `PaymentPage`, `CtvPortalPage` |
| E2E API Monitoring | Manual request interception in `nk3-live-cosmetic-lob-routing-audit.spec.ts` | No generic error catching | `checkly/network-monitoring/` — auto fixture for 4xx/5xx |
| API Tests | Jest + Supertest in `api/src/routes/__tests__/` | No test DB isolation shown | `alexrusin/` — `beforeEach` cleanup pattern with `pg-mem` or testcontainers |
| Contract Tests | None | Frontend/backend drift risk | `pact-workshop-js/` — Pact consumer tests for payment/CTV APIs |
| Test Data | Hard-coded mocks in `__tests__/` | No factory pattern | `typical-data/` — factories for Patient, Appointment, Payment |
| Visual Regression | None | UI drift not caught | `percy-playwright-example/` — Percy snapshots on critical pages |

### Recommended Priority Order

1. **POM + Fixtures** (highest impact, lowest effort)
   - Create `website/e2e/poms/` with `LoginPage.ts`, `PaymentPage.ts`, `OverviewPage.ts`.
   - Create `website/e2e/fixtures.ts` extending `@playwright/test` with POM fixtures.
   - Migrate existing tests incrementally (start with `auth-setup.spec.ts`).

2. **Network Error Auto Fixture** (medium effort, high value)
   - Add an auto fixture to `fixtures.ts` that attaches 4xx/5xx responses to test reports.
   - This catches API errors that don't break assertions but indicate backend issues.

3. **Test Data Factories** (medium effort, long-term value)
   - Create `website/src/__tests__/factories/` with `patientFactory`, `appointmentFactory`, `paymentFactory`.
   - Use in Vitest + React Testing Library tests for consistent, realistic data.

4. **Contract Tests** (higher effort, prevents integration bugs)
   - Add `@pact-foundation/pact` to `website/` devDependencies.
   - Write consumer Pact tests for `GET /api/payments`, `GET /api/ctv/...`, `POST /api/auth/login`.
   - Add provider verification to `api/` CI pipeline.

5. **Visual Regression** (optional, design-system maturity)
   - Add `@percy/playwright` to E2E tests for payment form, CTV portal, and calendar views.

---

## Hardening Without Brittle Selectors

### The Problem

TGClinic E2E tests currently use selectors like:
- `page.locator('#email')` — breaks if ID changes
- `page.locator('button[type="submit"]')` — ambiguous if multiple submit buttons exist
- `page.locator('.some-class')` — breaks if CSS refactoring renames classes

### The Solution: Selector Priority Ladder

Playwright's recommended locator priority (from most to least resilient):

1. **`getByRole`** — semantic, accessible, resilient
   ```typescript
   page.getByRole("button", { name: "Sign in" });
   page.getByRole("navigation", { name: "Main menu" });
   ```

2. **`getByLabel`** — ties to form labels
   ```typescript
   page.getByLabel("Email address");
   page.getByLabel("Password", { exact: false });
   ```

3. **`getByPlaceholder`** — good for inputs
   ```typescript
   page.getByPlaceholder("Search patients...");
   ```

4. **`getByText`** — for visible text
   ```typescript
   page.getByText("Payment successful", { exact: false });
   ```

5. **`getByTestId`** — last resort, requires `data-testid` attributes in source code
   ```typescript
   page.getByTestId("payment-submit-button");
   ```

6. **CSS/XPath** — avoid unless absolutely necessary

### TGClinic Migration Path

1. **Audit existing selectors** in `website/e2e/*.spec.ts` — list all `page.locator(...)` calls.
2. **Add `data-testid` attributes** to critical elements in React components (payment form, CTV portal, login form).
3. **Create POM classes** that use `getByRole` / `getByLabel` first, `getByTestId` as fallback.
4. **Update `auth-setup.spec.ts`** first — it's the most reused pattern.
5. **Enforce via lint rule** (custom ESLint rule or code review checklist): no raw CSS selectors in E2E tests unless justified.

### Example: Hardening `auth-setup.spec.ts`

**Before (brittle):**
```typescript
const emailInput = page.locator('#email');
await emailInput.fill('t@clinic.vn');
await page.locator('#password').fill('123123');
await page.locator('button[type="submit"]').click();
```

**After (resilient):**
```typescript
// In LoginPage.ts POM
export class LoginPage {
  readonly $email = page.getByLabel("Email");
  readonly $password = page.getByLabel("Password");
  readonly $submit = page.getByRole("button", { name: "Sign in" });

  async login(email: string, password: string) {
    await this.$email.fill(email);
    await this.$password.fill(password);
    await this.$submit.click();
  }
}

// In test
await loginPage.login('t@clinic.vn', '123123');
```

---

## License Summary

| Repository | License | Commercial Use OK? |
|-----------|---------|-------------------|
| `checkly/playwright-examples` | MIT | ✅ |
| `alexrusin/rest-api-nodejs-mongo` | ISC | ✅ |
| `pact-foundation/pact-workshop-js` | MIT | ✅ |
| `davidtkramer/typical-data` | MIT | ✅ |
| `percy/example-percy-playwright` | MIT | ✅ |

All repositories are permissively licensed and safe for commercial reference.

---

## How to Use This Library

1. **Read the README-reference.md** (this file) for context and recommendations.
2. **Browse the downloaded repos** for concrete code examples.
3. **Port patterns incrementally** — start with POMs, then fixtures, then factories.
4. **Reference during code review** — link to specific files when suggesting test improvements.
5. **Update quarterly** — re-run `git clone --depth 1` to refresh with latest upstream patterns.
