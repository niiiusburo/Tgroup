# Agent 4: Integration & IP Blocking Middleware

## Goal
Integrate IP Access Control into the Settings page and create IP blocking logic for the app.

## Files to Create/Modify

### 1. Modify: `src/pages/Settings/index.tsx`
Add the IpAccessControl component to the Settings page:
- Import `IpAccessControl` from `@/components/settings/IpAccessControl`
- Add it as a new section below `SystemPreferences`
- Wrap in a container with proper spacing

### 2. Create: `src/lib/ipAccessMiddleware.ts`
Create IP access checking utilities for runtime enforcement:

```typescript
// Functions to implement:
- checkIpAccess(ipAddress: string, settings: IpAccessSettings): { allowed: boolean, reason?: string }
- getClientIp(): string  // Extract from request/headers
- middlewareIpCheck(): boolean  // Main middleware function
```

### 3. Create: `src/hooks/useClientIp.ts`
Hook to detect client's IP address:
- Fetch from a public IP API (ipapi.co or similar) on mount
- Cache the result
- Return { ip, loading, error }

### 4. Modify: `src/contexts/AuthContext.tsx` (or create blocking wrapper)
Add IP access check during authentication:
- Before login, check if client IP is allowed
- If blocked, show error: "Access denied from this IP address"
- Log blocked attempts

## TDD Requirements
Write tests FIRST in `src/__tests__/ipAccess.integration.test.ts`:
1. Test Settings page renders IpAccessControl component
2. Test `checkIpAccess` with all three modes
3. Test IP matching logic (exact match)
4. Test blocked IP shows access denied message
5. Test allowed IP proceeds normally
6. Test `useClientIp` hook fetches and caches IP

Run tests: `cd website && npx vitest run src/__tests__/ipAccess.integration.test.ts`

## Constraints
- IP check should happen early in app lifecycle
- Block before authentication to prevent brute force
- Graceful degradation if IP detection fails (allow access)
- Log all blocked attempts (console.log for now)
- Don't break existing auth flow

## Output
Return summary of:
1. Integration points added
2. Middleware logic and when it runs
3. Test results
4. Security considerations addressed
5. Any trade-offs made
