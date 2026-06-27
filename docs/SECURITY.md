# TGroup Clinic — Security

> Auth flow, RBAC roles, secret storage locations, token structure, sensitive-action approval thresholds.

**Cosmetic LOB v2 (2026-05-19 sync):** LOB gate (requireLobScope), CTV role gate (is_ctv on partners + 403 redirect), scope=empty = legacy dental, soft-ref validation on recipient_partner_id, lob.crossview perm. partners table is auth source (not users). See AGENTS.md, product-map ct v/earnings, v2 spec §272.



## Auth Flow

```
Staff → /login form → POST /api/Auth/login
  → bcrypt compare
  → resolveEffectivePermissions()
  → JWT.sign(payload, JWT_SECRET, expiresIn: '24h'|'60d')
  → { token, user, permissions }
  → localStorage.setItem('tgclinic_token', token)
  → AuthContext populated
  → All subsequent requests include Authorization: Bearer <token>
```

### Token Structure (JWT Payload)
```ts
{
  employeeId: string;    // partners.id
  name: string;
  email: string;
  companyId: string;     // primary branch
  remember: boolean;     // true = 60d expiry
  iat: number;
  exp: number;
}
```

**Storage:** `localStorage` key `tgclinic_token`. Not httpOnly cookie (see ADR-0004).

**Secret:** `JWT_SECRET` env var. Must be identical across all environments sharing token validation (prod and staging may differ, but swapping tokens between them fails validation).

**Expiry:**
- Default: 24 hours
- Remember Me: 60 days
- No automatic refresh; user must re-login after expiry.

## RBAC Roles

### Tier-Based Groups (`permission_groups`)

| Group | Typical Permissions | Notes |
|---|---|---|
| Admin | `*` (wildcard) | Full access; bypasses specific checks |
| Manager | `reports.view`, `payment.view`, `customers.view`, `appointments.edit`, ... | View-heavy; mutation requires explicit permissions |
| Doctor | `appointments.view`, `appointments.edit`, `services.edit` | Clinical workflows only |
| Receptionist | `appointments.add`, `appointments.edit`, `customers.view`, `customers.add`, `payment.add` | Front-desk operations |
| Cashier | `payment.add`, `payment.view`, `customers.view` | Money collection |
| Investor | Staff-shell explicit permissions such as `overview.view`, `calendar.view`, `customers.*`, `appointments.*`, `payment.*`, `reports.view`, `permissions.view`, `permissions.edit` | Normal employee identity with customer-linked data scoped by `dbo.investor_clients`; no wildcard `*`; role/employee self-escalation and investor allowlist curation are handler-blocked |

### Permission Resolution Order

1. **Group permissions** (`group_permissions` via `partners.tier_id`)
2. **Employee overrides** (`permission_overrides` — grant or revoke specific strings)
3. **Location scope** (`employee_location_scope` — restricts visible locations)

Effective permissions = (Group ∪ Grants) − Revokes, then filtered by location scope at the UI level.

Investor customer scope is an additional backend data filter. Only employee identities whose permission group name is exactly `investor` are scoped through `dbo.investor_clients`; everyone else keeps the existing behavior. The investor group resolves to an explicit staff-style permission set so the employee shell does not hide normal pages or controls, but it is never granted wildcard `*` access. Customer-linked reads/writes must apply the allowlist; role/employee mutation endpoints block investor callers even when the UI exposes those controls. On NK2, investor passwords may be stored in `dbo.investor_accounts` instead of `partners.password_hash` so the shared `tdental_demo` database does not create a production-login-capable NK account before NK production has the same investor filters.

Investor allowlist curation is Admin-only. `/customers` may render the Investor checkbox only for Admin-class users, and `GET /api/Partners/investor-visibility` plus `PATCH /api/Partners/:id/investor-visibility` require `permissions.edit` and a handler-level Admin-class check before reading or writing `dbo.investor_clients`.

### Dangerous Permissions (Require Explicit Assignment)

| Permission | Action | Why Dangerous |
|---|---|---|
| `customers.hard_delete` | Physical row removal | Irreversible data loss |
| `payment.void` | Reverse a posted payment | Audit trail break |
| `payment.refund` | Create negative payment | Direct revenue impact |
| `payment.delete` | Remove payment row | Destroys financial record |
| `settings.system` | Change system preferences | Can break app behavior |
| `permissions.edit` | Modify permission groups | Privilege escalation |
| `permissions.edit` + Admin class | Mark customers visible to investor accounts | External customer allowlist write in `dbo.investor_clients` |
| `external_checkups.upload` | Upload to Hosoonline | Writes to external system |

### Sensitive-Action Approval Thresholds

| Action | Required Permission | Additional Safeguard |
|---|---|---|
| Hard delete customer | `customers.hard_delete` | Confirmation modal + context display |
| Void payment | `payment.void` | Confirmation + reason input |
| Refund payment | `payment.refund` | Confirmation + amount validation |
| Delete payment | `payment.delete` | Confirmation + audit log |
| Change permission group | `permissions.edit` | Admin-only UI; group list protected |
| Edit system preferences | `settings.system` | Admin-only |
| Deploy to production | Human approval | Not automated; `AGENTS.md` worktree discipline |

