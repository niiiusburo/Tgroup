# TGroup Enterprise Architecture Restructuring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the 11,451-line backend (39 flat route files, no service layer) and 52,183-line frontend (380 files, no domain boundaries) into a layered enterprise architecture with clear domain boundaries, testable business logic, and consistent patterns.

**Architecture:** Hexagonal/clean architecture for the backend (Controllers → Services → Repositories), domain-driven feature folders for the frontend (feature/domain colocation over technical layer separation).

**Tech Stack:** Node.js/Express → layered backend, React 18/TypeScript/Vite → domain-organized frontend, PostgreSQL with `dbo` schema (unchanged).

---

## 📋 Pre-Flight: Phase 0 — Fix Critical Bugs First

Before any restructuring, fix the 3 critical bugs that affect data integrity today.

---

### Task 0.1: Deduplicate Permission Resolution

**Goal:** Extract permission resolution into a single shared module so `requirePermission` and `resolvePermissions` never diverge.

**Files:**
- Create: `api/src/services/permissionService.js`
- Modify: `api/src/middleware/auth.js`
- Modify: `api/src/routes/auth.js`
- Test: `api/src/__tests__/services/permissionService.test.js`

- [ ] **Step 1: Create shared permission service**

```bash
mkdir -p api/src/services api/src/__tests__/services
```

Write `api/src/services/permissionService.js`:

```javascript
'use strict';

const { query } = require('../db');

/**
 * Resolve effective permissions for an employee.
 * Single source of truth — used by both login resolution AND route guards.
 *
 * @param {string} employeeId - UUID of the employee
 * @returns {{ groupId: string|null, groupName: string|null, effectivePermissions: string[], locations: Array<{id:string, name:string}> }}
 */
async function resolveEffectivePermissions(employeeId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(employeeId)) {
    return {
      groupId: null,
      groupName: null,
      effectivePermissions: [],
      locations: [],
    };
  }

  // Read tier_id from partners (primary source)
  const partnerRows = await query(
    `SELECT p.tier_id, pg.name AS group_name
     FROM dbo.partners p
     LEFT JOIN dbo.permission_groups pg ON pg.id = p.tier_id
     WHERE p.id = $1 AND p.employee = true AND p.isdeleted = false`,
    [employeeId]
  );

  if (!partnerRows || partnerRows.length === 0) {
    return {
      groupId: null,
      groupName: null,
      effectivePermissions: [],
      locations: [],
    };
  }

  const groupId = partnerRows[0].tier_id;
  const groupName = partnerRows[0].group_name;

  if (!groupId) {
    return {
      groupId: null,
      groupName: null,
      effectivePermissions: [],
      locations: [],
    };
  }

  // Resolve base permissions + overrides
  const [basePermRows, overrideRows, locationRows] = await Promise.all([
    query(`SELECT permission FROM dbo.group_permissions WHERE group_id = $1`, [groupId]),
    query(`SELECT permission, override_type FROM dbo.permission_overrides WHERE employee_id = $1`, [employeeId]),
    query(
      `SELECT c.id, c.name FROM dbo.employee_location_scope els
       JOIN dbo.companies c ON c.id = els.company_id
       WHERE els.employee_id = $1`,
      [employeeId]
    ),
  ]);

  const basePerms = basePermRows.map(r => r.permission);
  const granted = overrideRows.filter(r => r.override_type === 'grant').map(r => r.permission);
  const revoked = overrideRows.filter(r => r.override_type === 'revoke').map(r => r.permission);

  const effectiveSet = new Set([...basePerms, ...granted]);
  for (const p of revoked) effectiveSet.delete(p);

  return {
    groupId,
    groupName,
    effectivePermissions: [...effectiveSet],
    locations: locationRows,
  };
}

/**
 * Check if employee has a specific permission.
 * @param {string} employeeId
 * @param {string} permission
 * @returns {Promise<boolean>}
 */
async function hasPermission(employeeId, permission) {
  const { effectivePermissions } = await resolveEffectivePermissions(employeeId);
  return effectivePermissions.has('*') || effectivePermissions.has(permission);
}

module.exports = { resolveEffectivePermissions, hasPermission };
```

- [ ] **Step 2: Run test to verify service is importable**

```bash
cd api && node -e "const p = require('./src/services/permissionService'); console.log('Service loaded:', typeof p.resolveEffectivePermissions)"
```
Expected: `Service loaded: function`

- [ ] **Step 3: Update middleware/auth.js to use shared service**

Replace the `requirePermission` factory function in `api/src/middleware/auth.js`:

```javascript
'use strict';

const jwt = require('jsonwebtoken');
const { resolveEffectivePermissions } = require('../services/permissionService');

/**
 * requireAuth middleware
 * Verifies Bearer JWT token from Authorization header.
 * Sets req.user to decoded JWT payload on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * requirePermission(permission) middleware factory
 * Uses the SINGLE shared permission resolution service.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const { employeeId } = req.user;
      const { effectivePermissions } = await resolveEffectivePermissions(employeeId);

      if (effectivePermissions.length === 0) {
        return res.status(403).json({ error: 'No permission assignment found' });
      }

      if (!effectivePermissions.includes('*') && !effectivePermissions.includes(permission)) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }

      next();
    } catch (err) {
      console.error('requirePermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requireAuth, requirePermission };
```

