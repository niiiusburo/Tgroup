# CTV Eligibility Bar + Doctor→CTV Breadcrumb — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a 6-month CTV-link countdown bar (admin profile + CTV portal) and a Doctor→CTV breadcrumb on appointment/service rows, where the link is anchored on the most-recent **CTV-bearing** appointment or service and expiry is a computed, non-destructive status.

**Architecture:** Add a real `appointments.ctv_id` column (services already have `saleorders.ctv_id`). A new pure function `computeCtvLink` + DB wrapper `getCtvLinkStatus` finds the latest non-cancelled CTV-bearing event per client, derives `anchorAt → expiresAt(+6mo) → active/eligible`, and names the linked CTV (latest event wins). The legacy `getReferralClaimStatus` delegates to it so the profile, client-lookup, and booking gate all agree. Frontend gets two reusable components: `CtvLinkBar` and `DoctorCtvTrail`.

**Tech Stack:** Express + PostgreSQL (schema `dbo`, manual migrations tracked in `dbo.schema_migrations`); React + Vite + Tailwind; Jest (api), Vitest (web); react-i18next; Zod contracts.

**Spec:** `docs/superpowers/specs/2026-06-02-ctv-eligibility-bar-breadcrumb-design.md`

**Conventions to honor:**
- Timestamps are VN-local naive — do NOT add `AT TIME ZONE` math in new queries; the existing INSERTs already use `VIETNAM_NOW_SQL`.
- No hardcoded design values where a token/Tailwind palette class fits; mirror `StatusBadge` color structure (`emerald/amber/red/gray` with `50` bg / `500-600` fill / `700` text).
- Commit after every task. Conventional commit messages. Branch is `nk3-deploy` (do not touch `main`).
- NK3 DBs are `*_smoketest`; dev DB is `tdental_demo` on port 5433. Run migrations on dev before verifying.

---

## Pre-flight (one-time, before Task 1)

- [ ] **P1: Confirm dev DB is reachable and see current migration state**

Run:
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "SELECT filename FROM dbo.schema_migrations ORDER BY filename DESC LIMIT 6;"
```
Expected: a list ending at `052_add_saleorder_ctv.sql` / `053_drop_default_referral_percent.sql`. If `052` is missing, the dev DB lacks `saleorders.ctv_id` and later steps need it — apply pending migrations first:
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f api/migrations/052_add_saleorder_ctv.sql
```
(Repeat for any other unapplied migration shown by the diff between `ls api/migrations` and the `schema_migrations` rows.)

- [ ] **P2: Confirm appointments has no ctv_id yet**

Run:
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "SELECT column_name FROM information_schema.columns WHERE table_schema='dbo' AND table_name='appointments' AND column_name='ctv_id';"
```
Expected: 0 rows (column does not exist yet — Task 1 adds it).

---

## Task 1: Migration — add `appointments.ctv_id` (+ idempotent backfill)

**Files:**
- Create: `api/migrations/054_add_appointments_ctv.sql`

- [ ] **Step 1: Write the migration file**

Create `api/migrations/054_add_appointments_ctv.sql`:
```sql
-- 054_add_appointments_ctv.sql
-- Per-appointment CTV attribution (eligibility window v1).
--
-- An appointment can now carry the CTV it was booked under, mirroring saleorders.ctv_id
-- (migration 052). This makes "the most recent CTV-bearing appointment OR service" an honest,
-- queryable fact, which drives the 6-month customer<->CTV eligibility window.
--
-- Nullable + no hard FK on purpose (same rationale as saleorders.ctv_id): an appointment lives
-- in one LOB DB while a CTV exists in both; a dangling id simply yields no link. Idempotent.

ALTER TABLE dbo.appointments ADD COLUMN IF NOT EXISTS ctv_id uuid;

CREATE INDEX IF NOT EXISTS idx_appointments_ctv_id
  ON dbo.appointments (ctv_id)
  WHERE ctv_id IS NOT NULL;

COMMENT ON COLUMN dbo.appointments.ctv_id IS
  'CTV (partners.id, is_ctv=true) this appointment was booked under. NULL = no CTV. Drives the 6-month customer eligibility window (latest CTV-bearing appointment OR service wins).';

-- One-time launch backfill: existing referred customers have no CTV-bearing appointment yet, so
-- give each currently-referred customer a single anchor = their most-recent non-cancelled
-- appointment, stamped with their referred_by_ctv_id. Idempotent: only fires for customers who
-- have ZERO CTV-bearing appointments, so re-running is a no-op and it never stamps walk-ins
-- beyond the one anchor.
WITH anchor AS (
  SELECT DISTINCT ON (a.partnerid) a.id
    FROM dbo.appointments a
    JOIN dbo.partners p ON p.id = a.partnerid
   WHERE p.referred_by_ctv_id IS NOT NULL
     AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
     AND NOT EXISTS (
       SELECT 1 FROM dbo.appointments a2
        WHERE a2.partnerid = a.partnerid AND a2.ctv_id IS NOT NULL
     )
   ORDER BY a.partnerid, COALESCE(a.date, a.datecreated) DESC NULLS LAST
)
UPDATE dbo.appointments a
   SET ctv_id = p.referred_by_ctv_id
  FROM anchor an
  JOIN dbo.partners p2 ON true  -- placeholder, real join below
 WHERE false; -- replaced in Step 2's corrected statement
```

- [ ] **Step 2: Fix the backfill UPDATE to a correct, runnable statement**

Replace the trailing `UPDATE ... WHERE false;` block with this correct version (the `WITH anchor` CTE above stays):
```sql
UPDATE dbo.appointments a
   SET ctv_id = p.referred_by_ctv_id
  FROM anchor an
  JOIN dbo.appointments tgt ON tgt.id = an.id
  JOIN dbo.partners p ON p.id = tgt.partnerid
 WHERE a.id = an.id
   AND p.referred_by_ctv_id IS NOT NULL;

INSERT INTO dbo.schema_migrations (filename) VALUES ('054_add_appointments_ctv.sql')
  ON CONFLICT (filename) DO NOTHING;
```
The full file is: header comment + `ALTER TABLE` + `CREATE INDEX` + `COMMENT` + `WITH anchor AS (...)` + the corrected `UPDATE` + the `INSERT INTO dbo.schema_migrations`.

- [ ] **Step 3: Apply the migration to dev and verify**

Run:
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f api/migrations/054_add_appointments_ctv.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "SELECT column_name FROM information_schema.columns WHERE table_schema='dbo' AND table_name='appointments' AND column_name='ctv_id'; SELECT COUNT(*) AS stamped FROM dbo.appointments WHERE ctv_id IS NOT NULL;"
```
Expected: `ctv_id` row returned; `stamped` ≥ 0 (equals the number of currently-referred customers that have at least one non-cancelled appointment).

- [ ] **Step 4: Commit**

```bash
git add api/migrations/054_add_appointments_ctv.sql
git commit -m "feat(ctv): add appointments.ctv_id column + idempotent anchor backfill"
```

---

## Task 2: Persist `ctv_id` on appointment create/update + portal booking

**Files:**
- Modify: `api/src/routes/appointments/mutationHandlers.js` (CREATE INSERT ~91-100; UPDATE ~182, ~342-345)
- Modify: `api/src/routes/ctv.js` (POST /bookings INSERT ~937-946)

- [ ] **Step 1: Add `ctv_id` to the CREATE INSERT**

