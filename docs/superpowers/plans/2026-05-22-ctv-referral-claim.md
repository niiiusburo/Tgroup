# CTV Referral Claim + Eligibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a CTV exclusively claim a client via a "Referral Start" service card, hold the claim for a rolling 6 months (from the latest of the card date or last paid service), hard-block booking a client actively claimed by another CTV, and credit the owning CTV only while the claim is active.

**Architecture:** Derive all claim state from existing data (`partners.referred_by_ctv_id` + a `saleorderlines` "Referral Start" card + payment dates) via one shared helper `getReferralClaimStatus`. No new claim tables. One additive column (`commission_settings.referral_start_product_id`) points at an admin-created product. A new CTV booking endpoint enforces eligibility and creates client + card + appointment atomically.

**Tech Stack:** Node/Express (CommonJS, `dbo` schema, `getDb(lob)`/`getQuery(req)`), Postgres, React + Vite + Tailwind, Jest (api), Vitest + tsc (web).

**Worktree:** `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission` (branch `feat/ctv-mlm-commission`).

**Reference files (read before starting):**
- `api/src/services/commissionEngine.js` — `resolveRecipient`, `createEarningsForPayment`, dual tx/queryRows pattern.
- `api/src/routes/saleOrders/createSaleOrder.js` — exact `saleorders` + `saleorderlines` insert pattern.
- `api/src/routes/partners/resolveHandler.js` — the `/resolve` handler to extend.
- `api/src/routes/ctv.js` — existing CTV routes + `safeQueryRows` helper + auth pattern.
- `api/migrations/049_add_commission_level_config.sql` — migration style (guarded `schema_migrations`).
- `website/src/pages/CtvDashboard.tsx` — the `+ Client` sheet to extend into a booking.
- `website/src/lib/api/ctv.ts` — frontend API client to extend.
- `docs/superpowers/specs/2026-05-22-ctv-referral-claim-design.md` — the spec.

---

### Task 1: Migration — `referral_start_product_id` on commission_settings

**Files:**
- Create: `api/migrations/050_add_referral_start_product.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 050_add_referral_start_product.sql
-- Additive + reversible. Both tdental + tcosmetic, schema dbo.
-- Adds a pointer to the admin-created "Referral Start" product used as the
-- referral-claim anchor card. NULL until the admin configures it.

ALTER TABLE dbo.commission_settings
  ADD COLUMN IF NOT EXISTS referral_start_product_id UUID NULL;

-- ROLLBACK:
--   ALTER TABLE dbo.commission_settings DROP COLUMN IF EXISTS referral_start_product_id;

DO $$ BEGIN
  IF to_regclass('dbo.schema_migrations') IS NOT NULL THEN
    INSERT INTO dbo.schema_migrations (filename, applied_at)
    VALUES ('050_add_referral_start_product.sql', now())
    ON CONFLICT (filename) DO NOTHING;
  END IF;
END $$;
```

- [ ] **Step 2: Apply to local dev DBs and verify**

Run:
```bash
for db in tdental_demo tcosmetic_demo; do
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d $db -v ON_ERROR_STOP=1 -f api/migrations/050_add_referral_start_product.sql
done
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "\d dbo.commission_settings" | grep referral_start_product_id
```
Expected: column `referral_start_product_id | uuid` present; no errors.

- [ ] **Step 3: Commit**

```bash
git add api/migrations/050_add_referral_start_product.sql
git commit -m "feat(referral): migration 050 — commission_settings.referral_start_product_id"
```

---

### Task 2: `getReferralClaimStatus` helper + tests

**Files:**
- Create: `api/src/services/referralClaim.js`
- Test: `api/src/services/__tests__/referralClaim.test.js`

The anchor = `max(earliest Referral Start card date, latest paid-service date)`. Active while `anchor + 6 months >= asOf`.

- [ ] **Step 1: Write the failing test**

