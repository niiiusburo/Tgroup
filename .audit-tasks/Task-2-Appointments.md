# Task 2: Audit Appointment Components for Date/Time Issues

## Scope
Audit all appointment-related components:
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/appointments/AppointmentForm.tsx` (check date picker handling)
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/customer/AppointmentHistory.tsx` (if exists)
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/hooks/useAppointments.ts`
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/hooks/useCalendarData.ts`

## Check For
1. Date picker value handling - ensure YYYY-MM-DD format consistency
2. Time picker value handling - ensure HH:mm format consistency
3. API date field mapping - check `date` vs `datetimeappointment` usage
4. Date display in lists - ensure proper formatting
5. Form submission dates - ensure correct format sent to API

## Specific Issues to Find
- Date picker receiving wrong format
- Time strings not padded (e.g., "9:5" instead of "09:05")
- datetimeappointment parsing errors
- Date timezone shifts when saving/displaying

## Output
Create `/Users/thuanle/Documents/TamTMV/Tgroup/.audit-tasks/Report-2-Appointments.md` with:
1. List of issues found per file
2. Code snippets showing problems
3. Suggested fixes
4. Priority (High/Medium/Low)
