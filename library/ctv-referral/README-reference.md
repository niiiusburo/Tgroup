# CTV / Affiliate / Referral Systems — Reference Library

> For TGClinic's CTV (Cộng Tác Viên / affiliate) module: public join, portal recruit, admin create, referral codes, upline/downline, commission dashboards.

## 1. Repositories Downloaded

| # | Folder | Repository | License | Why It Matters |
|---|---|---|---|---|
| 1 | `refferq-affiliate-dashboard` + `refferq-api-routes` + `refferq-prisma-schema` | [Refferq/Refferq](https://github.com/Refferq/Refferq) | MIT | Full affiliate platform with public redirect handler, referral code generation, affiliate dashboard stats, Prisma schema. |
| 2 | `refref-coredb` + `refref-widget-ui` | [refrefhq/refref](https://github.com/refrefhq/refref) | AGPL-3.0 | Referral infrastructure with participant/program/product-scoped referral codes and vanity links. |
| 3 | `raider-schema` + `raider-dashboard-templates` | [valeriansaliou/raider](https://github.com/valeriansaliou/raider) | MPL-2.0 | Classic affiliate dashboard data model (account, tracker, balance, payout) and Rust/Tera dashboard templates. |
| 4 | `referralhub-models` + `referralhub-dashboard` | [EcstaticFly/ReferralHub](https://github.com/EcstaticFly/ReferralHub) | GPL-3.0 | Two-sided marketplace: customer has `referralCode` + `referredBy` self-reference; business dashboard stats. |
| 5 | `affiliate-mgmt-core` | [prathammahajan13/affiliate-management-system](https://github.com/prathammahajan13/affiliate-management-system) | MIT | Configurable `AffiliateEngine` with multi-tier commission, volume bonuses, fraud detection. |
| 6 | `invitation-system-prisma` | [arikchakma/invitation-system](https://github.com/arikchakma/invitation-system) | MIT | Token-based invitation system with email+project unique constraint and expiration. |
| 7 | `referral-system-node` | (Node.js referral system, ISC) | ISC | Minimal referral code + user attribution in Node.js. |

## 2. Specific Patterns to Adopt

### 2.1 Referral Code Generation
**From:** `refferq-api-routes/route.ts`

```ts
function generateReferralCode(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `${cleanName.substr(0, 6)}-${random}`;
}
```

**TGClinic adaptation:**
- Use the existing CTV's `partners.referral_code` or generate deterministic codes for new CTVs.
- Add collision retry: if code exists, append/increment a suffix.
- Store in `partners` table with a unique constraint.

### 2.2 Public Referral Redirect + Attribution
**From:** `refferq-api-routes/referral-redirect-route.ts`

- `GET /r/:code` validates the code, sets an `affiliate_attribution` cookie, and redirects to the target landing page.
- Fraud protection: basic IP/user-agent checks.

**TGClinic adaptation:**
- `/ctv/join?ref=CODE` already resolves codes in `JoinCtv.tsx`.
- Consider adding server-side redirect `/r/:code` for cleaner share links.
- Cookie attribution may conflict with phone-based claim semantics — use as a fallback only.

### 2.3 Affiliate Dashboard Stats
**From:** `refferq-affiliate-dashboard/page.tsx`

```ts
interface AffiliateStats {
  totalEarnings: number;
  pendingEarnings: number;
  totalClicks: number;
  totalLeads: number;
  totalReferredCustomers: number;
  totalConversions: number;
  conversionRate: number;
  referralLink: string;
  referralCode: string;
}
```

**TGClinic adaptation:**
- `CtvDashboard.tsx` already shows commission summary.
- Align naming: `totalEarned`, `paidEarnings`, `pendingEarnings`, `referralCount`, `conversionRate`.
- Compute from `earnings` + `payouts` + `partners.referred_by_ctv_id`.

### 2.4 Self-Referential Customer / Two-Sided Marketplace
**From:** `referralhub-models/customer.js`

```js
const customerSchema = new mongoose.Schema({
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: ObjectId, ref: "Customer", default: null, sparse: true },
  rewardsEarned: { type: Number, default: 0 },
  referralsSent: { type: Number, default: 0 },
});
```

**TGClinic adaptation:**
- `partners` table already has `referred_by_ctv_id` and `is_ctv`.
- Add `referral_code` unique sparse index for public signup links.
- Track `referrals_count` or compute from index.

### 2.5 Multi-Tier Commission Engine
**From:** `affiliate-mgmt-core/AffiliateEngine.js`

```js
const defaultConfig = {
  commission: { enabled: true, multiTier: false, calculation: "percentage", rate: 10 },
  referral: { enabled: true, tracking: true, attribution: "last-click", validation: true },
  payment: { enabled: true, processor: "razorpay", schedule: "monthly", minimum: 50 },
  fraud: { enabled: true, detection: true, prevention: true, monitoring: true },
};
```

**TGClinic adaptation:**
- TGClinic already has L0-L4 MLM levels in `commission_level_config`.
- Centralize commission split logic in a service instead of inline in `commissionEngine.js`/`ctv.js`.
- Make attribution configurable (sale-staff, consultation, CTV).

### 2.6 Referral Code / Link Tables
**From:** `refref-coredb/schema.ts`

```ts
export const refcode = pgTable("refcode", {
  code: text("code").notNull(),
  participantId: text("participant_id").notNull(),
  programId: text("program_id").notNull(),
  productId: text("product_id").notNull(),
}, (table) => [
  uniqueIndex("refcode_code_unique_idx").on(table.code),
  index("refcode_participant_id_idx").on(table.participantId),
]);
```

**TGClinic adaptation:**
- If CTV codes need per-product or per-campaign tracking, add a `ctv_referral_codes` table scoped by `ctv_partner_id` and optional `product_id`.
- Keep `partners.referral_code` as the default code for simplicity.

## 3. Recommendations for TGClinic

### Keep the CTV Creation SSOT Clean
- All CTV creation UIs must continue to use `CtvCreationForm` + `useCtvCreationForm`.
- Any new mode should extend the hook config, not inline fields.
- See `website/src/components/shared/CtvCreationForm/README.md`.

### Extract CTV Summary Aggregator
- The earnings aggregation logic in `api/src/routes/ctv.js` and `api/src/routes/ctvClientJourneys.js` is duplicated.
- Create `ctvService.buildSummary(earnRows)` to produce:
  - `total_earned`
  - `paid_earnings`
  - `last_service`
  - `last_payment`
  - `stage` (referred → service → paid)

### Add Deterministic Referral Codes
- Generate codes from CTV name + random suffix.
- Retry on collision.
- Store in `partners.referral_code` with unique index.

### Server-Side Redirect Endpoint
- Add `GET /api/ctv-public/r/:code` that resolves the code and redirects to `/ctv/join?ref=CODE`.
- This gives CTVs short shareable links.

### Fraud / Duplicate Protection
- Phone-level deduplication is already used for CTV creation.
- For attribution, verify that a customer is not self-attributed to their own upline.

## 4. Key Files to Study

- `refferq-api-routes/route.ts` — referral code generation
- `refferq-api-routes/referral-redirect-route.ts` — redirect + cookie attribution
- `refferq-affiliate-dashboard/page.tsx` — dashboard stats interface
- `referralhub-models/customer.js` — two-sided marketplace schema
- `referralhub-dashboard/dashboardController.js` — dashboard stats aggregation
- `affiliate-mgmt-core/AffiliateEngine.js` — multi-tier commission config
- `refref-coredb/schema.ts` — referral code/link tables
- `raider-schema/raider.sql` — classic affiliate schema

## 5. License & Usage Notes

- **MIT:** Refferq, affiliate-mgmt-core, invitation-system, referral-system-node, express-patterns repos — safe for study and reuse.
- **AGPL-3.0:** RefRef — copyleft; do not embed code directly into TGClinic proprietary codebase.
- **GPL-3.0:** ReferralHub — copyleft; study patterns only.
- **MPL-2.0:** Raider — file-level copyleft; study patterns only.

## 6. Caveats

- Most open-source affiliate platforms are single-tier; TGClinic's L0-L4 MLM is custom.
- Cookie attribution (30-day window) may not align with phone-first claim semantics.
- MongoDB examples need translation to PostgreSQL relational schema.
- Raider is MySQL-only — adapt types and syntax for PostgreSQL.
