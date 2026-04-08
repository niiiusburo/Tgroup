# Agent 1: Core Timezone Infrastructure

## Goal
Create TimezoneContext and date utilities with TDD.

## TDD Process
1. Write tests in `src/__tests__/timezone.core.test.ts` - watch them fail
2. Implement `TimezoneContext.tsx` and enhance `dateUtils.ts`
3. Watch tests pass

## Files to Create/Modify

### 1. Test First: `src/__tests__/timezone.core.test.ts`
Write comprehensive tests for:
- TimezoneContext provides default timezone (Asia/Ho_Chi_Minh)
- TimezoneContext can change timezone
- Timezone persists to localStorage
- Date formatting respects selected timezone
- getToday() returns correct date for timezone
- formatDate() formats correctly for timezone

### 2. Implement: `src/contexts/TimezoneContext.tsx`
```typescript
interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => void;
  getToday: () => string; // YYYY-MM-DD in selected timezone
  getNow: () => Date; // Current moment in selected timezone
  formatDate: (date: Date | string, format?: string) => string;
  formatDateTime: (date: Date | string, format?: string) => string;
}
```

### 3. Implement: `src/lib/dateUtils.ts`
Add functions:
- `getTodayInTimezone(timezone: string): string`
- `formatInTimezone(date: Date, timezone: string, format: string): string`
- `convertDateToTimezone(date: Date | string, timezone: string): Date`
- `TIMEZONES` array with common timezones

## Run Tests
```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website
npx vitest run src/__tests__/timezone.core.test.ts
```

## Output
Return summary of:
- Test coverage
- Files created
- TimezoneContext API
- Any edge cases handled