- [ ] **Step 4: Update routes/auth.js to use shared service**

In `api/src/routes/auth.js`, replace `resolvePermissions` with the shared service:

```javascript
// Old local implementation: DELETE the resolvePermissions function
// Replace with:
const { resolveEffectivePermissions } = require('../services/permissionService');

// In the /me and /login handlers, replace:
//   const permissions = await resolvePermissions(employeeId);
// with:
//   const permissions = await resolveEffectivePermissions(employeeId);

// In /login, update the return shape to match frontend expectations:
// Return: { token, user: { id, name, email, companyId }, permissions: { groupId, groupName, effectivePermissions, locations } }
```

- [ ] **Step 5: Run existing tests to verify no regressions**

```bash
cd api && npm test
```

- [ ] **Step 6: Read permission test to verify auth still works**

```bash
curl -s http://localhost:3002/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tg@clinic.vn","password":"123456"}' | python3 -m json.tool | head -20
```

- [ ] **Step 7: Commit**

```bash
git add api/src/services/permissionService.js api/src/middleware/auth.js api/src/routes/auth.js
git commit -m "fix: deduplicate permission resolution into shared permissionService

Extracts permission resolution logic into a single service module
used by both requirePermission middleware and auth login/me routes.
Eliminates the risk of divergent permission logic."
```

---

### Task 0.2: Remove Dead Routes

**Goal:** Unmount dead routes that query non-existent tables or serve deprecated endpoints.

**Files:**
- Modify: `api/src/server.js`

- [ ] **Step 1: Remove dead route mounts from server.js**

In `api/src/server.js`, remove or comment out:

```javascript
// DEAD: services.js queries public.services which does not exist
// app.use('/api/Services', servicesRoutes);

// LEGACY: /api/Account duplicates /api/Auth — verify no clients use this
// app.use('/api/Account', accountRoutes);
// app.use('/api/Account/Login', loginLimiter);
```

- [ ] **Step 2: Verify server starts without errors**

```bash
cd api && timeout 5 node src/server.js 2>&1 || true
```
Expected: No errors about missing routes. Server starts normally.

- [ ] **Step 3: Delete dead frontend API client**

```bash
rm website/src/lib/api/services.ts
```

- [ ] **Step 4: Verify frontend builds**

```bash
cd website && npm run build 2>&1 | tail -5
```
Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add api/src/server.js website/src/lib/api/services.ts
git commit -m "chore: remove dead /api/Services route and services.ts API client

Both target the non-existent public.services table.
/api/Account legacy mounts also commented out."
```

---

### Task 0.3: Add Payment Type Column to Eliminate SQL Heuristic

**Goal:** Add a `payment_category` column to `payments` table so the 64-line SQL classification goes away.

**Files:**
- Create: `api/src/db/migrations/003_add_payment_category.sql`
- Modify: `api/src/routes/payments.js`
- Modify: `website/src/lib/api/payments.ts`

- [ ] **Step 1: Create migration SQL**

```sql
-- api/src/db/migrations/003_add_payment_category.sql
-- Adds explicit payment_category column to eliminate heuristic classification

ALTER TABLE dbo.payments
ADD COLUMN IF NOT EXISTS payment_category VARCHAR(20) DEFAULT NULL;

-- Backfill existing rows based on current heuristic
UPDATE dbo.payments SET payment_category = 'deposit'
WHERE deposit_type IN ('deposit', 'refund')
   OR (deposit_type IS NULL AND method IN ('cash', 'bank_transfer')
       AND service_id IS NULL AND (deposit_used IS NULL OR deposit_used = 0)
       AND amount > 0
       AND NOT EXISTS (SELECT 1 FROM payment_allocations WHERE payment_id = payments.id));

UPDATE dbo.payments SET payment_category = 'payment'
WHERE payment_category IS NULL
  AND (EXISTS (SELECT 1 FROM payment_allocations WHERE payment_id = payments.id)
       OR amount < 0 OR method = 'deposit' OR deposit_used > 0
       OR deposit_type = 'usage');

-- All remaining rows default to 'payment'
UPDATE dbo.payments SET payment_category = 'payment' WHERE payment_category IS NULL;

-- Add constraint
ALTER TABLE dbo.payments
ADD CONSTRAINT chk_payment_category CHECK (payment_category IN ('payment', 'deposit'));

-- Create index for filtering
CREATE INDEX idx_payments_category ON dbo.payments(payment_category);
```

- [ ] **Step 2: Apply migration to local dev database**

```bash
psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo \
  -f api/src/db/migrations/003_add_payment_category.sql
```

- [ ] **Step 3: Simplify payments.js GET route**

Replace the `type=payments` / `type=deposits` SQL heuristics in `api/src/routes/payments.js`:

```javascript
// OLD (60+ lines of SQL conditions):
// sql += ` AND ( COALESCE(p.deposit_type, '') IN (...) ... )`

