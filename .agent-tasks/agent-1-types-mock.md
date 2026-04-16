# Agent 1: Types & Mock Data for IP Access Control

## Goal
Create TypeScript types and mock data structures for the IP Blacklist/Whitelist feature.

## Context
This is a TDental Dashboard (React + TypeScript). We need to add IP access control as part of system settings.

## Files to Create/Modify

### 1. Create: `src/types/ipAccessControl.ts`
Define these types:
- `IpEntryType`: 'whitelist' | 'blacklist'
- `IpEntry`: { id, ipAddress, type, description, isActive, createdAt, createdBy }
- `IpAccessMode`: 'allow_all' | 'whitelist_only' | 'blacklist_block' (how the system behaves)
- `IpAccessSettings`: { mode, entries[], lastUpdated }
- Validation helper types for IP format checking

### 2. Create: `src/data/mockIpAccessControl.ts`
Define mock data:
- `MOCK_IP_ENTRIES`: Array of 6-8 sample IP entries (mix of whitelist/blacklist)
- `DEFAULT_IP_ACCESS_SETTINGS`: Default settings object
- Include Vietnamese clinic context IPs (common local IPs like 192.168.1.x)

## TDD Requirements
Write tests FIRST in `src/__tests__/ipAccessControl.types.test.ts`:
1. Test that IP entry types are correctly defined
2. Test that mock data has required fields
3. Test IP validation regex patterns (IPv4 format)
4. Test that default settings load correctly

Run tests: `cd website && npx vitest run src/__tests__/ipAccessControl.types.test.ts`

## Constraints
- Match existing code style from `src/data/mockSettings.ts`
- Use readonly where appropriate
- Export all types
- IPv4 format validation only (no IPv6 needed for now)
- Keep mock data realistic for a dental clinic context

## Output
Return summary of:
1. Types created with their purposes
2. Mock data structure
3. Test results (all must pass)
4. Any edge cases handled in validation