```js
const { computeClaim } = require('../referralClaim');

describe('computeClaim (pure date logic)', () => {
  const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 0; // placeholder; use date math below

  test('anchor is the later of card date and last paid service', () => {
    const r = computeClaim({
      ownerCtvId: 'ctv-1',
      ownerName: 'A',
      referralCardDate: '2026-01-01T00:00:00Z',
      lastPaidServiceDate: '2026-03-01T00:00:00Z',
      asOf: new Date('2026-06-01T00:00:00Z'),
    });
    expect(r.anchorDate.toISOString().slice(0, 10)).toBe('2026-03-01');
    // expires 6 months after 2026-03-01 => 2026-09-01, active on 2026-06-01
    expect(r.active).toBe(true);
  });

  test('lapses exactly after 6 months of no paid service', () => {
    const r = computeClaim({
      ownerCtvId: 'ctv-1', ownerName: 'A',
      referralCardDate: '2026-01-01T00:00:00Z',
      lastPaidServiceDate: null,
      asOf: new Date('2026-07-02T00:00:00Z'), // > 2026-07-01
    });
    expect(r.active).toBe(false);
  });

  test('no owner => no claim', () => {
    const r = computeClaim({ ownerCtvId: null, ownerName: null, referralCardDate: null, lastPaidServiceDate: null, asOf: new Date() });
    expect(r.ownerCtvId).toBeNull();
    expect(r.active).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest api/src/services/__tests__/referralClaim.test.js -v`
Expected: FAIL — "computeClaim is not a function".

- [ ] **Step 3: Implement `referralClaim.js`**

```js
'use strict';

const { getDb: defaultGetDb } = require('../db');

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Pure: compute claim status from already-fetched dates. */
function computeClaim({ ownerCtvId, ownerName, referralCardDate, lastPaidServiceDate, asOf = new Date() }) {
  if (!ownerCtvId) {
    return { ownerCtvId: null, ownerName: null, anchorDate: null, expiresAt: null, active: false };
  }
  const dates = [referralCardDate, lastPaidServiceDate].filter(Boolean).map((d) => new Date(d));
  const anchorDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  const expiresAt = anchorDate ? addMonths(anchorDate, 6) : null;
  const active = !!expiresAt && expiresAt.getTime() >= new Date(asOf).getTime();
  return { ownerCtvId, ownerName, anchorDate, expiresAt, active };
}

/**
 * Fetch + compute claim status for a client in a given LOB DB.
 * @param {string} clientId
 * @param {'dental'|'cosmetic'} lob
 * @param {object} opts { asOf?, txClient?, getDb?, referralStartProductId? }
 */
async function getReferralClaimStatus(clientId, lob, opts = {}) {
  const { asOf = new Date(), txClient = null, getDb: injectedGetDb = null } = opts;
  const db = txClient || (injectedGetDb || defaultGetDb)(lob);
  const run = txClient
    ? (sql, p) => txClient.query(sql, p).then((r) => r.rows)
    : (sql, p) => db.queryRows(sql, p);

  const ownerRows = await run(
    `SELECT p.referred_by_ctv_id, o.name AS owner_name
       FROM dbo.partners p
       LEFT JOIN dbo.partners o ON o.id = p.referred_by_ctv_id
      WHERE p.id = $1`,
    [clientId]
  );
  const ownerCtvId = ownerRows[0]?.referred_by_ctv_id || null;
  if (!ownerCtvId) return computeClaim({ ownerCtvId: null });

  // earliest Referral Start card date
  const settings = await run(`SELECT referral_start_product_id FROM dbo.commission_settings LIMIT 1`, []);
  const refProductId = settings[0]?.referral_start_product_id || null;
  let referralCardDate = null;
  if (refProductId) {
    const cardRows = await run(
      `SELECT MIN(so.datecreated) AS d
         FROM dbo.saleorderlines sol
         JOIN dbo.saleorders so ON so.id = sol.orderid
        WHERE so.partnerid = $1 AND sol.productid = $2 AND sol.isdeleted = false`,
      [clientId, refProductId]
    );
    referralCardDate = cardRows[0]?.d || null;
  }

  // latest paid service date (positive payment)
  const payRows = await run(
    `SELECT MAX(pay.paymentdate) AS d
       FROM dbo.payments pay
      WHERE pay.partnerid = $1 AND pay.amount > 0`,
    [clientId]
  );
  const lastPaidServiceDate = payRows[0]?.d || null;

  return computeClaim({
    ownerCtvId,
    ownerName: ownerRows[0]?.owner_name || null,
    referralCardDate,
    lastPaidServiceDate,
    asOf,
  });
}

module.exports = { computeClaim, getReferralClaimStatus };
```

