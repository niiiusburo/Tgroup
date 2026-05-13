# TGroup Clinic — Security

> Auth flow, RBAC roles, secret storage locations, token structure, sensitive-action approval thresholds.

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

### Permission Resolution Order

1. **Group permissions** (`group_permissions` via `partners.tier_id`)
2. **Employee overrides** (`permission_overrides` — grant or revoke specific strings)
3. **Location scope** (`employee_location_scope` — restricts visible locations)

Effective permissions = (Group ∪ Grants) − Revokes, then filtered by location scope at the UI level.

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
| `COMPREFACE_API_KEY` | `.env`, VPS | Backend → Compreface only. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | `.env`, Docker Compose | Container startup only. |

**Policy:** `.env.example` documents the shape. Real values are local-only and gitignored. If a secret is ever committed, treat it as exposed and rotate immediately.

## Rate Limiting

| Endpoint | Limit | Scope |
|---|---|---|
| `POST /api/Auth/login` | 5 failures / 15 min per email+IP | Brute-force protection |
| `POST /api/Auth/login` | 20 failures / 15 min per IP | Network-wide cap |
| `POST /api/telemetry/errors` | 100 req / min per IP | Public ingestion abuse prevention |

**Implementation:** `express-rate-limit` in `api/src/server.js` for login; custom counter in `api/src/routes/auth.js` for email-scoped lockout.

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
