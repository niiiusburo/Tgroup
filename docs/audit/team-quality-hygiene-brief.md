# AUDIT TEAM: Quality & Hygiene (Team F)

## CONTEXT
Tgroup dental clinic dashboard. Audit code quality, dead code, mock data cleanup, and project hygiene.

## SCOPE: ENTIRE CODEBASE (website/ + api/)

## WHAT TO CHECK

### MOCK DATA CLEANUP (Primary Task)
List all files in website/src/data/ (17 mock files):
- mockAppointments.ts, mockCalendar.ts, mockCustomerForm.ts, mockCustomerProfile.ts
- mockCustomers.ts, mockDashboard.ts, mockEmployees.ts, mockIpAccessControl.ts
- mockLocations.ts, mockMonthlyPlans.ts, mockPayment.ts, mockPermissionGroups.ts
- mockPermissions.ts, mockServices.ts, mockSettings.ts, mockWebsite.ts
- serviceCatalog.ts (not a mock but check)

For EACH mock file:
1. Is it still imported anywhere? By whom?
2. Is it used for DATA or just for TYPES?
3. If only types — can types be extracted and mock data deleted?
4. If data is still used — what component/hook needs migration?
5. Can the file be deleted entirely?

Delete mock files that are:
- No longer imported at all
- Only used for types where types can be moved to /types/

### DEAD CODE
1. **Customers.tsx.fixed** — backup file, should be deleted?
2. **._ prefix files** in api/src/routes/ — macOS artifacts, delete?
3. **AddressAutocompleteTest.tsx** — test component left in production?
4. Any unused imports, variables, functions
5. Any commented-out code blocks still in source

### NAMING/ORGANIZATION
1. **PascalCase route endpoints** (/Partners, /Employees) vs snake_case backend
2. **Duplicate concepts**: useEmployees vs useEmployeesData — why two hooks?
3. **SystemPreferences.tsx vs SystemPreferencesContent.tsx** — naming confusion?
4. **Pages vs Components**: Should Calendar be in pages or pages/Calendar/?
5. Inconsistent file naming patterns (index.ts vs named file)

### TYPES
1. **use-places-autocomplete.d.ts** — why in types folder instead of alongside import?
2. Missing type definitions
3. Any // @ts-ignore or // @ts-expect-error?

### GIT/PROJECT
1. **._ files** — macOS resource forks in the repo
2. **Customers.tsx.fixed** — not in git, stray file
3. **package.json consistency**: website and api use same Node version?

## OUTPUT FORMAT
Action-oriented report:
P0: Files to delete immediately
P1: Mock data that must be migrated to API first
P2: Naming/organization improvements
P3: Minor clean up items
For each: exact file path and what to do.