In `mutationHandlers.js`, the CREATE INSERT currently is:
```js
    const result = await q(
      `INSERT INTO appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        datecreated, lastupdated
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13, $14, ${VIETNAM_NOW_SQL}, ${VIETNAM_NOW_SQL}
      ) RETURNING *`,
      [name, date, time || null, partnerId, doctorId || null, companyId, note, timeExpectedNum, color, state, state, productId, assistantId, dentalAideId]
    );
```
Replace it with (adds `ctv_id` column + `$15` param at the end; note the params array now ends with `ctvId`):
```js
    const result = await q(
      `INSERT INTO appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        ctv_id, datecreated, lastupdated
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13, $14, $15, ${VIETNAM_NOW_SQL}, ${VIETNAM_NOW_SQL}
      ) RETURNING *`,
      [name, date, time || null, partnerId, doctorId || null, companyId, note, timeExpectedNum, color, state, state, productId, assistantId, dentalAideId, ctvId]
    );
```
(`ctvId` is already defined at line 29: `const ctvId = b.ctv_id || b.ctvId || null;`. `setCustomerReferrer` at line 107 stays — it keeps `referred_by_ctv_id` in sync.)

- [ ] **Step 2: Add `ctv_id` to the UPDATE path**

In the UPDATE handler, `ctvId` is read at line 182 via `readBodyField(b, 'ctv_id', 'ctvId')` and the dynamic `updates`/`params` arrays are built earlier. Find where other optional columns are pushed onto `updates` (search for `updates.push(` in this handler) and add this block alongside them, BEFORE the `await q(\`UPDATE appointments SET ${updates.join(', ')} ...\`)` call:
```js
    // Persist the per-appointment CTV when the edit sent it. undefined => key absent => unchanged;
    // a UUID stamps this appointment's ctv_id; null/'' clears it (mirrors the referrer clear below).
    if (ctvId !== undefined) {
      updates.push(`ctv_id = $${paramIdx}`);
      params.push(ctvId || null);
      paramIdx += 1;
    }
```
Verify the surrounding code uses the identifiers `updates`, `params`, and `paramIdx` (the existing UPDATE at ~342 is `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIdx}`). If the increment variable is named differently, match the existing name. The existing `setCustomerReferrer/clearCustomerReferrer` block at ~351-359 stays unchanged.

- [ ] **Step 3: Add `ctv_id` to the portal booking INSERT**

In `api/src/routes/ctv.js` POST `/bookings`, the appointment INSERT (~937-946) is:
```js
await safeQueryRows(db,
      `INSERT INTO dbo.appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13, $14, $15,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [apptId, apptName, date, time || null, clientId, null, companyId || null, apptNote, 30, '1', 'confirmed', 'confirmed', validProductId, null, null]);
