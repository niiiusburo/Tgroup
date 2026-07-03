# TGroup Clinic — Security

> **Cosmetic LOB v2 (Phase 0):** LOB scope (lob_scope + requireLobScope) is hard gate; new perms are soft gate. Multi-LOB selection is Admin-only: non-admin staff receive one visible LOB in auth responses and must not see the header selector. CTV role (is_ctv) + ctv.* perms gate /ctv surface; is_ctv users receive 403 on all admin routes and are redirected at login. No PII in CTV aggregation responses. See governance-delta.md, SECURITY section of v2 design, and ctv.yaml. All new routes behind COSMETIC_LOB_ENABLED flag until Phase 4.

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
  email: string; // staff/admin email, or imported legacy CTV phone/ref code
  companyId: string;     // primary branch
  lob_scope: Array<'dental' | 'cosmetic'>; // Admin may receive multiple; staff receive one
  is_ctv: boolean;
  remember: boolean;     // true = 60d expiry
  iat: number;
  exp: number;
}
```

**Storage:** `localStorage` key `tgclinic_token`. Not httpOnly cookie (see ADR-0004).

**CSRF posture:** Authenticated API requests must include an explicit `Authorization: Bearer <token>` header. The app does not use cookie-backed API sessions, and CORS is allowlist-based; CSRF middleware is therefore not part of the current auth boundary. If API auth moves to cookies, CSRF protection must be added before release.

**CTV self account settings:** `GET/PATCH /api/ctv/me` and `POST /api/ctv/me/password` are authenticated, require `ctv.dashboard.view`, and then enforce `partners.is_ctv=true` from the JWT identity. The routes never accept another CTV id in the body; they derive the target from `req.user.employeeId`. Password changes require the current password, accept the gated legacy CTV password fallback only for imported CTV rows, and always store the replacement as bcrypt.

**Public CTV landing flows:** `/api/ctv-public/client-lookup`, `/api/ctv-public/ctv-lookup`, `/api/ctv-public/services`, `/api/ctv-public/bookings`, `/api/ctv-public/refcode/:code`, and `/api/ctv-public/join` intentionally bypass JWT auth for the Tâm landing page. Booking requires a submitted `ctvPhone`, live-verifies it through read-only lookup, resolves only active non-deleted `partners.is_ctv=true` rows from Dental, runs the active referral-claim gate, and may write only `partners` plus `appointments` in the selected LOB. Signup requires either a referral code or submitted `uplinePhone`, live-verifies typed upline phones, and creates a new CTV partner only under the resolved active CTV. These routes must not create service cards, sale orders, payments, earnings, payouts, or permission/session state. Treat submitted CTV phone values as attribution identifiers, not proof of login.

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

### Permission Resolution Order

1. **Group permissions** (`group_permissions` via `partners.tier_id`)
2. **Employee overrides** (`permission_overrides` — grant or revoke specific strings)
3. **Location scope** (`employee_location_scope` — restricts visible locations)

Effective permissions = (Group ∪ Grants) − Revokes, then constrained by location scope. The UI locks one-branch users to their assigned branch, and backend read handlers must also enforce `partners.companyid` / `appointments.companyid` / customer-branch joins through `api/src/services/locationScope.js`. Plain `Admin` is branch-scoped unless the user has wildcard permission, `Super Admin`, or `System Administrator`.

### Dangerous Permissions (Require Explicit Assignment)

| Permission | Action | Why Dangerous |
|---|---|---|
| `customers.hard_delete` | Physical row removal | Irreversible data loss |
| `payment.void` | Reverse a posted payment | Audit trail break |
| `payment.refund` | Create negative payment | Direct revenue impact |
| `payment.delete` | Remove payment row | Destroys financial record |
| `settings.system` | Change system preferences | Can break app behavior |
| `permissions.edit` | Modify permission groups | Privilege escalation |
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
| `COMPREFACE_API_KEY` | `.env`, VPS | Backend → CompreFace only when `FACE_RECOGNITION_PROVIDER=compreface`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | `.env`, Docker Compose | Container startup only. |

**Policy:** `.env.example` documents the shape. Real values are local-only and gitignored. If a secret is ever committed, treat it as exposed and rotate immediately.

## Rate Limiting

| Endpoint | Limit | Scope |
|---|---|---|
| `POST /api/Auth/login` | 10 failures / 15 min per login identifier+IP | Brute-force protection |
| `POST /api/Auth/login` | 75 failures / 15 min per IP | Network-wide cap |
| `POST /api/telemetry/errors` | 100 req / min per IP | Public ingestion abuse prevention |
| `POST /api/ctv/me/password` | Auth + current-password check only today | CTV self-service password changes are not public; add endpoint-specific throttling if abuse is observed or the portal is widened. |
| `/api/ctv-public/*` | Covered by IP access/CORS only today | Public booking and signup are intentionally unauthenticated; add endpoint-specific throttling before widening beyond phone-attributed appointment creation or CTV partner signup. |

**Implementation:** two `express-rate-limit` limiters in `api/src/server.js`; successful logins are skipped so the lockout budget counts failed attempts.

## Input Validation

- **SQL Injection:** Mitigated by parameterized queries (`$1`, `$2`) in all `api/src/db.js` usages. No raw string concatenation in route handlers.
- **XSS:** Mitigated by React's default escaping. User-generated content in feedback/website pages must be sanitized before storage.
- **File Uploads:** `feedback_attachments` uses `multer` + `sharp` for image resizing. Max file size enforced by nginx `client_max_body_size 25m`.
- **CORS:** `ALLOWED_ORIGINS` whitelist in `api/src/server.js`. Dev origin regex allows `localhost` ports.

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

**Note:** There is no unified audit log table. Financial audit relies on `payments`, `payment_allocations`, and `saleorder_state_logs`.

## Security Incident Response

1. **Suspected credential leak:** Rotate `JWT_SECRET` immediately; all users must re-login.
2. **Suspected data breach:** Check `exports_audit` and `error_events` for anomalies. Backup DB before investigation.
3. **DDoS / abuse:** Enable IP access control; scale nginx worker processes; consider Cloudflare.
4. **Ransomware / host compromise:** Isolate VPS; restore from latest backup; rotate all secrets.
