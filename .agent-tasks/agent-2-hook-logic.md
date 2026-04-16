# Agent 2: Hook & Business Logic for IP Access Control

## Goal
Create the `useIpAccessControl` hook with IP validation, filtering, and access checking logic.

## Context
The hook should manage IP whitelist/blacklist state similar to `useSystemPreferences` in `src/hooks/useSettings.ts`.

## Files to Create/Modify

### 1. Create: `src/hooks/useIpAccessControl.ts`
Implement hook with:
- `entries`: Array of IP entries
- `mode`: Current access mode ('allow_all' | 'whitelist_only' | 'blacklist_block')
- `addEntry(ipAddress, type, description)`: Add new IP entry with validation
- `removeEntry(id)`: Remove an entry
- `toggleEntryActive(id)`: Toggle isActive status
- `updateEntry(id, updates)`: Update description or type
- `setMode(mode)`: Change access mode
- `isIpAllowed(ipAddress)`: Check if an IP should be allowed based on current mode and entries
- `validateIp(ipAddress)`: Returns { valid: boolean, error?: string }
- `stats`: { totalEntries, whitelistCount, blacklistCount, activeCount }

### 2. IP Validation Logic
Implement `validateIpV4(ip: string): boolean`:
- Format: xxx.xxx.xxx.xxx where xxx is 0-255
- Reject private ranges if needed (configurable)
- Support CIDR notation (e.g., 192.168.1.0/24) - BONUS
- Clear error messages for: invalid format, out of range, duplicate

### 3. Access Control Logic
Implement `isIpAllowed(ip: string, mode, entries): boolean`:
- 'allow_all': Always true
- 'whitelist_only': True only if IP is in active whitelist
- 'blacklist_block': True unless IP is in active blacklist

## TDD Requirements
Write tests FIRST in `src/__tests__/useIpAccessControl.test.ts`:
1. Test hook initializes with default values
2. Test adding valid IP entry
3. Test rejecting invalid IP format
4. Test rejecting duplicate IPs
5. Test `isIpAllowed` with all three modes
6. Test stats calculation
7. Test toggling entry active state
8. Test removing entries

Run tests: `cd website && npx vitest run src/__tests__/useIpAccessControl.test.ts`

## Constraints
- Follow patterns from `useSystemPreferences` in `src/hooks/useSettings.ts`
- Use useState, useMemo, useCallback appropriately
- No external libraries for IP validation (regex only)
- Handle edge cases: empty IP, partial IP, out of range numbers
- Return clear error messages from validation

## Output
Return summary of:
1. Hook API (all functions and their signatures)
2. Validation rules implemented
3. Access control logic for each mode
4. Test coverage and results
5. Any edge cases handled