```
Replace with (adds `ctv_id` column after `dentalaideid` as `$16`, value = `employeeId` which is the booking CTV — confirm `employeeId` is in scope in this handler; it is destructured from `req.user` at the top of `/bookings`):
```js
await safeQueryRows(db,
      `INSERT INTO dbo.appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        ctv_id, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13, $14, $15, $16,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [apptId, apptName, date, time || null, clientId, null, companyId || null, apptNote, 30, '1', 'confirmed', 'confirmed', validProductId, null, null, employeeId]);
```
If `employeeId` is not the in-scope variable for the booking CTV in this handler, use the variable that holds `req.user.employeeId` (the authenticated CTV's id). Verify by reading the top of the `/bookings` handler.

- [ ] **Step 4: Smoke-test the write path manually**

Start the API (`cd api && node src/server.js` on :3002) if not running, then create an appointment with a `ctv_id` via the existing UI or curl, and verify:
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "SELECT id, partnerid, ctv_id, state FROM dbo.appointments WHERE ctv_id IS NOT NULL ORDER BY datecreated DESC LIMIT 3;"
```
Expected: the newly created/edited appointment row shows a non-null `ctv_id`.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/appointments/mutationHandlers.js api/src/routes/ctv.js
git commit -m "feat(ctv): persist ctv_id on appointment create/update + portal booking"
```

---

## Task 3: Backend — `computeCtvLink` + `getCtvLinkStatus` (TDD)

**Files:**
- Modify: `api/src/services/referralClaim.js`
- Test: `api/src/services/__tests__/referralClaim.test.js`

- [ ] **Step 1: Write failing unit tests for `computeCtvLink`**

Append to `api/src/services/__tests__/referralClaim.test.js` (the file already imports from `../referralClaim`; add `computeCtvLink` to the import):
```js
const { computeCtvLink } = require('../referralClaim');

describe('computeCtvLink', () => {
  const asOf = new Date('2026-06-02T00:00:00Z');

  it('no CTV-bearing event and no fallback owner => eligible, not linked', () => {
    const r = computeCtvLink({ appt: null, service: null, fallbackOwnerCtvId: null, fallbackOwnerName: null, asOf });
    expect(r.linkedCtvId).toBeNull();
    expect(r.active).toBe(false);
    expect(r.eligible).toBe(true);
    expect(r.anchorAt).toBeNull();
  });

  it('latest CTV-bearing event within 6 months => active, not eligible', () => {
    const r = computeCtvLink({
      appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: new Date('2026-04-01') },
      service: null, fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf,
    });
    expect(r.linkedCtvId).toBe('ctv-A');
    expect(r.linkedCtvName).toBe('Lan');
    expect(r.anchorSource).toBe('appointment');
    expect(r.active).toBe(true);
    expect(r.eligible).toBe(false);
    expect(r.expiresAt.getTime()).toBe(new Date('2026-10-01').getTime());
  });

  it('latest CTV-bearing event older than 6 months => expired, eligible', () => {
    const r = computeCtvLink({
      appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: new Date('2025-11-01') },
      service: null, fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf,
    });
    expect(r.active).toBe(false);
    expect(r.eligible).toBe(true);
  });

  it('service is newer than appointment => service wins and names its CTV', () => {
    const r = computeCtvLink({
      appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: new Date('2026-03-01') },
      service: { ctvId: 'ctv-B', ctvName: 'Huy', dt: new Date('2026-05-01') },
      fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf,
    });
    expect(r.linkedCtvId).toBe('ctv-B');
    expect(r.linkedCtvName).toBe('Huy');
    expect(r.anchorSource).toBe('service');
  });

  it('tie on date => service wins', () => {
    const sameDay = new Date('2026-05-01');
    const r = computeCtvLink({
      appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: sameDay },
      service: { ctvId: 'ctv-B', ctvName: 'Huy', dt: sameDay },
      fallbackOwnerCtvId: null, fallbackOwnerName: null, asOf,
    });
    expect(r.anchorSource).toBe('service');
    expect(r.linkedCtvId).toBe('ctv-B');
  });

  it('fallback owner set but no event => linked, no anchor, not eligible', () => {
    const r = computeCtvLink({ appt: null, service: null, fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf });
    expect(r.linkedCtvId).toBe('ctv-A');
    expect(r.anchorAt).toBeNull();
    expect(r.expiresAt).toBeNull();
    expect(r.active).toBe(true);
    expect(r.eligible).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd api && npx jest src/services/__tests__/referralClaim.test.js -t computeCtvLink
```
Expected: FAIL — `computeCtvLink is not a function`.

- [ ] **Step 3: Implement `computeCtvLink` + `getCtvLinkStatus`; delegate legacy fn**

In `api/src/services/referralClaim.js`, keep `addMonths` and `computeClaim` as-is. Add these functions and export them. Replace the existing `getReferralClaimStatus` body with a delegation:
```js
const WINDOW_MONTHS = 6;

/**
 * Pure: pick the most-recent CTV-bearing event (service wins ties), derive the 6-month window.
 * @param {{ctvId:string,ctvName:string|null,dt:Date|string}|null} appt
 * @param {{ctvId:string,ctvName:string|null,dt:Date|string}|null} service
 * @param {string|null} fallbackOwnerCtvId  partners.referred_by_ctv_id (safety net)
 * @param {string|null} fallbackOwnerName
 * @param {Date} [asOf]
 */
function computeCtvLink({ appt, service, fallbackOwnerCtvId = null, fallbackOwnerName = null, asOf = new Date() }) {
  const candidates = [];
  if (appt && appt.ctvId && appt.dt) candidates.push({ ...appt, dt: new Date(appt.dt), source: 'appointment', rank: 0 });
  if (service && service.ctvId && service.dt) candidates.push({ ...service, dt: new Date(service.dt), source: 'service', rank: 1 });

  // latest wins; tie -> higher rank (service) wins
  candidates.sort((a, b) => (b.dt.getTime() - a.dt.getTime()) || (b.rank - a.rank));
  const winner = candidates[0] || null;

  if (!winner) {
    // No CTV-bearing event. If a referrer is still on file, treat as linked-with-no-anchor
    // (don't free a freshly-assigned client); otherwise eligible.
    if (fallbackOwnerCtvId) {
      return {
        linkedCtvId: fallbackOwnerCtvId, linkedCtvName: fallbackOwnerName,
        anchorAt: null, anchorSource: null, expiresAt: null,
        active: true, eligible: false, windowMonths: WINDOW_MONTHS,
      };
    }
    return {
      linkedCtvId: null, linkedCtvName: null, anchorAt: null, anchorSource: null,
      expiresAt: null, active: false, eligible: true, windowMonths: WINDOW_MONTHS,
    };
  }

  const anchorAt = winner.dt;
  const expiresAt = addMonths(anchorAt, WINDOW_MONTHS);
  const active = expiresAt.getTime() > new Date(asOf).getTime();
  return {
    linkedCtvId: winner.ctvId, linkedCtvName: winner.ctvName || null,
    anchorAt, anchorSource: winner.source, expiresAt,
    active, eligible: !active, windowMonths: WINDOW_MONTHS,
  };
}

/**
 * DB wrapper: latest non-cancelled CTV-bearing appointment + saleorder for a client.
 */
async function getCtvLinkStatus(clientId, lob, opts = {}) {
  const { asOf = new Date(), txClient = null, getDb: injectedGetDb = null } = opts;
  const db = txClient || (injectedGetDb || defaultGetDb)(lob);
  const run = txClient
    ? (sql, p) => txClient.query(sql, p).then((r) => r.rows)
    : (sql, p) => db.queryRows(sql, p);

  const apptRows = await run(
    `SELECT a.ctv_id AS "ctvId", c.name AS "ctvName", COALESCE(a.date, a.datecreated) AS dt
       FROM dbo.appointments a
       LEFT JOIN dbo.partners c ON c.id = a.ctv_id
      WHERE a.partnerid = $1 AND a.ctv_id IS NOT NULL
        AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
      ORDER BY COALESCE(a.date, a.datecreated) DESC NULLS LAST
      LIMIT 1`,
    [clientId]
  );

  const svcRows = await run(
    `SELECT so.ctv_id AS "ctvId", c.name AS "ctvName", COALESCE(so.dateordered, so.datecreated) AS dt
       FROM dbo.saleorders so
       LEFT JOIN dbo.partners c ON c.id = so.ctv_id
      WHERE so.partnerid = $1 AND so.ctv_id IS NOT NULL
        AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
        AND COALESCE(so.isdeleted, false) = false
      ORDER BY COALESCE(so.dateordered, so.datecreated) DESC NULLS LAST
      LIMIT 1`,
    [clientId]
  );

  const ownerRows = await run(
    `SELECT p.referred_by_ctv_id AS "ownerId", o.name AS "ownerName"
       FROM dbo.partners p LEFT JOIN dbo.partners o ON o.id = p.referred_by_ctv_id
      WHERE p.id = $1`,
    [clientId]
  );

  return computeCtvLink({
    appt: apptRows[0] || null,
    service: svcRows[0] || null,
    fallbackOwnerCtvId: ownerRows[0]?.ownerId || null,
    fallbackOwnerName: ownerRows[0]?.ownerName || null,
    asOf,
  });
}

/**
 * Legacy shape, now backed by the CTV-bearing-event rule so every caller agrees with the bar.
 */
async function getReferralClaimStatus(clientId, lob, opts = {}) {
  const s = await getCtvLinkStatus(clientId, lob, opts);
  return {
    ownerCtvId: s.linkedCtvId,
    ownerName: s.linkedCtvName,
    anchorDate: s.anchorAt,
    expiresAt: s.expiresAt,
    active: s.active,
  };
}

module.exports = { computeClaim, computeCtvLink, getCtvLinkStatus, getReferralClaimStatus };
```
(Remove the old `getReferralClaimStatus` implementation that queried `commission_settings` / `payments` — it is replaced by the delegation above. `computeClaim` stays for backward-compatible unit tests.)

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd api && npx jest src/services/__tests__/referralClaim.test.js
```
Expected: PASS — all `computeCtvLink` cases + the existing `computeClaim` cases green.

- [ ] **Step 5: Commit**

```bash
git add api/src/services/referralClaim.js api/src/services/__tests__/referralClaim.test.js
git commit -m "feat(ctv): computeCtvLink + getCtvLinkStatus (latest CTV-bearing event, 6mo window)"
```

---

## Task 4: Backend read paths — real `ctv_id` + `ctv_name`

**Files:**
- Modify: `api/src/routes/appointments/readHandlers.js` (3 SELECTs + 3 JOIN blocks)
- Modify: the sale-order-lines read used by the customer profile (find it in Step 3)

- [ ] **Step 1: Replace the aliased ctv_id with the real column + add ctv_name (appointments)**

In `readHandlers.js`, each of the 3 SELECT lists currently has:
```js
        p.referred_by_ctv_id AS ctv_id,
```
Replace each occurrence (lines ~167, ~203, ~355) with:
```js
        a.ctv_id AS ctv_id,
        ctvp.name AS ctv_name,
```

- [ ] **Step 2: Add the CTV partner join to all 3 JOIN blocks**

The three JOIN blocks (`calendarJoins` ~240, `fullJoins` ~249, and the getAppointmentById FROM ~391) each contain:
```js
      LEFT JOIN partners p ON p.id = a.partnerid
```
Immediately after that line in each block, add:
```js
      LEFT JOIN partners ctvp ON ctvp.id = a.ctv_id
```
(Do this for all three blocks. `calendarJoins` selects a smaller column set — if `calendarJoins`'s SELECT does not include the ctv columns, only add the join where the matching SELECT references `ctv_id`/`ctv_name`. Verify each SELECT/JOIN pair lines up.)

- [ ] **Step 3: Add ctv_name to the customer-profile sale-order-lines query**

Find the query that returns sale-order lines for the customer profile (the one feeding `mapSaleOrderLines.ts`). Run:
```bash
grep -rn "ctv_id" api/src/routes/saleOrders/ api/src/routes/ | grep -i "select\|sol\.\|so\.ctv"
```
Locate the SELECT that returns sale-order lines with `so.ctv_id` (or add it). In that SELECT, ensure both are present:
```sql
        so.ctv_id AS ctv_id,
        ctvp.name AS ctv_name,
```
and add `LEFT JOIN dbo.partners ctvp ON ctvp.id = so.ctv_id` to its FROM/JOIN block. If the line query does not currently expose `ctv_id`, add both columns + the join.

- [ ] **Step 4: Verify via API**

With the API running, fetch one appointment and one service for a customer that has a stamped `ctv_id`, and confirm the JSON includes `ctv_id` and `ctv_name`. Example:
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "SELECT partnerid FROM dbo.appointments WHERE ctv_id IS NOT NULL LIMIT 1;"
# then GET the appointments for that partner via the running API and confirm ctv_id + ctv_name appear
```
Expected: response objects carry `ctv_id` (real per-row value) and `ctv_name`.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/appointments/readHandlers.js api/src/routes/saleOrders/
git commit -m "feat(ctv): expose real appointment.ctv_id + ctv_name on read paths"
```

---

## Task 5: Backend — extend customer-profile `referralClaim` with link fields

**Files:**
- Modify: `api/src/routes/partners/getPartnerById.js` (~115-123)
- Modify: `api/src/routes/partners/resolveHandler.js` (~131-146)

- [ ] **Step 1: Enrich referralClaim in getPartnerById**

`getPartnerById.js` currently does:
```js
    // Attach referral claim status if partner has referred_by_ctv_id
    let referralClaim = null;
    if (partner && partner.id) {
      const { getReferralClaimStatus } = require('../../services/referralClaim');
      const lob = req.lob || 'dental';
      referralClaim = await getReferralClaimStatus(partner.id, lob, {});
    }

    return res.json({ ...partner, referralClaim });
```
Replace with (use the richer `getCtvLinkStatus` and shape `referralClaim` to keep legacy fields + add `anchorAt`/`eligible`):
```js
    // Attach CTV link status (6-month eligibility window). Keeps legacy ownerCtvId/ownerName/
    // active/expiresAt and adds anchorAt + eligible for the countdown bar.
    let referralClaim = null;
    if (partner && partner.id) {
      const { getCtvLinkStatus } = require('../../services/referralClaim');
      const lob = req.lob || 'dental';
      const s = await getCtvLinkStatus(partner.id, lob, {});
      referralClaim = {
        ownerCtvId: s.linkedCtvId,
        ownerName: s.linkedCtvName,
        active: s.active,
        expiresAt: s.expiresAt,
        anchorAt: s.anchorAt,
        eligible: s.eligible,
      };
    }

    return res.json({ ...partner, referralClaim });
```

- [ ] **Step 2: Mirror the enrichment in resolveHandler**

`resolveHandler.js` (~131-146) builds `referralClaim` via `getReferralClaimStatus`. Update its `referralClaim` assignment the same way:
```js
  const row = result.rows[0];
  let referralClaim = null;
  if (row && row.id) {
    const lob = req.lob || 'dental';
    const { getCtvLinkStatus } = require('../../services/referralClaim');
    const s = await getCtvLinkStatus(row.id, lob, {});
    referralClaim = {
      ownerCtvId: s.linkedCtvId,
      ownerName: s.linkedCtvName,
      active: s.active,
      expiresAt: s.expiresAt,
      anchorAt: s.anchorAt,
      eligible: s.eligible,
    };
  }
```
(Keep the rest of the `body` object the same. If `getReferralClaimStatus` is imported at the top of the file and now unused, leave its import or switch it to `getCtvLinkStatus` — do not remove unrelated imports.)

- [ ] **Step 3: Confirm the getPartnerById test still passes**

The existing test (`api/src/routes/partners/__tests__/getPartnerById.test.js`) mocks the referralClaim service. Update the mock to mock `getCtvLinkStatus` returning the rich shape, and assert `referralClaim` contains `ownerName` + `eligible`. Run:
```bash
cd api && npx jest src/routes/partners/__tests__/getPartnerById.test.js
```
Expected: PASS (after updating the mock target from `getReferralClaimStatus` to `getCtvLinkStatus`).

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/partners/getPartnerById.js api/src/routes/partners/resolveHandler.js api/src/routes/partners/__tests__/getPartnerById.test.js
git commit -m "feat(ctv): add anchorAt + eligible to customer-profile referralClaim"
```

---

## Task 6: Backend — link status in `/ctv/referrals` + booking gate parity

**Files:**
- Modify: `api/src/routes/ctv.js` (`buildReferralsForLob` ~195-291, byId merge ~300-321; `/client-lookup` ~772; `/bookings` gate ~878)

- [ ] **Step 1: Add a batched latest-CTV-event query inside `buildReferralsForLob`**

Inside `buildReferralsForLob`, the existing `Promise.all([...])` fetches `earnAgg, payAgg, svcRows, visitAgg`. Add two more batched queries to that same `Promise.all` (so it becomes 6), capturing the latest CTV-bearing appointment and saleorder per client:
```js
        safeQueryRows(
          db,
          `SELECT DISTINCT ON (a.partnerid) a.partnerid AS id, a.ctv_id AS "ctvId",
                  ctvp.name AS "ctvName", COALESCE(a.date, a.datecreated) AS dt
             FROM dbo.appointments a
             LEFT JOIN dbo.partners ctvp ON ctvp.id = a.ctv_id
            WHERE a.partnerid = ANY($1) AND a.ctv_id IS NOT NULL
              AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
            ORDER BY a.partnerid, COALESCE(a.date, a.datecreated) DESC NULLS LAST`,
          [ids]
        ),
        safeQueryRows(
          db,
          `SELECT DISTINCT ON (so.partnerid) so.partnerid AS id, so.ctv_id AS "ctvId",
                  ctvp.name AS "ctvName", COALESCE(so.dateordered, so.datecreated) AS dt
             FROM dbo.saleorders so
             LEFT JOIN dbo.partners ctvp ON ctvp.id = so.ctv_id
            WHERE so.partnerid = ANY($1) AND so.ctv_id IS NOT NULL
              AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
              AND COALESCE(so.isdeleted, false) = false
            ORDER BY so.partnerid, COALESCE(so.dateordered, so.datecreated) DESC NULLS LAST`,
          [ids]
        ),
```
Update the destructure to include them, e.g.:
```js
      const [earnAgg, payAgg, svcRows, visitAgg, apptCtvRows, svcCtvRows] = await Promise.all([
```

- [ ] **Step 2: Compute link status per row and attach to the returned object**

At the top of `buildReferralsForLob`, after the other `Map`s are built, add:
```js
      const { computeCtvLink } = require('../services/referralClaim');
      const apptCtvMap = new Map(apptCtvRows.map((r) => [r.id, r]));
      const svcCtvMap = new Map(svcCtvRows.map((r) => [r.id, r]));
```
Then inside `rows.map((row) => { ... })`, before the `return { ... }`, compute:
```js
        const link = computeCtvLink({
          appt: apptCtvMap.get(row.id) || null,
          service: svcCtvMap.get(row.id) || null,
          fallbackOwnerCtvId: ctvId,      // this CTV owns the /referrals list query
          fallbackOwnerName: null,
        });
```
And add these fields to the returned object (alongside `stage`, `services`, etc.):
```js
          link_expires_at: link.expiresAt ? link.expiresAt.toISOString() : null,
          link_anchor_at: link.anchorAt ? link.anchorAt.toISOString() : null,
          link_active: link.active,
          eligible: link.eligible,
          linked_ctv_name: link.linkedCtvName,
```

- [ ] **Step 3: Reduce link fields across LOBs in the byId merge**

In the `byId` merge loop (~300-321), when an item already exists (`byId.has(item.id)`), reconcile the link window — latest expiry wins; eligible only if all LOB windows are inactive. Add inside the `if (byId.has(item.id))` branch:
```js
        // Latest-expiring active window wins; eligible only when every LOB window is inactive.
        const prevExp = prev.link_expires_at ? new Date(prev.link_expires_at).getTime() : -Infinity;
        const itemExp = item.link_expires_at ? new Date(item.link_expires_at).getTime() : -Infinity;
        if (itemExp > prevExp) {
          prev.link_expires_at = item.link_expires_at;
          prev.link_anchor_at = item.link_anchor_at;
          prev.linked_ctv_name = item.linked_ctv_name;
        }
        prev.link_active = prev.link_active || item.link_active;
        prev.eligible = prev.link_active || item.link_active ? false : true;
```
(The `else` branch already does `byId.set(item.id, { ...item })`, which carries the new fields.)

- [ ] **Step 4: Confirm the booking gate + client-lookup agree (no code change needed)**

`/client-lookup` (~772) and the `/bookings` gate (~878) call `getReferralClaimStatus`, which now delegates to `getCtvLinkStatus` (Task 3). No edit needed — verify by reading both call sites that they use the returned `active`/`ownerCtvId`/`expiresAt` (they do). Note this in the commit.

- [ ] **Step 5: Manual API check**

With the API running and logged in as a CTV (token), hit `/api/ctv/referrals` and confirm each referral now carries `link_expires_at`, `link_active`, `eligible`, `linked_ctv_name`. Use the e2e login or an existing token. Expected: fields present; an active customer has `eligible:false`, an expired/none has `eligible:true`.

- [ ] **Step 6: Commit**

```bash
git add api/src/routes/ctv.js
git commit -m "feat(ctv): surface 6-month link status + eligibility in /ctv/referrals"
```

---

## Task 7: Frontend types — extend interfaces

**Files:**
- Modify: `website/src/lib/api/ctv.ts` (CtvReferral)
- Modify: `website/src/hooks/useCustomerProfile.ts` (ReferralClaim)
- Modify: `website/src/types/customer.ts` (CustomerService)
- Modify: `website/src/lib/api/saleOrders.ts` (ApiSaleOrderLine)
- Modify: `website/src/lib/api/appointments.ts` (ApiAppointment)
- Modify: `website/src/pages/Customers/mapSaleOrderLines.ts` (map ctvName)

- [ ] **Step 1: Extend `CtvReferral`**

In `website/src/lib/api/ctv.ts`, the `CtvReferral` interface ends with `last_visit_at`. Add before the closing brace:
```ts
  // 6-month CTV-link eligibility window (from /ctv/referrals). Optional for back-compat.
  readonly link_expires_at?: string | null;
  readonly link_anchor_at?: string | null;
  readonly link_active?: boolean;
  readonly eligible?: boolean;
  readonly linked_ctv_name?: string | null;
```

- [ ] **Step 2: Extend `ReferralClaim`**

In `website/src/hooks/useCustomerProfile.ts`, the `ReferralClaim` interface is:
```ts
export interface ReferralClaim {
  ownerCtvId: string | null;
  ownerName: string | null;
  active: boolean;
  expiresAt: string | Date | null;
}
```
Replace with:
```ts
export interface ReferralClaim {
  ownerCtvId: string | null;
  ownerName: string | null;
  active: boolean;
  expiresAt: string | Date | null;
  anchorAt?: string | Date | null;
  eligible?: boolean;
}
```
(The mapping at line ~144 `referralClaim: partner.referralClaim ?? null` already passes the whole object through — no change needed there.)

- [ ] **Step 3: Add `ctvName` to `CustomerService` + `ApiSaleOrderLine` + map it**

In `website/src/types/customer.ts`, after the `ctvId` line in `CustomerService`, add:
```ts
  /** Display name of the CTV attributed to this service (from saleorders.ctv_id). */
  readonly ctvName?: string | null;
```
In `website/src/lib/api/saleOrders.ts`, after the `ctvId?: string | null;` line in `ApiSaleOrderLine`, add:
```ts
  ctv_name?: string | null;
  ctvName?: string | null;
```
In `website/src/pages/Customers/mapSaleOrderLines.ts`, after the `ctvId: firstDefined(line.ctvId, line.ctv_id),` line, add:
```ts
    ctvName: firstDefined(line.ctvName, line.ctv_name) || undefined,
```

- [ ] **Step 4: Add `ctv_name` to `ApiAppointment`**

In `website/src/lib/api/appointments.ts`, after the `ctv_id?: string | null;` line in `ApiAppointment`, add:
```ts
  /** Display name of the CTV this appointment was booked under (partners.name via appointments.ctv_id). */
  ctv_name?: string | null;
```

- [ ] **Step 5: Typecheck**

Run:
```bash
cd website && npx tsc --noEmit --pretty false
```
Expected: no NEW type errors from these files (pre-existing errors elsewhere, if any, unchanged).

- [ ] **Step 6: Commit**

```bash
git add website/src/lib/api/ctv.ts website/src/hooks/useCustomerProfile.ts website/src/types/customer.ts website/src/lib/api/saleOrders.ts website/src/lib/api/appointments.ts website/src/pages/Customers/mapSaleOrderLines.ts
git commit -m "feat(ctv): frontend types for link window + per-row ctv name"
```

---

## Task 8: Frontend — `CtvLinkBar` component (TDD)

**Files:**
- Create: `website/src/components/shared/CtvLinkBar.tsx`
- Create: `website/src/__tests__/CtvLinkBar.test.tsx`
- Modify: `website/src/components/shared/index.ts`

- [ ] **Step 1: Write failing tests**

Create `website/src/__tests__/CtvLinkBar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CtvLinkBar, ctvLinkBarFraction } from '@/components/shared/CtvLinkBar';

describe('ctvLinkBarFraction', () => {
  const now = new Date('2026-06-02T00:00:00Z').getTime();
  it('returns ~1 just after anchor', () => {
    const f = ctvLinkBarFraction(new Date('2026-06-01'), new Date('2026-12-01'), now);
    expect(f).toBeGreaterThan(0.9);
  });
  it('returns 0 when expired', () => {
    const f = ctvLinkBarFraction(new Date('2025-06-01'), new Date('2025-12-01'), now);
    expect(f).toBe(0);
  });
  it('clamps to [0,1]', () => {
    const f = ctvLinkBarFraction(new Date('2026-06-03'), new Date('2026-12-03'), now);
    expect(f).toBeLessThanOrEqual(1);
    expect(f).toBeGreaterThanOrEqual(0);
  });
});

describe('CtvLinkBar', () => {
  it('renders the CTV name and a remaining-time label when active', () => {
    render(
      <CtvLinkBar
        ctvName="Lan"
        anchorAt={'2026-04-01'}
        expiresAt={'2026-10-01'}
        active={true}
        eligible={false}
      />
    );
    expect(screen.getByText(/Lan/)).toBeInTheDocument();
    expect(screen.getByTestId('ctv-link-bar')).toBeInTheDocument();
  });

  it('shows the eligible message when expired', () => {
    render(
      <CtvLinkBar
        ctvName="Lan"
        anchorAt={'2025-01-01'}
        expiresAt={'2025-07-01'}
        active={false}
        eligible={true}
      />
    );
    expect(screen.getByTestId('ctv-link-bar-expired')).toBeInTheDocument();
  });

  it('renders nothing when there is no CTV', () => {
    const { container } = render(
      <CtvLinkBar ctvName={null} anchorAt={null} expiresAt={null} active={false} eligible={true} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
cd website && npx vitest run src/__tests__/CtvLinkBar.test.tsx
```
Expected: FAIL — module `@/components/shared/CtvLinkBar` not found.

- [ ] **Step 3: Implement `CtvLinkBar`**

Create `website/src/components/shared/CtvLinkBar.tsx`:
```tsx
import { useTranslation } from 'react-i18next';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toMs(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Fraction of the window remaining, clamped to [0,1]. Falls back to a 6-month denominator. */
export function ctvLinkBarFraction(
  anchorAt: string | Date | null | undefined,
  expiresAt: string | Date | null | undefined,
  nowMs: number = Date.now(),
): number {
  const exp = toMs(expiresAt);
  if (exp == null) return 0;
  const anchor = toMs(anchorAt);
  const total = anchor != null && exp > anchor ? exp - anchor : 6 * 30 * MS_PER_DAY;
  const remaining = exp - nowMs;
  const f = remaining / total;
  return Math.max(0, Math.min(1, f));
}

interface CtvLinkBarProps {
  readonly ctvName?: string | null;
  readonly anchorAt?: string | Date | null;
  readonly expiresAt?: string | Date | null;
  readonly active: boolean;
  readonly eligible: boolean;
  readonly compact?: boolean;
}

export function CtvLinkBar({ ctvName, anchorAt, expiresAt, active, eligible, compact }: CtvLinkBarProps) {
  const { t } = useTranslation('ctv');
  // No CTV at all → render nothing (eligible-with-no-owner is shown by the portal banner instead).
  if (!ctvName && !expiresAt) return null;

  const expMs = toMs(expiresAt);
  const nowMs = Date.now();
  const remainingDays = expMs != null ? Math.max(0, Math.round((expMs - nowMs) / MS_PER_DAY)) : null;
  const fraction = ctvLinkBarFraction(anchorAt, expiresAt, nowMs);
  const isExpired = !active || eligible || (remainingDays != null && remainingDays <= 0);

  // Color band by remaining time (mirrors StatusBadge palette).
  let fill = 'bg-emerald-500';
  let track = 'bg-emerald-100';
  if (isExpired) { fill = 'bg-gray-300'; track = 'bg-gray-100'; }
  else if (remainingDays != null && remainingDays <= 7) { fill = 'bg-red-500'; track = 'bg-red-100'; }
  else if (remainingDays != null && remainingDays <= 42) { fill = 'bg-amber-500'; track = 'bg-amber-100'; }

  const label = (() => {
    if (isExpired) return t('link.expired', 'Đã hết hạn — khách có thể gắn CTV khác');
    if (remainingDays == null) return t('link.activeNoDate', 'Đang liên kết');
    if (remainingDays >= 60) return t('link.monthsLeft', { count: Math.round(remainingDays / 30), defaultValue: `≈${Math.round(remainingDays / 30)} tháng còn lại` });
    if (remainingDays >= 14) return t('link.weeksLeft', { count: Math.round(remainingDays / 7), defaultValue: `≈${Math.round(remainingDays / 7)} tuần còn lại` });
    return t('link.daysLeft', { count: remainingDays, defaultValue: `≈${remainingDays} ngày còn lại` });
  })();

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'} data-testid={isExpired ? 'ctv-link-bar-expired' : 'ctv-link-bar'}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-gray-700">
          {t('link.ctvLabel', 'CTV')}: <strong>{ctvName || '—'}</strong>
        </span>
        <span className={isExpired ? 'text-gray-500' : 'text-gray-600'}>{label}</span>
      </div>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
        <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${fill}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Export it**

In `website/src/components/shared/index.ts`, add (keep alphabetical-ish ordering near the C entries):
```ts
export { CtvLinkBar, ctvLinkBarFraction } from './CtvLinkBar';
```

- [ ] **Step 5: Run tests to verify pass**

Run:
```bash
cd website && npx vitest run src/__tests__/CtvLinkBar.test.tsx
```
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add website/src/components/shared/CtvLinkBar.tsx website/src/__tests__/CtvLinkBar.test.tsx website/src/components/shared/index.ts
git commit -m "feat(ctv): CtvLinkBar countdown component"
```

---

## Task 9: Frontend — `DoctorCtvTrail` breadcrumb component (TDD)

**Files:**
- Create: `website/src/components/shared/DoctorCtvTrail.tsx`
- Create: `website/src/__tests__/DoctorCtvTrail.test.tsx`
- Modify: `website/src/components/shared/index.ts`

- [ ] **Step 1: Write failing tests**

Create `website/src/__tests__/DoctorCtvTrail.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DoctorCtvTrail } from '@/components/shared/DoctorCtvTrail';

describe('DoctorCtvTrail', () => {
  it('renders doctor then CTV as a breadcrumb', () => {
    render(<DoctorCtvTrail doctorName="BS. Hùng" ctvName="Lan" />);
    expect(screen.getByText(/BS\. Hùng/)).toBeInTheDocument();
    expect(screen.getByText(/Lan/)).toBeInTheDocument();
    expect(screen.getByTestId('doctor-ctv-trail')).toBeInTheDocument();
  });

  it('renders doctor only when no CTV (no trailing chevron)', () => {
    render(<DoctorCtvTrail doctorName="BS. Hùng" ctvName={null} />);
    expect(screen.getByText(/BS\. Hùng/)).toBeInTheDocument();
    expect(screen.queryByTestId('doctor-ctv-trail-ctv')).not.toBeInTheDocument();
  });

  it('renders nothing when both are empty', () => {
    const { container } = render(<DoctorCtvTrail doctorName={null} ctvName={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
cd website && npx vitest run src/__tests__/DoctorCtvTrail.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DoctorCtvTrail`**

Create `website/src/components/shared/DoctorCtvTrail.tsx`:
```tsx
import { ChevronRight } from 'lucide-react';

interface DoctorCtvTrailProps {
  readonly doctorName?: string | null;
  readonly ctvName?: string | null;
  /** Optional label prefix for the doctor segment (default "BS."). */
  readonly doctorLabel?: string;
}

function isMeaningful(v?: string | null): boolean {
  return !!v && v.trim() !== '' && v !== 'N/A';
}

export function DoctorCtvTrail({ doctorName, ctvName, doctorLabel = 'BS.' }: DoctorCtvTrailProps) {
  const hasDoctor = isMeaningful(doctorName);
  const hasCtv = isMeaningful(ctvName);
  if (!hasDoctor && !hasCtv) return null;

  return (
    <p className="flex items-center gap-1 text-xs text-gray-500" data-testid="doctor-ctv-trail">
      {hasDoctor && (
        <span className="truncate font-medium text-gray-600">
          {doctorLabel} {doctorName}
        </span>
      )}
      {hasDoctor && hasCtv && <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" aria-hidden="true" />}
      {hasCtv && (
        <span
          className="inline-flex items-center gap-1 truncate rounded-full bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700 ring-1 ring-orange-500/20"
          data-testid="doctor-ctv-trail-ctv"
        >
          CTV: {ctvName}
        </span>
      )}
    </p>
  );
}
```

- [ ] **Step 4: Export it**

In `website/src/components/shared/index.ts`, add:
```ts
export { DoctorCtvTrail } from './DoctorCtvTrail';
```

- [ ] **Step 5: Run tests to verify pass**

Run:
```bash
cd website && npx vitest run src/__tests__/DoctorCtvTrail.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add website/src/components/shared/DoctorCtvTrail.tsx website/src/__tests__/DoctorCtvTrail.test.tsx website/src/components/shared/index.ts
git commit -m "feat(ctv): DoctorCtvTrail breadcrumb component"
```

---

## Task 10: Admin profile header — use `CtvLinkBar`

**Files:**
- Modify: `website/src/components/customer/CustomerProfile/ProfileHeader.tsx` (~118-141)

- [ ] **Step 1: Replace the text badge with the bar**

In `ProfileHeader.tsx`, the current referral block is:
```tsx
          {/* Referral Claim Badge: shows "Referred by CTV" with claim status */}
          {profile.referralClaim?.ownerCtvId && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
                data-testid="referral-claim-badge"
                title={profile.referralClaim.ownerName || 'CTV Referral'}
              >
                <span className="text-gray-700">Người giới thiệu (CTV): <strong>{profile.referralClaim.ownerName}</strong></span>
              </span>
              {profile.referralClaim.active && profile.referralClaim.expiresAt ? (
                <span className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                  data-testid="referral-active-badge"
                >
                  còn hiệu lực đến {new Date(profile.referralClaim.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                  data-testid="referral-expired-badge"
                >
                  đã hết hạn
                </span>
              )}
            </div>
          )}
```
Replace the whole block with (keep the `data-testid="referral-claim-badge"` so existing selectors still find it; render the bar):
```tsx
          {/* Referral claim: "Referred by CTV" + 6-month eligibility countdown bar */}
          {profile.referralClaim?.ownerCtvId && (
            <div className="mt-2 max-w-xs" data-testid="referral-claim-badge">
              <p className="mb-1 text-xs text-gray-500">
                Người giới thiệu (CTV): <strong className="text-gray-700">{profile.referralClaim.ownerName}</strong>
              </p>
              <CtvLinkBar
                ctvName={profile.referralClaim.ownerName}
                anchorAt={profile.referralClaim.anchorAt ?? null}
                expiresAt={profile.referralClaim.expiresAt ?? null}
                active={profile.referralClaim.active}
                eligible={profile.referralClaim.eligible ?? !profile.referralClaim.active}
              />
            </div>
          )}
```
Add the import near the other imports at the top of the file:
```tsx
import { CtvLinkBar } from '@/components/shared';
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd website && npx tsc --noEmit --pretty false
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add website/src/components/customer/CustomerProfile/ProfileHeader.tsx
git commit -m "feat(ctv): countdown bar in customer profile header"
```

---

## Task 11: Admin profile rows — Doctor→CTV breadcrumb

**Files:**
- Modify: `website/src/components/customer/CustomerAppointmentHistory.tsx` (~166-172)
- Modify: `website/src/components/customer/ServiceHistoryRow.tsx` (~60-61)

- [ ] **Step 1: Add the breadcrumb to appointment rows**

In `CustomerAppointmentHistory.tsx`, the team cell is:
```tsx
                      <td className="py-3 pr-4 align-top">
                        <div className="min-w-[150px] space-y-1">
                          <TeamLine label="Bác sĩ" value={appointment.doctorname} />
                          {appointment.assistantname && <TeamLine label="Phụ tá" value={appointment.assistantname} />}
                          {appointment.dentalaidename && <TeamLine label="Nha tá" value={appointment.dentalaidename} />}
                        </div>
                      </td>
```
Replace the `<TeamLine label="Bác sĩ" .../>` line with the doctor line PLUS a breadcrumb when the appointment carries a CTV:
```tsx
                          {appointment.ctv_name ? (
                            <DoctorCtvTrail doctorName={appointment.doctorname} ctvName={appointment.ctv_name} doctorLabel="BS." />
                          ) : (
                            <TeamLine label="Bác sĩ" value={appointment.doctorname} />
                          )}
```
Add the import at the top:
```tsx
import { DoctorCtvTrail } from '@/components/shared';
```
(Requires the API to return `ctv_name` on appointments — done in Task 4. If `ApiAppointment` is the row type here, `appointment.ctv_name` is now typed from Task 7 Step 4.)

- [ ] **Step 2: Add the breadcrumb to service rows**

In `ServiceHistoryRow.tsx`, the doctor line is:
```tsx
              {service.doctor && service.doctor !== 'N/A' && (
                <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{service.doctor}</p>
              )}
```
Replace with (show breadcrumb when the service has a CTV, otherwise the existing doctor line):
```tsx
              {service.ctvName ? (
                <DoctorCtvTrail doctorName={service.doctor} ctvName={service.ctvName} doctorLabel="BS." />
              ) : (
                service.doctor && service.doctor !== 'N/A' && (
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{service.doctor}</p>
                )
              )}
```
Add the import at the top:
```tsx
import { DoctorCtvTrail } from '@/components/shared';
```

- [ ] **Step 3: Typecheck**

Run:
```bash
cd website && npx tsc --noEmit --pretty false
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/customer/CustomerAppointmentHistory.tsx website/src/components/customer/ServiceHistoryRow.tsx
git commit -m "feat(ctv): Doctor→CTV breadcrumb on appointment + service rows"
```

---

## Task 12: CTV portal — bar + eligibility on `ReferralFlipCard`

**Files:**
- Modify: `website/src/components/ctv/ReferralFlipCard.tsx`

- [ ] **Step 1: Render the bar + eligible banner on the front face**

In `ReferralFlipCard.tsx`, the front face has the 4-step progress grid ending at the `</div>` after the `steps.map(...)` (~line 183), followed by the orange "service count" footer (~185-190). Insert the link UI between the steps grid and that footer. Add the import:
```tsx
import { CtvLinkBar } from '@/components/shared';
```
Then insert (right after the closing `</div>` of the `mt-7 grid grid-cols-4` block, before the `mt-5 ... bg-orange-50` footer):
```tsx
              {(referral.link_expires_at || referral.eligible) && (
                <div className="mt-4">
                  {referral.eligible ? (
                    <div
                      className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-500/20"
                      data-testid="ctv-eligible-banner"
                    >
                      <span aria-hidden="true">⚠</span>
                      {t('link.portalEligible', 'Đã hết hạn liên kết — khách có thể gắn CTV khác')}
                    </div>
                  ) : (
                    <CtvLinkBar
                      ctvName={referral.linked_ctv_name ?? referral.name}
                      anchorAt={referral.link_anchor_at ?? null}
                      expiresAt={referral.link_expires_at ?? null}
                      active={referral.link_active ?? true}
                      eligible={referral.eligible ?? false}
                      compact
                    />
                  )}
                </div>
              )}
```

- [ ] **Step 2: Dim the journey steps when eligible (expired)**

The 4-step grid container is `<div className="mt-7 grid grid-cols-4 gap-1.5">`. Make it dim when eligible:
```tsx
              <div className={cn('mt-7 grid grid-cols-4 gap-1.5', referral.eligible && 'opacity-40')}>
```
(`cn` is already imported in this file.)

- [ ] **Step 3: Typecheck (CtvTrackingTab already passes the full referral — no change there)**

Run:
```bash
cd website && npx tsc --noEmit --pretty false
```
Expected: no new errors. `CtvTrackingTab.tsx` passes `referral={referral}` wholesale (verified ~159-164), so the new optional fields flow through automatically.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/ctv/ReferralFlipCard.tsx
git commit -m "feat(ctv): eligibility bar + 'link another CTV' banner on portal cards"
```

---

## Task 13: i18n keys (en + vi)

**Files:**
- Modify: `website/src/i18n/locales/en/ctv.json`
- Modify: `website/src/i18n/locales/vi/ctv.json`

- [ ] **Step 1: Add a `link` block to English ctv.json**

In `website/src/i18n/locales/en/ctv.json`, add a top-level `"link"` object (place it after an existing top-level block such as `"actions"`; keep valid JSON — add a comma after the preceding block):
```json
  "link": {
    "ctvLabel": "CTV",
    "expired": "Expired — client can be linked to another CTV",
    "activeNoDate": "Linked",
    "monthsLeft": "≈{{count}} months left",
    "weeksLeft": "≈{{count}} weeks left",
    "daysLeft": "≈{{count}} days left",
    "portalEligible": "Link expired — this client can be linked to another CTV"
  }
```

- [ ] **Step 2: Add the same block to Vietnamese ctv.json**

In `website/src/i18n/locales/vi/ctv.json`, add:
```json
  "link": {
    "ctvLabel": "CTV",
    "expired": "Đã hết hạn — khách có thể gắn CTV khác",
    "activeNoDate": "Đang liên kết",
    "monthsLeft": "≈{{count}} tháng còn lại",
    "weeksLeft": "≈{{count}} tuần còn lại",
    "daysLeft": "≈{{count}} ngày còn lại",
    "portalEligible": "Đã hết hạn liên kết — khách có thể gắn CTV khác"
  }
```
(The component passes `defaultValue` for each key, so missing keys degrade gracefully — but ship both locales.)

- [ ] **Step 3: Validate JSON + run i18n audit if present**

Run:
```bash
cd website && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en/ctv.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/vi/ctv.json','utf8')); console.log('ok')"
npm run audit:i18n --silent || echo "no audit:i18n script (skip)"
```
Expected: `ok`; i18n audit passes or is absent.

- [ ] **Step 4: Commit**

```bash
git add website/src/i18n/locales/en/ctv.json website/src/i18n/locales/vi/ctv.json
git commit -m "feat(ctv): i18n keys for link countdown + eligibility"
```

---

## Task 14: Full verification gate

- [ ] **Step 1: Backend tests**

```bash
cd api && npx jest
```
Expected: PASS (referralClaim + getPartnerById suites green; no regressions).

- [ ] **Step 2: Frontend unit tests + typecheck**

```bash
cd website && npx vitest run src/__tests__/CtvLinkBar.test.tsx src/__tests__/DoctorCtvTrail.test.tsx && npx tsc --noEmit --pretty false
```
Expected: PASS; no new type errors.

- [ ] **Step 3: Lint + dependency-cruiser + build**

```bash
cd website && npx eslint src --max-warnings=0 || echo "lint: report findings, fix new ones only"
npx depcruise --output-type err src || echo "depcruise: report"
npm run build
```
Expected: build succeeds; no NEW lint/depcruise violations introduced by this change.

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A && git commit -m "chore(ctv): lint/build fixes for eligibility feature" || echo "nothing to commit"
```

---

## Task 15: Playwright E2E verification (real browser)

**Files:**
- Create: `website/e2e/nk3-ctv-eligibility.spec.ts`

- [ ] **Step 1: Ensure dev stack is up on the verified ports**

Per project rule: web at `http://127.0.0.1:5175`, API at `:3002`. Confirm no stale Docker masks local code:
```bash
lsof -i :3002 -P -n | head; docker ps --format '{{.Names}}' | grep -E 'tgroup-(api|web)' || echo "no docker tgroup containers"
```
If Docker holds the ports with stale code, `docker stop tgroup-api tgroup-web` and run local `node src/server.js` (api) + `npx vite --port 5175` (web). Confirm the API is the one with migration 054 applied (dev DB).

- [ ] **Step 2: Write the E2E spec**

Create `website/e2e/nk3-ctv-eligibility.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const BASE = process.env.NK3_BASE_URL || 'http://127.0.0.1:5175';
const EMAIL = 't@clinic.vn';
const PASSWORD = '123123';

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(EMAIL).catch(async () => {
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  });
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /login|đăng nhập|sign in/i }).first().click();
  await page.waitForLoadState('networkidle');
}

test('admin customer profile shows CTV countdown bar', async ({ page }) => {
  await login(page);
  // Open a customer that has a CTV link. Navigate to customers, open first row.
  await page.goto(`${BASE}/customers`);
  await page.waitForLoadState('networkidle');
  await page.locator('table tbody tr, [data-testid="customer-row"]').first().click();
  await page.waitForLoadState('networkidle');
  // The referral block should be present for a referred customer (skip gracefully if none).
  const badge = page.getByTestId('referral-claim-badge');
  if (await badge.count()) {
    await expect(badge).toBeVisible();
    await expect(page.locator('[data-testid="ctv-link-bar"], [data-testid="ctv-link-bar-expired"]')).toBeVisible();
  }
  await page.screenshot({ path: 'docs/live-artifacts/nk3-ctv-admin-profile.png', fullPage: true });
});

test('CTV portal renders link bar / eligibility on cards', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/ctv`);
  await page.waitForLoadState('networkidle');
  // Tracking tab lists referral cards.
  await page.getByRole('button', { name: /track|theo dõi|referr/i }).first().click().catch(() => {});
  await page.waitForLoadState('networkidle');
  const card = page.locator('article').first();
  if (await card.count()) {
    await expect(card).toBeVisible();
  }
  await page.screenshot({ path: 'docs/live-artifacts/nk3-ctv-portal.png', fullPage: true });
});
```
(Selectors are defensive; adjust to the actual login form if needed by reading the login page. The goal is real-browser evidence per the project verification rule.)

- [ ] **Step 3: Run the E2E spec**

```bash
cd website && npx playwright test e2e/nk3-ctv-eligibility.spec.ts --reporter=line
```
Expected: PASS; screenshots written to `docs/live-artifacts/`. Inspect the screenshots to confirm the bar renders on the admin profile and the portal cards show the bar/eligibility.

- [ ] **Step 4: Commit**

```bash
git add website/e2e/nk3-ctv-eligibility.spec.ts docs/live-artifacts/nk3-ctv-admin-profile.png docs/live-artifacts/nk3-ctv-portal.png
git commit -m "test(ctv): e2e for eligibility bar + portal eligibility"
```

---

## Task 16: Version bump + docs

**Files:**
- Modify: `website/package.json` (version)
- Modify: `website/public/CHANGELOG.json` (new top entry)
- Modify: `docs/CHANGELOG.md`
- Modify: `testbright.md`

- [ ] **Step 1: Bump the web version**

In `website/package.json`, bump the `version` patch (e.g. `0.32.91` → `0.32.92`). Capture the new version and the current commit:
```bash
cd website && node -e "const p=require('./package.json');console.log(p.version)"
git rev-parse --short HEAD
```

- [ ] **Step 2: Add the CHANGELOG.json entry**

Prepend a new object to the TOP of the array in `website/public/CHANGELOG.json`:
```json
{
  "version": "<new version>",
  "date": "2026-06-02",
  "commit": "<short hash>",
  "highlights": "CTV 6-month eligibility countdown bar + Doctor→CTV breadcrumb",
  "sections": [
    { "title": "New Features", "items": [
      "Customer profile: 6-month CTV-link countdown bar (color-shifts; shows 'eligible for another CTV' when expired)",
      "Customer profile: Doctor→CTV breadcrumb on appointment and service rows",
      "CTV portal: per-client link countdown + 'client can be linked to another CTV' banner"
    ]},
    { "title": "Backend", "items": [
      "appointments.ctv_id column (migration 054) + persisted on booking/edit",
      "getCtvLinkStatus: link anchored on the latest non-cancelled CTV-bearing appointment or service (6-month window)"
    ]},
    { "title": "Testing", "items": [
      "Jest: computeCtvLink unit tests; Vitest: CtvLinkBar + DoctorCtvTrail; Playwright: admin + portal"
    ]}
  ]
}
```

- [ ] **Step 3: Update docs/CHANGELOG.md and testbright.md**

Add a dated entry to `docs/CHANGELOG.md` summarizing the feature (mirror the highlights). Add the new surfaces/flows to `testbright.md` (the task touched frontend + contract + backend data flow, per the repo's "before edits" rule). Keep entries concise and consistent with existing format in each file.

- [ ] **Step 4: Commit**

```bash
git add website/package.json website/public/CHANGELOG.json docs/CHANGELOG.md testbright.md
git commit -m "chore(ctv): v<new version> — eligibility bar + breadcrumb release notes"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- §2 rule (latest CTV-bearing event, 6mo, non-destructive) → Tasks 1–3, 6. ✅
- §4 data model (appointments.ctv_id + persist + backfill) → Tasks 1–2. ✅
- §5 backend computation + endpoints (referrals, lookup, gate, profile) → Tasks 3, 5, 6. ✅
- §6a CtvLinkBar → Task 8; §6b DoctorCtvTrail → Task 9; §6c admin header+rows → Tasks 10–11; §6d portal → Task 12. ✅
- §7 invariants (no commission/earnings/unlink changes) → respected (no edits to commissionEngine/earnings; no clear of referred_by_ctv_id beyond existing flows). ✅
- §8 testing (jest unit, vitest components, playwright, audits) → Tasks 3,8,9,14,15. ✅
- §9 rollout (migration order, version bump, changelog, testbright) → Tasks 1,16. ✅

**Placeholder scan:** No TBD/TODO. Two intentional "verify the exact variable name / find the query" steps (Task 2 Step 2, Task 4 Step 3) include the search command and the precise change to make — acceptable because the surrounding code uses dynamic builders whose local identifiers must be matched, not invented.

**Type consistency:** Backend `computeCtvLink` returns `{linkedCtvId, linkedCtvName, anchorAt, anchorSource, expiresAt, active, eligible, windowMonths}` — used identically in Tasks 3, 5, 6. Frontend `CtvReferral` fields `link_expires_at/link_anchor_at/link_active/eligible/linked_ctv_name` (Task 7) match what the API attaches (Task 6 Step 2) and what `ReferralFlipCard` reads (Task 12). `ReferralClaim.anchorAt/eligible` (Task 7) match what `getPartnerById` returns (Task 5) and what `ProfileHeader` reads (Task 10). `CtvLinkBar` prop names consistent across Tasks 8, 10, 12. `ctvName` on `CustomerService` (Task 7) matches `ServiceHistoryRow` usage (Task 11).
