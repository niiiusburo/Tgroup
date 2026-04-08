# Task 3: Audit Payment & Customer Components for Date/Time Issues

## Scope
Audit payment, deposit, and customer components:
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/payment/DepositHistory.tsx`
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/customer/CustomerProfile.tsx` (appointment card dates already fixed, verify others)
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/pages/Customers.tsx`
- `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/components/employees/EmployeeForm.tsx`

## Check For
1. Transaction date formatting in deposit history
2. Member since / join date formatting
3. Date of birth display (should not shift due to timezone)
4. Last visit date formatting
5. Employee start work date formatting

## Specific Issues to Find
- DOB showing wrong day (timezone shift)
- Transaction dates in wrong format
- Missing date formatting (raw ISO strings showing)
- "Invalid Date" appearing in UI

## Output
Create `/Users/thuanle/Documents/TamTMV/Tgroup/.audit-tasks/Report-3-PaymentsCustomers.md` with:
1. List of issues found per file
2. Code snippets showing problems
3. Suggested fixes
4. Priority (High/Medium/Low)
