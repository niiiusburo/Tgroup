# IP Access Control Feature - 5-Agent Parallel Orchestration

## Feature Overview
Add IP Blacklist/Whitelist functionality to TDental Dashboard System Settings. This security feature allows clinic administrators to:
- Create whitelist of allowed IPs
- Create blacklist of blocked IPs
- Choose access mode: Allow All, Whitelist Only, or Blacklist Block
- Validate IP addresses in real-time
- Block unauthorized access attempts

## Agent Assignments

### Agent 1: Types & Mock Data Engineer
**Scope:** `src/types/ipAccessControl.ts`, `src/data/mockIpAccessControl.ts`, tests
**Dependencies:** None (starts first)
**Deliverable:** Type definitions and realistic mock data

### Agent 2: Hook & Business Logic Engineer
**Scope:** `src/hooks/useIpAccessControl.ts`, validation logic, tests
**Dependencies:** Agent 1 (needs types)
**Deliverable:** Complete hook with add/remove/toggle/isIpAllowed functions

### Agent 3: UI Component Engineer
**Scope:** `src/components/settings/IpAccessControl.tsx`, tests
**Dependencies:** Agent 2 (needs hook)
**Deliverable:** Full CRUD UI component with forms, tables, and stats

### Agent 4: Integration & Middleware Engineer
**Scope:** `src/pages/Settings/index.tsx`, `src/lib/ipAccessMiddleware.ts`, `src/hooks/useClientIp.ts`, tests
**Dependencies:** Agent 3 (needs UI component)
**Deliverable:** IP blocking integrated into auth flow and settings page

### Agent 5: Edge Cases & E2E Test Engineer
**Scope:** `src/lib/ipValidation.ts`, comprehensive tests
**Dependencies:** Agents 1-4 (reviews all code)
**Deliverable:** Security hardening, edge case handling, performance tests

## File Structure to Create
```
src/
├── types/
│   └── ipAccessControl.ts          # Agent 1
├── data/
│   └── mockIpAccessControl.ts      # Agent 1
├── hooks/
│   ├── useIpAccessControl.ts       # Agent 2
│   └── useClientIp.ts              # Agent 4
├── lib/
│   ├── ipAccessMiddleware.ts       # Agent 4
│   └── ipValidation.ts             # Agent 5
├── components/settings/
│   └── IpAccessControl.tsx         # Agent 3
├── pages/Settings/
│   └── index.tsx (modified)        # Agent 4
└── __tests__/
    ├── ipAccessControl.types.test.ts    # Agent 1
    ├── useIpAccessControl.test.ts       # Agent 2
    ├── IpAccessControl.component.test.tsx # Agent 3
    ├── ipAccess.integration.test.ts     # Agent 4
    ├── ipValidation.edgecases.test.ts   # Agent 5
    └── ipAccess.e2e.test.tsx            # Agent 5
```

## Communication Protocol
1. Each agent reads relevant context from existing codebase first
2. Agents write tests BEFORE implementation (TDD)
3. Agents run tests to verify their work
4. Agents document any assumptions or deviations

## Test Command
```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup-ip-access-control/website
npx vitest run src/__tests__/ipAccess*.test.ts
```

## Success Criteria
- All 5 agents complete their tasks
- All tests pass (TDD verified)
- Component integrates cleanly into Settings page
- No regressions in existing code
- Security best practices followed