## Secret Storage Locations

| Secret | Location | Access |
|---|---|---|
| `JWT_SECRET` | `.env` (local), VPS secret storage (prod), Docker env (runtime) | Never committed. Rotate if exposed. |
| `DATABASE_URL` / DB password | Same as above | Same |
| `GOOGLE_PLACES_API_KEY` | `.env`, VPS | Server-side only; never sent to browser. |
| `HOSOONLINE_USERNAME`, `PASSWORD`, `API_KEY` | `.env`, VPS | Backend proxy only. |
| `LARK_FEEDBACK_WEBHOOK_URL`, `LARK_FEEDBACK_WEBHOOK_SECRET` | `.env`, VPS | Backend-only outbound feedback alerts to the T-Group Lark custom bot. Never expose in browser bundles or commit to git. |
| `COMPREFACE_API_KEY` | `.env`, VPS | Backend → CompreFace only when `FACE_RECOGNITION_PROVIDER=compreface`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | `.env`, Docker Compose | Container startup only. |

**Policy:** `.env.example` documents the shape. Real values are local-only and gitignored. If a secret is ever committed, treat it as exposed and rotate immediately.

## Rate Limiting

| Endpoint | Limit | Scope |
|---|---|---|
| `POST /api/Auth/login` | 5 failures / 15 min per email+IP | Brute-force protection |
| `POST /api/Auth/login` | 20 failures / 15 min per IP | Network-wide cap |
| `POST /api/telemetry/errors` | 100 req / min per IP | Public ingestion abuse prevention |
| `POST /api/public/face/checkin` | 5 req / 5 sec burst and 10 req / min sustained per IP | Public Face ID recognition abuse prevention |

**Implementation:** `express-rate-limit` in `api/src/server.js` for login; custom counter in `api/src/routes/auth.js` for email-scoped lockout.

## Input Validation

- **SQL Injection:** Mitigated by parameterized queries (`$1`, `$2`) in all `api/src/db.js` usages. No raw string concatenation in route handlers.
- **XSS:** Mitigated by React's default escaping. User-generated content in feedback/website pages must be sanitized before storage.
- **File Uploads:** `feedback_attachments` uses `multer` + `sharp` for image resizing. Max file size enforced by nginx `client_max_body_size 25m`.
- **Outbound Lark alerts:** Feedback alerts send bounded text previews and metadata only after the feedback transaction commits. Attachment bytes are not forwarded. `api/src/services/larkNotifier.js` only accepts HTTPS custom bot URLs on `open.larksuite.com` or `open.feishu.cn` and supports optional Lark signature verification through `LARK_FEEDBACK_WEBHOOK_SECRET`. Fields that cross the boundary into Lark: feedback content preview (≤900 chars), thread ID, reporter (employee ID/name), page URL or page path (may contain query params with patient identifiers), screen size, attachment count, and for auto-detected alerts the error type, error message preview (≤900 chars), route, and API endpoint/method. The inbox link in `auto` alerts is pinned to `TGROUP_PUBLIC_URL` and ignores client-supplied `Origin`/`Referer` to prevent phishing redirects through the unauthenticated `/api/telemetry/errors` endpoint.
- **CORS:** `ALLOWED_ORIGINS` whitelist in `api/src/server.js`. Dev origin regex allows `localhost` ports.
- **Public Face ID kiosk:** `POST /api/public/face/checkin` is intentionally unauthenticated but recognize-only. It must not return `partnerId`, phone, code, confidence, candidate identities, or any token/session material. Hidden Face ID diagnostics are server-only: they hash subject/IP/user-agent identifiers and must not store raw images, raw embeddings, names, phone numbers, customer codes, raw partner IDs, or tokens.

## Network Security

- **TLS:** Terminated by nginx. All production traffic is HTTPS.
- **IP Access Control:** Per-company whitelist (`ip_access_settings` + `ip_access_entries`). Enforced by `api/src/middleware/ipAccess.js`.
- **VPS Firewall:** SSH on non-standard port; fail2ban recommended (not documented in current setup).

## Audit Trail

| Table | What it audits |
|---|---|
| `saleorder_state_logs` | State transitions on invoices |
| `payment_allocations` | Links payments to invoices (immutable) |
| `exports_audit` | Who downloaded what export when |
| `error_events` + `error_fix_attempts` | Frontend errors and admin fix attempts |
| `uploads/face-diagnostics/*.jsonl` | Hidden Face ID recognition attempts, provider decisions, score margins, hashed candidate IDs, and error metadata for tuning/debugging |

**Note:** There is no unified audit log table. Financial audit relies on `payments`, `payment_allocations`, and `saleorder_state_logs`. Face ID diagnostics are file-backed operational records, not public static assets; only `/uploads/feedback` is exposed through nginx/API static serving.

## Security Incident Response

1. **Suspected credential leak:** Rotate `JWT_SECRET` immediately; all users must re-login.
2. **Suspected data breach:** Check `exports_audit` and `error_events` for anomalies. Backup DB before investigation.
3. **DDoS / abuse:** Enable IP access control; scale nginx worker processes; consider Cloudflare.
4. **Ransomware / host compromise:** Isolate VPS; restore from latest backup; rotate all secrets.
