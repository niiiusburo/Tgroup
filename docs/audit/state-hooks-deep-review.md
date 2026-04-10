# TEAM 1: State & Hooks Audit — Deep Review

## SCOPE
- All hooks in website/src/hooks/
- All contexts in website/src/contexts/
- Data fetching patterns (lib/api.ts usage)
- Mock data usage vs real API integration

## FINDINGS INSTRUCTIONS
For each hook/context file, check:
1. Does it import mock DATA (not just types)? If yes → flag as migration needed
2. Does it call API endpoints? If no (and not a utility hook) → flag as gap
3. Are there error handling patterns? catch blocks, loading states, empty states?
4. Are there any race conditions or missing dependencies in useEffect/useMemo?
5. Does return type match what the component actually needs?
6. Any hardcoded values that should be constants or env vars?

## PRIORITIES TO LOOK FOR
- P0: Hooks using mock data as primary data source
- P0: Missing error loading states
- P1: Inconsistent API integration patterns
- P2: Optimization issues (missing useMemo/useMemo)