> NOTE for implementer: verify the real column names for the payments date and partner FK before relying on them — run `\d dbo.payments` on the dev DB. The plan assumes `payments.partnerid` and `payments.paymentdate`; if they differ (e.g. `customerid`, `date`), adjust the SQL in `getReferralClaimStatus` AND add a test asserting the query shape. Do not guess.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx jest api/src/services/__tests__/referralClaim.test.js -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify payments column names against the DB**

Run: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "\d dbo.payments" | grep -iE "partner|customer|date|amount"`
If names differ from `partnerid`/`paymentdate`, fix the SQL in Step 3.

- [ ] **Step 6: Commit**

```bash
git add api/src/services/referralClaim.js api/src/services/__tests__/referralClaim.test.js
git commit -m "feat(referral): getReferralClaimStatus helper + computeClaim tests"
```

---

### Task 3: Commission engine — credit only while claim active

**Files:**
- Modify: `api/src/services/commissionEngine.js` (`resolveRecipient`, `createEarningsForPayment`)
- Test: `api/src/services/__tests__/commissionEngine.test.js`

- [ ] **Step 1: Write the failing test (add to existing describe block)**

```js
test('CTV credit is suppressed when the claim has lapsed as of payment date', async () => {
  const clientRow = { id: 'cli-lapsed', referred_by_ctv_id: 'ctv-old' };
  // referralClaim helper injected to report lapsed
  const fakeClaim = { getReferralClaimStatus: async () => ({ ownerCtvId: 'ctv-old', active: false }) };
  const result = await commissionEngine.resolveRecipient({
    clientRow, lob: 'dental', asOf: new Date('2027-01-01'),
    referralClaim: fakeClaim, getDb: mockGetDb,
  });
  expect(result).toBeNull(); // no consultation/salestaff either => null
});

