# Unified Timezone System - 3 Agent Orchestration

## Problem
- Calendar shows April 9th
- Overview shows April 8th
- No consistent timezone handling across the app
- Need a global timezone setting (default: Asia/Ho_Chi_Minh)

## Goal
1. Create a global TimezoneContext that provides unified date/time functions
2. Add timezone selector in Settings
3. Update all components to use the global timezone
4. Ensure Calendar, Overview, and all date displays are consistent

## Agent Assignments

### Agent 1: Core Timezone Infrastructure
**Scope:** Create TimezoneContext, date utilities, and tests
**Files:**
- `src/contexts/TimezoneContext.tsx` (new)
- `src/lib/dateUtils.ts` (enhance)
- `src/__tests__/timezone.core.test.ts`

**Requirements:**
- TimezoneContext with selected timezone state
- Persist timezone to localStorage
- Date formatting utilities that respect selected timezone
- TDD: Write tests first

### Agent 2: Settings Page Timezone Selector
**Scope:** Add timezone selector to Settings page
**Files:**
- `src/pages/Settings/index.tsx` (modify)
- `src/components/settings/TimezoneSelector.tsx` (new)
- `src/__tests__/timezone.settings.test.tsx`

**Requirements:**
- Dropdown with common timezones (Vietnam, UTC, US East/West, etc.)
- Display current timezone
- Update TimezoneContext on change
- TDD: Write tests first

### Agent 3: Calendar & Overview Integration
**Scope:** Update Calendar and Overview to use global timezone
**Files:**
- `src/hooks/useCalendarData.ts` (modify)
- `src/hooks/useOverviewAppointments.ts` (modify)
- `src/pages/Calendar.tsx` (modify if needed)
- `src/pages/Overview.tsx` (modify if needed)
- `src/__tests__/timezone.integration.test.ts`

**Requirements:**
- Calendar uses global timezone for date navigation
- Overview uses global timezone for "today" appointments
- Both show consistent dates
- TDD: Write tests first

## Timezone List for Selector
- Asia/Ho_Chi_Minh (Vietnam) - DEFAULT
- UTC
- America/New_York (US East)
- America/Los_Angeles (US West)
- Europe/London
- Asia/Tokyo
- Asia/Singapore
- Australia/Sydney

## Test Requirements
All agents must:
1. Write failing tests first (RED)
2. Implement code to pass (GREEN)
3. Refactor if needed
4. All tests must pass before completion

## Communication
- Agent 1 creates the core infrastructure first
- Agents 2 and 3 depend on Agent 1's TimezoneContext
- All agents must export their types/interfaces

## Definition of Done
- [ ] TimezoneContext provides unified date functions
- [ ] Settings page has timezone selector
- [ ] Calendar shows correct date based on timezone
- [ ] Overview shows correct "today" based on timezone
- [ ] Both Calendar and Overview show the SAME date
- [ ] All 3 agent test suites pass (30+ tests total)