// NEW (3 lines):
if (type === 'payments') {
  sql += ` AND p.payment_category = 'payment'`;
} else if (type === 'deposits') {
  sql += ` AND p.payment_category = 'deposit'`;
}
```

Also update `POST /api/Payments` to set `payment_category` explicitly:

```javascript
// In the auto-detect deposit section:
const isDeposit = !req.body.deposit_type && !req.body.allocations?.length
  && !['deposit', 'mixed'].includes(req.body.method)
  && !req.body.service_id && !req.body.deposit_used;

const payment_category = isDeposit ? 'deposit' : 'payment';
```

- [ ] **Step 4: Commit**

```bash
git add api/src/db/migrations/003_add_payment_category.sql api/src/routes/payments.js
git commit -m "refactor: replace payment classification SQL heuristic with payment_category column

Adds payment_category column to payments table to eliminate
64-line fragile SQL classification. Migration backfills existing
data based on current heuristic then simplifies GET/POST routes."
```

---

## 🏗️ Phase 1: Backend — Hexagonal Architecture

Transform the flat route files into a layered architecture: **Domain Services → Repository → Route (thin controllers)**

### Architecture Target

```
api/src/
├── server.js                    # Thin: mount routes only
├── db.js                        # Shared pg Pool
├── middleware/
│   ├── auth.js                  # JWT + permission guards
│   ├── validate.js              # Zod validation middleware
│   ├── errorHandler.js          # Centralized error handling (NEW)
│   └── ipAccess.js
├── domains/                     # NEW: Domain-driven organization
│   ├── partners/
│   │   ├── partners.service.js  # Business logic (validate, duplicate check, KPI calc)
│   │   ├── partners.repository.js # SQL queries only
│   │   ├── partners.routes.js   # Thin route handlers (params → service → response)
│   │   ├── partners.schema.js   # Zod validation schemas
│   │   └── __tests__/
│   │       ├── partners.service.test.js
│   │       └── partners.repository.test.js
│   ├── payments/
│   │   ├── payments.service.js
│   │   ├── payments.repository.js
│   │   ├── payments.routes.js
│   │   ├── payments.schema.js
│   │   └── __tests__/
│   ├── appointments/
│   │   ├── appointments.service.js
│   │   ├── appointments.repository.js
│   │   ├── appointments.routes.js
│   │   ├── appointments.schema.js
│   │   └── __tests__/
│   ├── saleorders/
│   │   ├── saleorders.service.js
│   │   ├── saleorders.repository.js
│   │   ├── saleorders.routes.js
│   │   ├── saleorders.schema.js
│   │   └── __tests__/
│   ├── products/
│   │   ├── products.service.js
│   │   ├── products.repository.js
│   │   ├── products.routes.js
│   │   ├── products.schema.js
│   │   └── __tests__/
│   ├── auth/
│   │   ├── auth.service.js
│   │   ├── auth.routes.js
│   │   └── __tests__/
│   ├── employees/
│   │   ├── employees.service.js
│   │   ├── employees.repository.js
│   │   ├── employees.routes.js
│   │   ├── employees.schema.js
│   │   └── __tests__/
│   ├── reports/
│   │   ├── reports.service.js
│   │   ├── reports.repository.js
│   │   ├── reports.routes.js
│   │   └── __tests__/
│   └── feedback/
│       ├── feedback.service.js
│       ├── feedback.repository.js
│       ├── feedback.routes.js
│       └── __tests__/
├── shared/                      # Cross-cutting utilities
│   ├── baseRepository.js        # Shared query helpers, pagination
│   ├── errorTypes.js            # Domain error classes
│   └── responseHelper.js        # Consistent API response format
└── db/
    └── migrations/              # All migration SQL files
```

### Layer Rules (enforced):
1. **Routes** only parse params, call service, format response — NO SQL
2. **Services** contain ALL business logic — NO SQL, use repository
3. **Repositories** contain ONLY SQL queries — NO business logic
4. **Schemas** define Zod validation schemas — imported by routes
5. **No domain imports from another domain** — cross-domain via events or orchestration service

---

### Task 1.1: Create Base Repository and Error Types

**Goal:** Build the shared infrastructure all domains will use.

**Files:**
- Create: `api/src/shared/baseRepository.js`
- Create: `api/src/shared/errorTypes.js`
- Create: `api/src/shared/responseHelper.js`

- [ ] **Step 1: Create error types**

```javascript
// api/src/shared/errorTypes.js
'use strict';