test('CTV credit allowed when claim active as of payment date', async () => {
  const clientRow = { id: 'cli-active', referred_by_ctv_id: 'ctv-new' };
  const fakeClaim = { getReferralClaimStatus: async () => ({ ownerCtvId: 'ctv-new', active: true }) };
  const result = await commissionEngine.resolveRecipient({
    clientRow, lob: 'dental', asOf: new Date('2026-06-01'),
    referralClaim: fakeClaim, getDb: mockGetDb,
  });
  expect(result).toEqual({ recipient_partner_id: 'ctv-new', source: 'ctv' });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx jest api/src/services/__tests__/commissionEngine.test.js -t "claim" -v`
Expected: FAIL (resolveRecipient ignores claim, returns ctv even when lapsed).

- [ ] **Step 3: Modify `resolveRecipient`**

In `api/src/services/commissionEngine.js`, change the signature and the CTV branch:

```js
async function resolveRecipient({ clientRow, lob, txClient = null, getDb: injectedGetDb = null, asOf = new Date(), referralClaim = null }) {
  if (!clientRow) return null;

  // 1. CTV referrer — only if the claim is ACTIVE as of the payment date.
  if (clientRow.referred_by_ctv_id) {
    const claimSvc = referralClaim || require('./referralClaim');
    const status = await claimSvc.getReferralClaimStatus(clientRow.id, lob, { asOf, txClient, getDb: injectedGetDb });
    if (status.active && status.ownerCtvId) {
      return { recipient_partner_id: status.ownerCtvId, source: 'ctv' };
    }
    // lapsed: fall through to consultation/salestaff (do NOT credit the stale CTV)
  }

  // 2 + 3 unchanged (cosmetic consultation, dental salestaff) ...
```

Keep the rest of the function (consultation + salestaff branches) exactly as-is below.

- [ ] **Step 4: Pass `asOf` from `createEarningsForPayment`**

In `createEarningsForPayment`, derive the payment date and pass it through:

```js
const asOf = payment.paymentdate || payment.payment_date || new Date();
const recipient = await resolveRecipient({ clientRow, lob, txClient, getDb: injectedGetDb, asOf });
```

- [ ] **Step 5: Update the existing CTV split tests to inject an active claim**

The existing "single-level CTV" and "MLM split" tests now call `getReferralClaimStatus`. Add to those tests a `referralClaim` injection returning `{ ownerCtvId: <the ctv>, active: true }`, passed into `createEarningsForPayment` via a new `referralClaim` arg, OR mock the module. Simplest: in those tests, mock `../referralClaim`:

```js
jest.mock('../referralClaim', () => ({
  getReferralClaimStatus: jest.fn(async () => ({ ownerCtvId: '00000000-0000-0000-0000-000000000ctv', active: true })),
  computeClaim: jest.requireActual('../referralClaim').computeClaim,
}));
```
Place at top of the test file. Adjust the returned `ownerCtvId` per test where the chain head differs (use `mockReturnValueOnce`).

- [ ] **Step 6: Run full engine suite**

Run: `npx jest api/src/services/__tests__/commissionEngine.test.js -v`
Expected: PASS (all, including the 2 new claim tests).

- [ ] **Step 7: Commit**

```bash
git add api/src/services/commissionEngine.js api/src/services/__tests__/commissionEngine.test.js
git commit -m "feat(referral): engine credits CTV only while claim active as of payment date"
```

---

### Task 4: `createReferralStartCard` helper

**Files:**
- Create: `api/src/services/referralCard.js`
- Test: `api/src/services/__tests__/referralCard.test.js`

Creates a zero-amount sale order + line referencing `referral_start_product_id` for a client. Mirrors `createSaleOrder.js`.

- [ ] **Step 1: Write the failing test**

```js
const { createReferralStartCard } = require('../referralCard');

test('throws REFERRAL_PRODUCT_NOT_CONFIGURED when settings has no product id', async () => {
  const q = jest.fn(async (sql) => {
    if (/referral_start_product_id/.test(sql)) return [{ referral_start_product_id: null }];
    return [];
  });
  await expect(createReferralStartCard({ clientId: 'c1', lob: 'dental', runQuery: q }))
    .rejects.toThrow('REFERRAL_PRODUCT_NOT_CONFIGURED');
});

test('inserts a saleorder + saleorderline for the referral product', async () => {
  const calls = [];
  const q = jest.fn(async (sql, params) => {
    calls.push(sql);
    if (/referral_start_product_id/.test(sql)) return [{ referral_start_product_id: 'prod-ref' }];
    if (/nextval/.test(sql)) return [{ seq: 7 }];
    return [{}];
  });
  await createReferralStartCard({ clientId: 'c1', lob: 'dental', runQuery: q });
  expect(calls.some((s) => /INSERT INTO saleorders/.test(s))).toBe(true);
  expect(calls.some((s) => /INSERT INTO saleorderlines/.test(s))).toBe(true);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx jest api/src/services/__tests__/referralCard.test.js -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `referralCard.js`**

```js
'use strict';

const crypto = require('crypto');
const { getDb: defaultGetDb } = require('../db');
const { getVietnamYear } = require('../lib/dateUtils');

/**
 * Create the zero-amount "Referral Start" card (saleorder + line) for a client.
 * @param {object} args { clientId, lob, getDb?, runQuery? (test injection) }
 */
async function createReferralStartCard({ clientId, lob, getDb: injectedGetDb = null, runQuery = null }) {
  const db = injectedGetDb ? injectedGetDb(lob) : defaultGetDb(lob);
  const q = runQuery || ((sql, p) => db.queryRows(sql, p));

  const settings = await q(`SELECT referral_start_product_id FROM dbo.commission_settings LIMIT 1`, []);
  const productId = settings[0]?.referral_start_product_id || null;
  if (!productId) {
    const err = new Error('REFERRAL_PRODUCT_NOT_CONFIGURED');
    err.code = 'REFERRAL_PRODUCT_NOT_CONFIGURED';
    throw err;
  }

  const orderId = crypto.randomUUID();
  const year = getVietnamYear();
  const seqRows = await q(`SELECT nextval('dbo.saleorder_code_seq') AS seq`, []);
  const code = `SO-${year}-${String(parseInt(seqRows[0]?.seq || '1', 10)).padStart(4, '0')}`;

  await q(
    `INSERT INTO saleorders (
       id, name, code, partnerid, quantity, unit, amounttotal, residual, totalpaid, state,
       notes, isdeleted, datecreated
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))`,
    [orderId, 'Referral Start', code, clientId, 1, null, 0, 0, 0, 'sale', 'CTV referral claim anchor', false]
  );
  await q(
    `INSERT INTO saleorderlines (
       id, orderid, productid, productname, productuomqty, pricetotal, isdeleted
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [crypto.randomUUID(), orderId, productId, 'Referral Start', 1, 0, false]
  );

  return { orderId };
}

module.exports = { createReferralStartCard };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest api/src/services/__tests__/referralCard.test.js -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/services/referralCard.js api/src/services/__tests__/referralCard.test.js
git commit -m "feat(referral): createReferralStartCard helper"
```

---

### Task 5: Extend `/api/Partners/resolve` with `referralClaim`

**Files:**
- Modify: `api/src/routes/partners/resolveHandler.js`
- Test: `api/src/routes/partners/__tests__/resolveHandler.referral.test.js` (create)

- [ ] **Step 1: Read the handler**

Run: `sed -n '1,80p' api/src/routes/partners/resolveHandler.js` — note how it resolves and the response shape (`{ matchedBy, partner }`), and how it gets the db (`getQuery(req)` or `getDb`).

- [ ] **Step 2: Write the failing test**

```js
// Build a minimal call of the handler with a mocked db that returns a matched partner,
// assert the JSON includes referralClaim with { active } when the partner has referred_by_ctv_id.
// Follow the mocking style of other partners/__tests__ files.
const { resolvePartner } = require('../resolveHandler');
// ... mock req/res + getQuery to return a partner with referred_by_ctv_id ...
test('resolve includes referralClaim for a claimed partner', async () => {
  // arrange mocks so the matched partner has referred_by_ctv_id = 'ctv-1'
  // act: await resolvePartner(req, res)
  // assert: res.json called with object containing referralClaim.ownerCtvId === 'ctv-1'
});
```
(Implementer: fill the mock bodies to match the sibling test files' patterns — read one first.)

- [ ] **Step 3: Modify the handler**

After the partner is resolved, before responding, attach claim status:

```js
const { getReferralClaimStatus } = require('../../services/referralClaim');
// ...after resolving `partner` (single match)...
let referralClaim = null;
if (partner && partner.id) {
  const lob = req.lob || 'dental';
  referralClaim = await getReferralClaimStatus(partner.id, lob, {});
}
return res.json({ matchedBy, partner, referralClaim });
```

- [ ] **Step 4: Run tests**

Run: `npx jest api/src/routes/partners/__tests__/resolveHandler.referral.test.js -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/partners/resolveHandler.js api/src/routes/partners/__tests__/resolveHandler.referral.test.js
git commit -m "feat(referral): /resolve returns referralClaim status"
```

---

### Task 6: CTV booking endpoint with eligibility gate

**Files:**
- Modify: `api/src/routes/ctv.js` (add `POST /bookings`)
- Modify: `api/src/server.js` only if a new mount is needed (it is not — `/api/ctv` already mounted)
- Test: `api/src/routes/__tests__/ctvBookings.test.js` (create)

Behavior: `POST /api/ctv/bookings` body `{ clientId?, name?, phone, lob, date, time, ... }`.
1. Resolve client by phone (or clientId). 
2. Compute claim via `getReferralClaimStatus`. If actively claimed by a **different** CTV than the caller → `400 { error: { code: 'B_CLIENT_CLAIMED', ownerName, expiresAt } }`.
3. Else: create client if new (reuse the create-CTV-client logic already in `POST /api/ctv/clients`), set `referred_by_ctv_id = caller`, call `createReferralStartCard`, then create the appointment (reuse appointment insert pattern).

- [ ] **Step 1: Write the failing test**

```js
// Mock req.user = { employeeId: 'ctv-A', is_ctv: true }, mock getReferralClaimStatus to report
// an ACTIVE claim owned by 'ctv-B'. Assert the handler responds 400 with code B_CLIENT_CLAIMED.
test('blocks booking when client actively claimed by another CTV', async () => {
  // ... arrange + act + assert res.status(400) and body.error.code === 'B_CLIENT_CLAIMED'
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx jest api/src/routes/__tests__/ctvBookings.test.js -v`
Expected: FAIL — route/handler not implemented.

- [ ] **Step 3: Implement `POST /bookings` in `api/src/routes/ctv.js`**

```js
const { getReferralClaimStatus } = require('../services/referralClaim');
const { createReferralStartCard } = require('../services/referralCard');

router.post('/bookings', requireAuth, async (req, res) => {
  const { employeeId, is_ctv: isCTV } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!isCTV) return res.status(403).json({ error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'CTV only' } });

  const { clientId: bodyClientId, name, phone, lob: bodyLob, date, time, companyId, productId } = req.body || {};
  if (!phone || !date) return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone and date are required' } });
  const lob = bodyLob === 'cosmetic' ? 'cosmetic' : 'dental';
  const db = getDb(lob);

  try {
    // 1. Find existing client by id or phone
    let clientId = bodyClientId || null;
    if (!clientId) {
      const found = await safeQueryRows(db, `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`, [phone]);
      clientId = found[0]?.id || null;
    }

    // 2. Eligibility gate
    if (clientId) {
      const claim = await getReferralClaimStatus(clientId, lob, {});
      if (claim.active && claim.ownerCtvId && claim.ownerCtvId !== employeeId) {
        return res.status(400).json({
          error: { code: 'B_CLIENT_CLAIMED', message: 'Client already active with another CTV', ownerName: claim.ownerName, expiresAt: claim.expiresAt },
        });
      }
    }

    // 3a. Create client if new (mirror POST /clients insert)
    if (!clientId) {
      const { v4: uuidv4 } = require('uuid');
      clientId = uuidv4();
      const now = new Date().toISOString();
      await safeQueryRows(db,
        `INSERT INTO dbo.partners (id, name, phone, lob_scope, referred_by_ctv_id, is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, datecreated, lastupdated)
         VALUES ($1,$2,$3,$4,$5,false,true,true,false,false,false,false,false,false,false,false,$6,$6)`,
        [clientId, name || 'Khách CTV', phone, [lob], employeeId, now]);
    } else {
      // claim (or re-claim a lapsed/unclaimed client) for this CTV
      await safeQueryRows(db, `UPDATE dbo.partners SET referred_by_ctv_id = $1, lastupdated = now() WHERE id = $2`, [employeeId, clientId]);
    }

    // 3b. Referral Start card
    await createReferralStartCard({ clientId, lob });

    // 3c. Appointment — reuse the appointments insert (see api/src/routes/appointments/mutationHandlers.js)
    const { v4: uuidv4b } = require('uuid');
    const apptId = uuidv4b();
    await safeQueryRows(db,
      `INSERT INTO dbo.appointments (id, partnerid, companyid, date, time, productid, state, isdeleted, datecreated)
       VALUES ($1,$2,$3,$4,$5,$6,'confirmed',false, now())`,
      [apptId, clientId, companyId || null, date, time || null, productId || null]);

    return res.status(201).json({ clientId, appointmentId: apptId });
  } catch (e) {
    if (e.code === 'REFERRAL_PRODUCT_NOT_CONFIGURED') {
      return res.status(409).json({ error: { code: 'REFERRAL_PRODUCT_NOT_CONFIGURED', message: 'Admin must configure the Referral Start product first' } });
    }
    console.error('[ctv POST /bookings] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

> IMPLEMENTER: verify the real `dbo.appointments` columns before relying on the insert above — run `\d dbo.appointments` and read `api/src/routes/appointments/mutationHandlers.js` for the canonical insert (column names, required NOT NULLs, time/date types). Adjust the INSERT to match exactly; do not guess.

- [ ] **Step 4: Run tests**

Run: `npx jest api/src/routes/__tests__/ctvBookings.test.js -v`
Expected: PASS (block case).

- [ ] **Step 5: `node --check`**

Run: `node --check api/src/routes/ctv.js`
Expected: no output (OK).

- [ ] **Step 6: Commit**

```bash
git add api/src/routes/ctv.js api/src/routes/__tests__/ctvBookings.test.js
git commit -m "feat(referral): POST /api/ctv/bookings with eligibility gate + Referral Start card"
```

---

### Task 7: Frontend — CTV panel booking + `B_CLIENT_CLAIMED` handling

**Files:**
- Modify: `website/src/lib/api/ctv.ts` (add `createBooking`)
- Modify: `website/src/pages/CtvDashboard.tsx` (extend the `+ Client` sheet into a booking with date/time; show the claimed-block error)
- Test: `website/src/lib/api/__tests__/ctv.booking.test.ts` (create)

- [ ] **Step 1: Add API client + failing test**

In `website/src/lib/api/ctv.ts`:
```ts
export interface CreateBookingInput {
  clientId?: string;
  name?: string;
  phone: string;
  lob: 'dental' | 'cosmetic';
  date: string;   // ISO date
  time?: string;
  companyId?: string;
  productId?: string;
}
export async function createBooking(input: CreateBookingInput): Promise<{ clientId: string; appointmentId: string }> {
  return apiFetch('/ctv/bookings', { method: 'POST', body: input });
}
```
Test (`ctv.booking.test.ts`): mock `apiFetch`, assert `createBooking` calls `/ctv/bookings` with method POST and the body. Follow `website/src/lib/api/__tests__/apiFetch.lob.test.ts` style.

- [ ] **Step 2: Run web test**

Run: `cd website && npx vitest run src/lib/api/__tests__/ctv.booking.test.ts`
Expected: FAIL then (after step 1 code) PASS.

- [ ] **Step 3: Extend the `+ Client` sheet in `CtvDashboard.tsx`**

Add `date` (and optional `time`) fields to the client form state, and change `handleClientSubmit` to call `createBooking` instead of (or in addition to) `referClient`. On a thrown error with `code === 'B_CLIENT_CLAIMED'`, show an inline message: `Khách đã thuộc CTV khác (đến <expiresAt>)`. Reuse the existing sheet error-display block. Keep `referClient` for the no-booking case if desired, but the primary action now books.

```ts
// inside handleClientSubmit
try {
  await createBooking({ name: clientForm.name, phone: clientForm.phone, lob: clientForm.lob, date: clientForm.date });
  // success UI
} catch (e: any) {
  if (e?.code === 'B_CLIENT_CLAIMED') setClientError(`Khách đã thuộc CTV khác đến ${new Date(e.body?.error?.expiresAt).toLocaleDateString('vi-VN')}`);
  else setClientError(e?.message || 'Lỗi tạo lịch');
}
```
(Import `createBooking` from `@/lib/api/ctv`. Confirm how `apiFetch` surfaces `.code`/`.body` — see `core.ts` `ApiError`.)

- [ ] **Step 4: Typecheck + build**

Run: `cd website && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/api/ctv.ts website/src/lib/api/__tests__/ctv.booking.test.ts website/src/pages/CtvDashboard.tsx
git commit -m "feat(referral): CTV panel booking + claimed-client block"
```

---

### Task 8: Customer profile — "Referred by" block

**Files:**
- Modify: `website/src/pages/Customers/CustomerProfileContent.tsx`
- (Data) the profile already fetches the partner; surface `referred_by_ctv_id` + claim. Easiest: call `apiFetch('/Partners/resolve', { params: { key: partner.phone } })` is wasteful — instead read claim from the partner detail if present, else add a tiny `GET /api/Ctvs/claim?clientId=` is overkill. Use the `/resolve` `referralClaim` already returned where the profile is loaded, OR add `referralClaim` to the partner detail response.

- [ ] **Step 1: Decide data source (no new endpoint)**

Read `api/src/routes/partners.js` `GET /:id` handler. Add `referralClaim` to its response using `getReferralClaimStatus(partner.id, lob)` (same 3 lines as Task 5). Add a test mirroring Task 5.

- [ ] **Step 2: Render the block in `CustomerProfileContent.tsx`**

Where the customer header renders, add (only when `profile.referralClaim?.ownerCtvId`):
```tsx
{profile.referralClaim?.ownerCtvId && (
  <div className="text-sm text-gray-600">
    Người giới thiệu (CTV): <span className="font-medium">{profile.referralClaim.ownerName}</span>
    <span className={profile.referralClaim.active ? 'text-emerald-600 ml-2' : 'text-gray-400 ml-2'}>
      {profile.referralClaim.active ? `· còn hiệu lực đến ${new Date(profile.referralClaim.expiresAt).toLocaleDateString('vi-VN')}` : '· đã hết hạn'}
    </span>
  </div>
)}
```
Add the `referralClaim` field to the profile TypeScript type used by the page.

- [ ] **Step 3: Typecheck**

Run: `cd website && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/partners.js website/src/pages/Customers/CustomerProfileContent.tsx
git commit -m "feat(referral): show 'Referred by CTV' + claim status on customer profile"
```

---

### Task 9: Authority docs + version bump + verification

**Files:**
- Modify: `docs/CHANGELOG.md`, `website/public/CHANGELOG.json`, `website/package.json`, `product-map/contracts/api-index.md`, `BEHAVIOR.md` (register `B_CLIENT_CLAIMED`, `REFERRAL_PRODUCT_NOT_CONFIGURED`), `testbright.md`, `product-map/unknowns.md` (admin-override parked).

- [ ] **Step 1: Bump web version** (`website/package.json` patch bump) and add a `CHANGELOG.json` entry at the top (valid JSON — verify with `node -e "JSON.parse(require('fs').readFileSync('website/public/CHANGELOG.json','utf8'))"`).

- [ ] **Step 2: Add `docs/CHANGELOG.md` entry** under the `feat/ctv-mlm-commission` unreleased block describing migration 050, the helpers, the engine gate, `/bookings`, `/resolve` extension, and the profile block.

- [ ] **Step 3: Register endpoints + error codes** in `product-map/contracts/api-index.md` (POST `/api/ctv/bookings`, `referralClaim` on `/resolve` and `/Partners/:id`) and `BEHAVIOR.md` (`B_CLIENT_CLAIMED`, `REFERRAL_PRODUCT_NOT_CONFIGURED`). Park admin force-reassign in `product-map/unknowns.md`.

- [ ] **Step 4: Append NK3 acceptance checks** to `testbright.md` (CTV books new client → client + Referral Start card + appointment; second CTV blocked `B_CLIENT_CLAIMED`; profile shows Referred by; lapsed claim earns no credit).

- [ ] **Step 5: Run full suites**

Run:
```bash
cd api && npx jest 2>&1 | tail -5
cd ../website && npx tsc --noEmit --pretty false && npx vite build 2>&1 | tail -3
npx depcruise --output-type err src 2>&1 | tail -3
```
Expected: api jest green, tsc clean, build OK, depcruise OK.

- [ ] **Step 6: Commit**

```bash
git add docs/CHANGELOG.md website/public/CHANGELOG.json website/package.json product-map/contracts/api-index.md BEHAVIOR.md testbright.md product-map/unknowns.md
git commit -m "docs(referral): authority docs, error codes, version bump for referral-claim"
```

---

## Deployment (after all tasks green)

Same NK3 path as the prior feature (NK/NK2 untouched):
1. Apply migration 050 to `tdental_smoketest` + `tcosmetic_smoketest` via `docker exec tgroup-db psql`.
2. Admin step: create the "Referral Start" product (zero price) in the catalog on NK3, then set `commission_settings.referral_start_product_id` to it (a quick `UPDATE` or a small admin control — note in unknowns if no UI yet).
3. `git archive HEAD` → scp tarball → backup+swap `app/` → `docker compose -f runtime/docker-compose.nk3.yml up -d --build api web`.
4. Live E2E with `Origin: https://ctv.2checkin.com`: CTV books a new client; a second CTV is blocked; profile shows "Referred by".

## Notes / parked (unknowns.md)
- Admin force-reassign of an active claim.
- A UI to set `referral_start_product_id` (v1 may set it via SQL).
- Lapse-warning notifications to CTVs.
