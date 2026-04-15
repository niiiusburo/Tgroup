---
status: awaiting_human_verify
trigger: "5 related bugs in employee create/edit form — role mapping, data loading, and API type mismatch"
created: 2026-04-11T00:00:00Z
updated: 2026-04-11T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - 3 distinct root causes across 2 files (backend + frontend)
test: All 5 bugs traced and reproduced
expecting: N/A - root causes found
next_action: Apply fixes to backend employees.js (3 issues) and frontend Employees/index.tsx (1 issue)

## Symptoms

expected: |
  1. Edit form loads employee's actual role
  2. Edit form populates start date
  3. Edit form populates main branch (companyid)
  4. PUT /api/Employees/:id saves successfully
  5. POST /api/Employees saves correct role flags

actual: |
  1. Editing "Test Le Tan" (role "Phu ta") shows "CSKH" instead
  2. Start date shows empty
  3. Main branch shows "Select location..."
  4. PUT returns 500: "operator does not exist: uuid = integer"
  5. Creating with "Bac si" saves as "Phu ta"

errors: PUT /api/Employees/:id returns 500 "operator does not exist: uuid = integer"
reproduction: Open any employee edit form, or create a new employee
started: After recent backend changes adding isdoctor/isassistant/isreceptionist columns

## Eliminated

## Evidence

- timestamp: 2026-04-11
  checked: Running server location
  found: Server runs from /Users/thuanle/Documents/TamTMV/Tgroup/api/ (NOT tdental-api)
  implication: Must fix api/src/routes/employees.js, not the tdental-api copy

- timestamp: 2026-04-11
  checked: PUT /api/Employees/:id with minimal body {"name":"BS. Uyên"}
  found: Returns 500 "operator does not exist: uuid = integer"
  implication: SQL parameterization is broken

- timestamp: 2026-04-11
  checked: PUT handler SQL generation (lines 316, 331, 338)
  found: Missing $ prefix on paramIdx — generates "name = 1" instead of "name = $1"
  implication: PostgreSQL interprets literal integers instead of parameter placeholders

- timestamp: 2026-04-11
  checked: POST handler (lines 205-282)
  found: Does NOT destructure or INSERT isdoctor/isassistant/isreceptionist/startworkdate/password
  implication: Role flags and other new fields are silently dropped on create

- timestamp: 2026-04-11
  checked: useEmployees hook mapApiEmployeeToEmployee
  found: Maps companyid->locationId, startworkdate->hireDate, flags->roles array
  implication: EmployeeForm receives Employee type (locationId/hireDate/roles) not raw API fields

- timestamp: 2026-04-11
  checked: Employees page handleEditEmployee
  found: Passes selectedEmployee (Employee type) to EmployeeForm which expects isdoctor/isassistant/isreceptionist/companyid/startworkdate
  implication: Form receives undefined for all DB-specific fields

## Resolution

root_cause: |
  3 distinct root causes covering all 5 bugs:
  
  RC1 (Bug #4 - PUT 500): Missing $ prefix on SQL parameter placeholders in PUT handler.
    File: api/src/routes/employees.js lines 316, 331, 338
    Code generates `name = 1` instead of `name = $1`, so PostgreSQL compares uuid column to literal integer 3.
  
  RC2 (Bugs #1, #5 - role mismatch): POST handler doesn't include isdoctor/isassistant/isreceptionist/startworkdate/password fields.
    File: api/src/routes/employees.js POST handler (lines 205-282)
    These fields are in req.body but never destructured or inserted into the partners table.
    PUT handler also missing these fields from its destructuring (line 292-299) and fields object (line 306-312).
  
  RC3 (Bugs #1, #2, #3 - edit form data not loading): Frontend passes Employee domain type to EmployeeForm instead of raw API fields.
    File: website/src/pages/Employees/index.tsx line 54-55
    useEmployees maps API data to Employee type (locationId, hireDate, roles[]) but EmployeeForm expects raw DB fields (companyid, startworkdate, isdoctor/isassistant/isreceptionist booleans).
    Result: inferRoleFromFlags(undefined, undefined, undefined) returns 'customer-service', startworkdate is undefined, companyid is undefined.

fix: |
  FIX 1 (api/src/routes/employees.js PUT handler):
    - Line 316: Change `${key} = ${paramIdx}` to `${key} = $${paramIdx}`
    - Line 331: Change `lastupdated = ${paramIdx}` to `lastupdated = $${paramIdx}`
    - Line 338: Change `WHERE id = ${paramIdx}` to `WHERE id = $${paramIdx}`
    - Add isdoctor, isassistant, isreceptionist, startworkdate, password to destructuring and fields object
  
  FIX 2 (api/src/routes/employees.js POST handler):
    - Add isdoctor, isassistant, isreceptionist, startworkdate, password to destructuring
    - Add these columns to the INSERT statement and values array
    - Hash password with bcrypt before inserting
  
  FIX 3 (website/src/pages/Employees/index.tsx):
    - In handleEditEmployee, fetch full employee data from API (GET /api/Employees/:id)
      OR map the Employee domain object back to the shape EmployeeForm expects:
      { ...selectedEmployee, companyid: selectedEmployee.locationId, startworkdate: selectedEmployee.hireDate,
        isdoctor/isassistant/isreceptionist derived from selectedEmployee.roles }

verification:
files_changed:
  - api/src/routes/employees.js
  - website/src/pages/Employees/index.tsx
