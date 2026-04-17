# IP Management PRD

## Objective
Make the existing IP Access Control system fully functional end-to-end: database persistence, REST API, backend enforcement, and frontend integration.

## Scope
- Backend: PostgreSQL schema, Express routes, middleware enforcement
- Frontend: Real API integration, support for 4 access modes

## Access Modes (4)
1. **allow_all** — Allow all IP addresses (default)
2. **block_all** — Deny all IP addresses
3. **whitelist_only** — Allow only listed IPs (allow some)
4. **blacklist_block** — Block only listed IPs, allow all others (block some)

## Database Schema

### dbo.ip_access_settings
```sql
CREATE TABLE IF NOT EXISTS dbo.ip_access_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode VARCHAR(50) NOT NULL DEFAULT 'allow_all' CHECK (mode IN ('allow_all', 'block_all', 'whitelist_only', 'blacklist_block')),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### dbo.ip_access_entries
```sql
CREATE TABLE IF NOT EXISTS dbo.ip_access_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('whitelist', 'blacklist')),
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES dbo.partners(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_ip_access_entries_address_type ON dbo.ip_access_entries(ip_address, type);
CREATE INDEX idx_ip_access_entries_type_active ON dbo.ip_access_entries(type, is_active);
```

## Backend API

### Routes: `/api/IpAccess`
- `GET /settings` → `{ mode, lastUpdated }`
- `PUT /settings` → `{ mode }` (requires `settings.edit`)
- `GET /entries` → `{ entries: [...] }`
- `POST /entries` → create entry (requires `settings.edit`)
- `PUT /entries/:id` → update entry (requires `settings.edit`)
- `DELETE /entries/:id` → delete entry (requires `settings.edit`)
- `GET /check` → `{ allowed, reason?, matchedEntry? }` (public, checks caller IP)

### Middleware
`api/src/middleware/ipAccess.js`
- Reads current mode + active entries from DB on first request, then caches for 30s
- Applies to ALL `/api/*` routes (including login) so blocked IPs cannot even authenticate
- Returns `403` with JSON `{ error: 'Access denied from this IP address' }` when blocked
- Skips enforcement for health checks or if mode is `allow_all`

## Frontend Changes

### Types (`website/src/types/ipAccessControl.ts`)
- Add `block_all` to `IpAccessMode`

### Hook (`website/src/hooks/useIpAccessControl.ts`)
- Replace local state with API calls via new `lib/api/ipAccess.ts`
- Keep optimistic UI updates
- Add `block_all` handling in `isIpAllowed`

### Component (`website/src/components/settings/IpAccessControl.tsx`)
- Add 4th mode card: "Block All"
- Keep existing UI, wire to real API

### API Client (`website/src/lib/api/ipAccess.ts`)
- CRUD wrappers matching backend endpoints

## Enforcement Flow
1. Request hits `ipAccessMiddleware` before auth
2. Middleware looks up client IP from `X-Forwarded-For`, `X-Real-IP`, or `req.socket.remoteAddress`
3. Checks against cached settings
4. If blocked → 403, no further processing
5. If allowed → proceeds to auth/routes

## Security Considerations
- Use PostgreSQL `INET` type for correct IP comparison
- Trim and validate all inputs on both client and server
- Cache settings in middleware to avoid DB query per request
- Log blocked attempts with IP, path, and timestamp

## Test Plan
- Run existing Vitest suites (53 tests should still pass)
- Add tests for `block_all` mode in hook and middleware
- Verify backend routes with `npm test` in `api/`

## Rollout
- Local-first: verify migrations, run frontend + backend, test all 4 modes
- Deploy to VPS after local verification
