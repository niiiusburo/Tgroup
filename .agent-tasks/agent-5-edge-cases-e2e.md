# Agent 5: Edge Cases & E2E Testing for IP Access Control

## Goal
Handle edge cases, security concerns, and create comprehensive end-to-end tests for the complete IP Access Control feature.

## Files to Create/Modify

### 1. Create: `src/lib/ipValidation.ts` (extract from hook if needed)
Pure functions for IP validation with comprehensive edge case handling:

```typescript
// Functions to implement:
- isValidIpv4(ip: string): boolean
- normalizeIp(ip: string): string  // Trim, format consistently
- isPrivateIp(ip: string): boolean  // Check if LAN/private range
- ipToLong(ip: string): number  // Convert to numeric for range checking
- isIpInRange(ip: string, range: string): boolean  // CIDR support
- sanitizeIpInput(input: string): string  // Clean user input
```

### 2. Create: `src/__tests__/ipValidation.edgecases.test.ts`
Comprehensive edge case tests:

**Invalid IP formats:**
- Empty string
- "abc.def.ghi.jkl"
- "256.1.1.1" (out of range)
- "192.168.1" (incomplete)
- "192.168.1.1.1" (extra octet)
- " 192.168.1.1 " (whitespace)
- "192.168.01.1" (leading zeros)
- Special characters, SQL injection attempts

**Edge cases:**
- Boundary values: "0.0.0.0", "255.255.255.255"
- Loopback: "127.0.0.1"
- Broadcast: "255.255.255.255"
- All same octet: "1.1.1.1", "0.0.0.0"

**Security tests:**
- SQL injection in description field
- XSS attempts in IP input
- Very long inputs (1000+ chars)
- Unicode and special chars
- Null/undefined handling

### 3. Modify: Existing test files for completeness
Review and enhance:
- `src/__tests__/ipAccessControl.types.test.ts`
- `src/__tests__/useIpAccessControl.test.ts`
- `src/__tests__/IpAccessControl.component.test.tsx`
- `src/__tests__/ipAccess.integration.test.ts`

Add any missing edge case tests.

### 4. Create: `src/__tests__/ipAccess.e2e.test.tsx`
End-to-end flow tests:
1. User opens Settings → sees IP Access Control section
2. Changes mode to "Whitelist Only"
3. Adds IP to whitelist
4. Tries to access from non-whitelisted IP → blocked
5. Adds current IP to whitelist
6. Can now access normally
7. Switches to "Blacklist Block" mode
8. Adds malicious IP to blacklist
9. Blocks that specific IP

### 5. Performance Tests
Test with large datasets:
- 1000 whitelist entries
- 1000 blacklist entries
- Measure `isIpAllowed` performance

## TDD Requirements
Write tests FIRST for all edge cases, then implement fixes.

Run ALL tests:
```bash
cd website && npx vitest run src/__tests__/ipAccess*.test.ts
```

## Security Checklist
- [ ] Input sanitization prevents XSS
- [ ] Input validation prevents injection
- [ ] Rate limiting consideration (document)
- [ ] Audit logging for changes
- [ ] Admin-only access to settings (verify)

## Output
Return summary of:
1. Edge cases identified and handled
2. Security measures implemented
3. Performance characteristics
4. Test coverage report
5. Recommendations for production deployment