class DomainError extends Error {
  constructor(message, statusCode = 400, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends DomainError {
  constructor(entity, id) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ValidationError extends DomainError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends DomainError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

module.exports = {
  DomainError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
};
```

- [ ] **Step 2: Create base repository**

```javascript
// api/src/shared/baseRepository.js
'use strict';

const { query, pool } = require('../db');

/**
 * Base repository with shared query helpers.
 * Domain repositories extend this for pagination, transactions, etc.
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async query(sql, params) {
    return query(sql, params);
  }

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Standard paginated list query.
   */
  async paginatedList({ baseQuery, countQuery, params, offset, limit, sortField, sortOrder }) {
    const offsetNum = parseInt(offset, 10) || 0;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 500);

    const [items, countResult] = await Promise.all([
      query(baseQuery, [...params, limitNum, offsetNum]),
      query(countQuery, params),
    ]);

    return {
      offset: offsetNum,
      limit: limitNum,
      totalItems: parseInt(countResult[0]?.count || 0, 10),
      items,
    };
  }

  /**
   * Build WHERE clause from conditions array and params.
   */
  buildWhereClause(conditions) {
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  /**
   * Add parameterized condition.
   */
  addCondition(conditions, params, clause) {
    conditions.push(clause.replace(/\$\d+/g, `$${params.length + 1}`));
  }
}

module.exports = BaseRepository;
```

- [ ] **Step 3: Create response helper**

```javascript
// api/src/shared/responseHelper.js
'use strict';

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

function created(res, data) {
  return res.status(201).json(data);
}

function paginated(res, { offset, limit, totalItems, items, aggregates }) {
  const response = { offset, limit, totalItems, items };
  if (aggregates) response.aggregates = aggregates;
  return res.status(200).json(response);
}

function errorHandler(err, req, res, next) {
  if (err.name === 'DomainError' || err.name === 'NotFoundError' ||
      err.name === 'ValidationError' || err.name === 'ForbiddenError' ||
      err.name === 'ConflictError') {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = { success, created, paginated, errorHandler };
```

- [ ] **Step 4: Commit**

```bash
git add api/src/shared/
git commit -m "feat: add base repository, error types, and response helper for hexagonal architecture"
```

---

### Task 1.2: Extract Partners Domain

**Goal:** Extract the 764-line `partners.js` into a clean domain module. This is the most complex and highest-blast-radius domain (customers + employees share the partners table).

**Files:**
- Create: `api/src/domains/partners/partners.repository.js`
- Create: `api/src/domains/partners/partners.service.js`
- Create: `api/src/domains/partners/partners.routes.js`
- Create: `api/src/domains/partners/partners.schema.js`
- Create: `api/src/domains/partners/__tests__/partners.service.test.js`
- Modify: `api/src/server.js` (replace route mount)

- [ ] **Step 1: Create partners schema**

```javascript
// api/src/domains/partners/partners.schema.js
'use strict';

const { z } = require('zod');

const UUID_FIELDS = [
  'companyid', 'titleid', 'agentid', 'countryid', 'stateid',
  'stageid', 'contactstatusid', 'marketingteamid', 'saleteamid',
  'cskhid', 'salestaffid', 'hrjobid', 'tier_id',
];

const PartnerBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(500),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  street: z.string().max(500).nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  birthyear: z.number().int().min(1900).max(2100).nullable().optional(),
  companyid: z.string().uuid().nullable().optional(),
  active: z.boolean().optional().default(true),
  medicalhistory: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  taxcode: z.string().max(50).nullable().optional(),
  identitynumber: z.string().max(50).nullable().optional(),
  healthinsurancecardnumber: z.string().max(50).nullable().optional(),
  emergencyphone: z.string().max(50).nullable().optional(),
  sourceid: z.string().uuid().nullable().optional(),
});

const PartnerCreateSchema = PartnerBaseSchema.extend({
  customer: z.boolean().optional().default(true),
  employee: z.boolean().optional().default(false),
});

const PartnerUpdateSchema = PartnerBaseSchema.partial();

function sanitizeUuids(obj) {
  for (const field of UUID_FIELDS) {
    if (obj[field] === '' || obj[field] === undefined) obj[field] = null;
  }
}

module.exports = {
  PartnerCreateSchema,
  PartnerUpdateSchema,
  sanitizeUuids,
};
```

- [ ] **Step 2: Create partners repository**

```javascript
// api/src/domains/partners/partners.repository.js
'use strict';

const BaseRepository = require('../../shared/baseRepository');

class PartnersRepository extends BaseRepository {
  constructor() {
    super('dbo.partners');
  }

  // -- Customer list queries --

  async listCustomers({ search, sortField, sortOrder, offset, limit, filters }) {
    const allowedSort = {
      name: 'p.name', displayname: 'p.displayname', ref: 'p.ref',
      phone: 'p.phone', email: 'p.email', datecreated: 'p.datecreated',
      city: 'p.cityname', status: 'p.treatmentstatus',
    };

    const conditions = ['p.customer = true', 'p.isdeleted = false'];
    const params = [];

    if (search) {
      conditions.push(
        `(p.name ILIKE $${params.length + 1} OR p.namenosign ILIKE $${params.length + 1} OR p.phone ILIKE $${params.length + 1} OR p.ref ILIKE $${params.length + 1} OR p.email ILIKE $${params.length + 1})`
      );
      params.push(`%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const orderBy = allowedSort[sortField] || 'p.datecreated';
    const orderDir = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const baseQuery = `
      SELECT p.id, p.ref AS code, p.displayname, p.name, p.phone, p.email,
             p.street, p.cityname AS city, p.districtname AS district,
             p.wardname AS ward, p.gender, p.birthyear, p.birthmonth, p.birthday,
             p.medicalhistory, p.comment, p.note, p.active AS status,
             p.treatmentstatus, p.referraluserid, p.agentid,
             a.name AS agentname, p.companyid, c.name AS companyname,
             p.datecreated, p.lastupdated, p.avatar, p.zaloid,
             p.taxcode, p.identitynumber, p.healthinsurancecardnumber,
             p.emergencyphone, p.weight, 0 AS appointmentcount,
             p.sourceid, cs.name AS sourcename
      FROM dbo.partners p
      LEFT JOIN dbo.partners a ON a.id = p.agentid
      LEFT JOIN dbo.companies c ON c.id = p.companyid
      LEFT JOIN dbo.customersources cs ON cs.id = p.sourceid
      ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM dbo.partners p
      ${whereClause}
    `;

    return this.paginatedList({ baseQuery, countQuery, params, offset, limit });
  }

  async getCustomerById(id) {
    const [result] = await this.query(
      `SELECT p.*, c.name AS companyname, cs.name AS sourcename
       FROM dbo.partners p
       LEFT JOIN dbo.companies c ON c.id = p.companyid
       LEFT JOIN dbo.customersources cs ON cs.id = p.sourceid
       WHERE p.id = $1 AND p.customer = true AND p.isdeleted = false`,
      [id]
    );
    return result || null;
  }

  async checkPhoneUnique(phone, excludeId) {
    const params = [phone];
    let sql = `SELECT id FROM dbo.partners WHERE phone = $1 AND isdeleted = false`;
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $${params.length}`;
    }
    const result = await this.query(sql, params);
    return result.length === 0;
  }

  async checkEmailUnique(email, excludeId) {
    if (!email) return true;
    const params = [email];
    let sql = `SELECT id FROM dbo.partners WHERE email = $1 AND isdeleted = false`;
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $${params.length}`;
    }
    const result = await this.query(sql, params);
    return result.length === 0;
  }

  async createCustomer(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const [result] = await this.query(
      `INSERT INTO dbo.partners (${columns.join(', ')}, datecreated, lastupdated)
       VALUES (${placeholders.join(', ')}, NOW(), NOW())
       RETURNING *`,
      values
    );
    return result;
  }

  async updateCustomer(id, data) {
    const setClauses = Object.keys(data).map((key, i) => `${key} = $${i + 2}`);
    const values = Object.values(data);

    const [result] = await this.query(
      `UPDATE dbo.partners
       SET ${setClauses.join(', ')}, lastupdated = NOW()
       WHERE id = $1 AND isdeleted = false
       RETURNING *`,
      [id, ...values]
    );
    return result || null;
  }

  async softDelete(id) {
    await this.query(
      `UPDATE dbo.partners SET isdeleted = true, lastupdated = NOW() WHERE id = $1`,
      [id]
    );
  }

  async hardDelete(id) {
    await this.query(`DELETE FROM dbo.partners WHERE id = $1`, [id]);
  }
}

module.exports = new PartnersRepository();
```

- [ ] **Step 3: Create partners service**

```javascript
// api/src/domains/partners/partners.service.js
'use strict';

const partnersRepo = require('./partners.repository');
const PartnerCreateSchema = require('./partners.schema').PartnerCreateSchema;
const PartnerUpdateSchema = require('./partners.schema').PartnerUpdateSchema;
const sanitizeUuids = require('./partners.schema').sanitizeUuids;
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errorTypes');

const partnersService = {
  async listCustomers({ search, sortField, sortOrder, offset, limit }) {
    return partnersRepo.listCustomers({ search, sortField, sortOrder, offset, limit });
  },

  async getCustomerById(id) {
    const customer = await partnersRepo.getCustomerById(id);
    if (!customer) throw new NotFoundError('Customer', id);
    return customer;
  },

  async createCustomer(rawData) {
    // Validate with Zod
    const parsed = PartnerCreateSchema.safeParse(rawData);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new ValidationError(messages.join('; '));
    }

    const data = { ...parsed.data };
    sanitizeUuids(data);

    // Uniqueness checks
    if (data.phone) {
      const phoneUnique = await partnersRepo.checkPhoneUnique(data.phone);
      if (!phoneUnique) throw new ConflictError('Phone number already exists');
    }
    if (data.email) {
      const emailUnique = await partnersRepo.checkEmailUnique(data.email);
      if (!emailUnique) throw new ConflictError('Email already exists');
    }

    return partnersRepo.createCustomer(data);
  },

  async updateCustomer(id, rawData) {
    const customer = await this.getCustomerById(id);

    const parsed = PartnerUpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new ValidationError(messages.join('; '));
    }

    const data = { ...parsed.data };
    sanitizeUuids(data);

    if (data.phone && data.phone !== customer.phone) {
      const phoneUnique = await partnersRepo.checkPhoneUnique(data.phone, id);
      if (!phoneUnique) throw new ConflictError('Phone number already exists');
    }

    return partnersRepo.updateCustomer(id, data);
  },

  async softDelete(id) {
    await this.getCustomerById(id); // ensure exists
    await partnersRepo.softDelete(id);
  },

  async hardDelete(id) {
    await this.getCustomerById(id);
    await partnersRepo.hardDelete(id);
  },
};

module.exports = partnersService;
```

- [ ] **Step 4: Create thin partners routes**

```javascript
// api/src/domains/partners/partners.routes.js
'use strict';

const express = require('express');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { errorHandler } = require('../../shared/responseHelper');
const partnersService = require('./partners.service');

const router = express.Router();

router.get('/',
  requireAuth,
  requirePermission('customers.view'),
  async (req, res, next) => {
    try {
      const result = await partnersService.listCustomers(req.query);
      return res.json(result);
    } catch (err) { next(err); }
  }
);

router.get('/:id',
  requireAuth,
  requirePermission('customers.view'),
  async (req, res, next) => {
    try {
      const customer = await partnersService.getCustomerById(req.params.id);
      return res.json(customer);
    } catch (err) { next(err); }
  }
);

router.post('/',
  requireAuth,
  requirePermission('customers.add'),
  async (req, res, next) => {
    try {
      const customer = await partnersService.createCustomer(req.body);
      return res.status(201).json(customer);
    } catch (err) { next(err); }
  }
);

router.put('/:id',
  requireAuth,
  requirePermission('customers.edit'),
  async (req, res, next) => {
    try {
      const customer = await partnersService.updateCustomer(req.params.id, req.body);
      return res.json(customer);
    } catch (err) { next(err); }
  }
);

router.patch('/:id/soft-delete',
  requireAuth,
  requirePermission('customers.delete'),
  async (req, res, next) => {
    try {
      await partnersService.softDelete(req.params.id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.delete('/:id/hard-delete',
  requireAuth,
  requirePermission('customers.hard_delete'),
  async (req, res, next) => {
    try {
      await partnersService.hardDelete(req.params.id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.use(errorHandler);

module.exports = router;
```

- [ ] **Step 5: Write service unit test**

```javascript
// api/src/domains/partners/__tests__/partners.service.test.js
'use strict';

// Mock the repository
jest.mock('../partners.repository', () => ({
  checkPhoneUnique: jest.fn(),
  checkEmailUnique: jest.fn(),
  getCustomerById: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  softDelete: jest.fn(),
  hardDelete: jest.fn(),
}));

const partnersService = require('../partners.service');
const partnersRepo = require('../partners.repository');

describe('partners.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerById', () => {
    it('returns customer when found', async () => {
      partnersRepo.getCustomerById.mockResolvedValue({ id: 'uuid-1', name: 'Test' });
      const result = await partnersService.getCustomerById('uuid-1');
      expect(result.name).toBe('Test');
    });

    it('throws NotFoundError when not found', async () => {
      partnersRepo.getCustomerById.mockResolvedValue(null);
      await expect(partnersService.getCustomerById('nonexistent'))
        .rejects.toThrow('Customer with id nonexistent not found');
    });
  });

  describe('createCustomer', () => {
    it('creates customer with valid data', async () => {
      partnersRepo.checkPhoneUnique.mockResolvedValue(true);
      partnersRepo.createCustomer.mockResolvedValue({ id: 'new-id', name: 'New Customer' });

      const result = await partnersService.createCustomer({
        name: 'New Customer',
        phone: '0901234567',
      });

      expect(result.name).toBe('New Customer');
      expect(partnersRepo.createCustomer).toHaveBeenCalledTimes(1);
    });

    it('throws ValidationError with invalid data', async () => {
      await expect(partnersService.createCustomer({ name: '' }))
        .rejects.toThrow('name');
    });

    it('throws ConflictError on duplicate phone', async () => {
      partnersRepo.checkPhoneUnique.mockResolvedValue(false);

      await expect(partnersService.createCustomer({
        name: 'New Customer',
        phone: '0901234567',
      })).rejects.toThrow('Phone number already exists');
    });
  });

  describe('updateCustomer', () => {
    it('updates customer with valid data', async () => {
      partnersRepo.getCustomerById.mockResolvedValue({ id: 'uuid-1', name: 'Old', phone: '090' });
      partnersRepo.checkPhoneUnique.mockResolvedValue(true);
      partnersRepo.updateCustomer.mockResolvedValue({ id: 'uuid-1', name: 'Updated' });

      const result = await partnersService.updateCustomer('uuid-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd api && npx jest domains/partners/__tests__/partners.service.test.js --verbose
```
Expected: All tests pass.

- [ ] **Step 7: Update server.js mount**

```javascript
// In api/src/server.js, replace:
// const partnersRoutes = require('./routes/partners');
// app.use('/api/Partners', partnersRoutes);

// With:
const partnersRoutes = require('./domains/partners/partners.routes');
app.use('/api/Partners', partnersRoutes);
```

- [ ] **Step 8: Commit**

```bash
git add api/src/domains/partners/ api/src/server.js
git commit -m "refactor: extract partners domain into hexagonal architecture

Extracts the 764-line partners.js route into:
- partners.repository.js (SQL queries only)
- partners.service.js (business logic, validation, uniqueness)
- partners.routes.js (thin Express handlers)
- partners.schema.js (Zod validation)
- __tests__/ (unit tests for service layer)

Old route file kept for reference but no longer mounted."
```

---

### Task 1.3: Extract Payments Domain

- [ ] Follow the same pattern as Task 1.2:

```
api/src/domains/payments/
├── payments.repository.js    # SQL queries: list, deposits, allocations, receipt generation
├── payments.service.js       # Business logic: classification, residual validation, void, refund
├── payments.routes.js        # Thin routes
├── payments.schema.js        # Zod schemas for PaymentCreate, PaymentUpdate, RefundSchema
└── __tests__/
    └── payments.service.test.js
```

This extracts the 885-line `payments.js` — the single most overloaded file in the codebase.

---

### Remaining Domains (Tasks 1.4 - 1.10)

Extract each remaining domain following the same pattern:

| Task | Domain | Old File (lines) | Priority |
|------|--------|------------------|----------|
| 1.4 | Appointments | `routes/appointments.js` (706) | HIGH |
| 1.5 | Feedback | `routes/feedback.js` (644) | MEDIUM |
| 1.6 | Employees | `routes/employees.js` (507) | HIGH |
| 1.7 | Reports | `routes/reports.js` (548) | MEDIUM |
| 1.8 | Products/ServiceCatalog | `routes/products.js` (328) | HIGH |
| 1.9 | SaleOrders | `routes/saleOrders.js` (442) | HIGH |
| 1.10 | Auth | `routes/auth.js` + middleware | HIGH |
| 1.11 | MonthlyPlans | `routes/monthlyPlans.js` (467) | MEDIUM |
| 1.12 | Remaining domains | permissions, dotKhams, etc. | LOW |

Each domain extraction should:
1. Create `api/src/domains/<name>/` directory
2. Write `schema.js`, `repository.js`, `service.js`, `routes.js`
3. Write `__tests__/service.test.js` with at least 5-8 test cases
4. Update `server.js` mount
5. Run `npx jest domains/<name>/` to verify

---

## 🏗️ Phase 2: Frontend — Domain Feature Organization

### Architecture Target

```
website/src/
├── App.tsx
├── main.tsx
├── features/                    # NEW: Feature-based organization
│   ├── customers/
│   │   ├── CustomersPage.tsx    # Was pages/Customers.tsx (907 lines → split)
│   │   ├── CustomerProfile.tsx  # Was components/customer/CustomerProfile.tsx (806 lines)
│   │   ├── CustomerForm/
│   │   │   ├── AddCustomerForm.tsx
│   │   │   ├── BasicInfoTab.tsx
│   │   │   ├── MedicalTab.tsx
│   │   │   ├── EInvoiceTab.tsx
│   │   │   └── useAddCustomerForm.ts   # Form logic hook (544 lines → split)
│   │   ├── shared/
│   │   │   ├── CustomerSelector.tsx
│   │   │   └── CustomerSearchBar.tsx
│   │   └── api/
│   │       └── customers.api.ts  # Was lib/api/partners.ts
│   ├── appointments/
│   │   ├── AppointmentsPage.tsx
│   │   ├── CalendarPage.tsx      # Was pages/Calendar.tsx (638 lines)
│   │   ├── AppointmentForm/
│   │   ├── shared/
│   │   └── api/
│   ├── payments/
│   │   ├── PaymentPage.tsx       # Was pages/Payment.tsx
│   │   ├── PaymentForm/
│   │   ├── DepositWallet/
│   │   ├── MonthlyPlanCreator/
│   │   └── api/
│   ├── services/
│   │   ├── ServiceCatalogPage.tsx # Was pages/ServiceCatalog.tsx (694 lines)
│   │   ├── ServiceRecords.tsx    # Treatment records
│   │   ├── shared/
│   │   └── api/
│   ├── employees/
│   │   ├── EmployeesPage.tsx
│   │   ├── EmployeeForm/
│   │   └── api/
│   ├── reports/
│   │   ├── ReportsPage.tsx
│   │   └── api/
│   └── auth/
│       ├── LoginPage.tsx
│       └── AuthContext.tsx
├── shared/                       # Truly shared: design system, primitives
│   ├── ui/                       # Low-level UI components
│   │   ├── Button.tsx
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Modal.tsx
│   │   └── FormShell.tsx        # UNIFIED modal architecture
│   ├── hooks/                    # Shared hooks
│   │   ├── useDebounce.ts
│   │   └── useOnClickOutside.ts
│   ├── utils/
│   │   ├── apiFetch.ts          # HTTP client
│   │   └── formatters.ts
│   └── types/                    # Shared TypeScript types
│       └── common.ts
├── layouts/
│   └── MainLayout.tsx            # Sidebar + Header + Main
└── i18n/                         # Unchanged
```

### Key Frontend Restructuring Rules

1. **Domain colocation**: Everything a feature needs lives in `features/<domain>/`
2. **Feature isolation**: A feature can only import from `shared/`, not from other features
3. **Unified modal**: Only ONE modal component in `shared/ui/` — `FormShell`
4. **Feature-level API hooks**: Each feature exports its data-fetching hooks
5. **No page > 500 lines**: Split large pages into sub-components

---

### Task 2.1: Unify Modal Architecture

**Goal:** Eliminate the 3 competing modal implementations and use a single `FormShell` component.

**Files:**
- Create: `website/src/shared/ui/FormShell.tsx` (unified)
- Delete/archive: Legacy modal implementations
- Migrate: All feature modals to use `FormShell`

- [ ] **Step 1: Define UNIFIED FormShell interface**

```typescript
// website/src/shared/ui/FormShell.tsx
import React, { useEffect, useRef } from 'react';

interface FormShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
}

export const FormShell: React.FC<FormShellProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  loading = false,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* Modal panel */}
      <div
        className={`relative ${sizeClasses[size]} w-full mx-4 max-h-[90vh] flex flex-col
                    bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add website/src/shared/ui/FormShell.tsx
git commit -m "feat: add unified FormShell modal component

Single modal architecture replacing 3 competing implementations.
All feature modals will migrate to this component."
```

---

### Task 2.2: Split Customers Page (907 lines → multiple files)

**Goal:** Break the massive `Customers.tsx` into smaller focused components.

**Target structure:**
```
features/customers/
├── CustomersPage.tsx            # ~150 lines: layout + orchestrator
├── CustomersTable.tsx           # ~150 lines: DataTable config
├── CustomersFilters.tsx         # ~80 lines: search + filter bar
├── CustomersStatsBar.tsx        # ~60 lines: aggregate stats
├── CustomerActionButtons.tsx    # ~60 lines: add/edit/delete actions
└── CustomersToolbar.tsx         # ~50 lines: top toolbar
```

- [ ] **Step 1: Extract CustomersTable**

```typescript
// features/customers/CustomersTable.tsx
import { DataTable } from '@/shared/ui/DataTable';
import { useCustomers } from './api/customers.api';

// ... paginated, sortable table
```

- [ ] Continue extracting sub-components from the 907-line monolith.

---

## 📊 Phase 3: Schema Consolidation

### Task 3.1: Add Consistent Status Enum to Appointments

**Goal:** Align frontend and backend appointment states.

Add a database-level enum constraint:

```sql
-- api/src/db/migrations/004_add_appointment_status_enum.sql
CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'arrived',
  'in_progress', 'completed', 'cancelled'
);

ALTER TABLE dbo.appointments
ALTER COLUMN state TYPE appointment_status USING
  CASE state
    WHEN 'draft' THEN 'scheduled'::appointment_status
    WHEN 'in Examination' THEN 'in_progress'::appointment_status
    WHEN 'in-progress' THEN 'in_progress'::appointment_status
    WHEN 'done' THEN 'completed'::appointment_status
    ELSE state::appointment_status
  END;
```

Update frontend constants to match:

```typescript
// website/src/constants/index.ts
export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'status.scheduled', color: '...' },
  { value: 'confirmed', label: 'status.confirmed', color: '...' },
  { value: 'arrived', label: 'status.arrived', color: '...' },
  { value: 'in_progress', label: 'status.in_progress', color: '...' },
  { value: 'completed', label: 'status.completed', color: '...' },
  { value: 'cancelled', label: 'status.cancelled', color: '...' },
];
```

---

## 📈 Execution Priority Matrix

| Priority | Phase | What | Impact | Effort |
|----------|-------|------|--------|--------|
| **P0** | Phase 0.1 | Deduplicate permission resolution | Prevents silent 403 bugs | 1-2 hrs |
| **P0** | Phase 0.2 | Remove dead routes | Clean mount surface | 30 min |
| **P0** | Phase 0.3 | Add payment_category column | Eliminates fragile heuristic | 2 hrs |
| **P1** | Phase 1.1 | Base repository + error types | Foundation for all domains | 2 hrs |
| **P1** | Phase 1.2 | Extract Partners domain | Biggest route (764 lines) | 4 hrs |
| **P1** | Phase 1.3 | Extract Payments domain | Most complex logic (885 lines) | 4 hrs |
| **P1** | Phase 1.4 | Extract Appointments domain | High blast radius (706 lines) | 3 hrs |
| **P1** | Phase 1.8 | Extract Products/ServiceCatalog | Naming confusion fix | 2 hrs |
| **P2** | Phase 2.1 | Unify modal architecture | 3 modals → 1 | 3 hrs |
| **P2** | Phase 2.2 | Split Customers page | 907 → multiple files | 3 hrs |
| **P2** | Phase 3.1 | Appointment status enum | Frontend/backend alignment | 2 hrs |
| **P3** | Phase 1.5-1.12 | Remaining domain extractions | Clean architecture | 2-4 hrs each |

---

## 🚀 Execution Choice

**Plan complete and saved.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task from the priority list, review between tasks, fast iteration. Start with the 3 P0 critical fixes.

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints.

**Which approach?** If you choose #1, I'll start dispatching P0 fixes immediately.
