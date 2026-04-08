# Task 1: Audit Calendar Views for Date/Time Issues

## Scope
Audit all calendar view components for proper date/time formatting:
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/calendar/DayView.tsx`
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/calendar/WeekView.tsx`
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/calendar/MonthView.tsx`

## Check For
1. Date formatting - should show readable dates (e.g., "15 Mar 2024" not "2024-03-15T00:00:00")
2. Time formatting - should show HH:mm format consistently
3. Timezone handling - dates should not shift due to timezone issues
4. Invalid date handling - should show "-" or placeholder instead of "Invalid Date"
5. ISO date string parsing - should handle "2024-03-15T00:00:00" correctly

## Specific Issues to Find
- Direct `new Date(dateStr)` without handling ISO strings
- Missing null/undefined checks for date fields
- Inconsistent date formats across views
- Time extraction from datetime strings that could fail

## Output
Create `/Users/thuanle/Documents/TamTMV/Tgroup/.audit-tasks/Report-1-CalendarViews.md` with:
1. List of issues found per file
2. Code snippets showing problems
3. Suggested fixes
4. Priority (High/Medium/Low)
