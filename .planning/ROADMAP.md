# Roadmap — TG Clinic v1.1 Bugfixes & Features

## Phase 1: Bug Fixes Wave 1
**Goal:** Fix broken save buttons, branch filtering, and appointment scroll behavior.

**Requirements:** #1 Save buttons broken, #2 Branch filtering broken, #3 Appointment completion no-scroll

**Success Criteria:**
1. `ServiceForm` and `PaymentForm` `handleSubmit` are async and await API completion
2. Calendar/TodaySchedule respects location filter when branch is selected
3. Appointment completion scrolls smoothly to the completed section
4. All relevant E2E tests pass with Playwright screenshots

**UI hint:** no

---

## Phase 2: Quick Features & Validations
**Goal:** Add missing fields and validations that don't require schema redesign.

**Requirements:** #4 Customer code visibility, #5 Duplicate phone check, #7 Assistant Doctor role, #8 3 quick search boxes, #9 Countdown timer integration, #10 Quick-add customer, #13 Deposit date field, #14 Payment date field

**Success Criteria:**
1. Customer code visible in `CustomerProfile` read-only view
2. `Partners` POST rejects duplicate phone with 409 Conflict
3. `ServiceForm` has third staff selector (Doctor, Assistant, Dental Aide)
4. Appointments page has 3 quick search boxes (patient, doctor, service)
5. `WaitTimer` shows in Overview `PatientCheckIn`
6. Deposit and Payment forms include date picker defaulting to today
7. Playwright tests cover each new field

**UI hint:** yes

**Plans:** 3 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Backend duplicate-phone validation + customer code visibility
- [x] 02-02-PLAN.md — ServiceForm Dental Aide selector + Deposit & Payment date pickers
- [x] 02-03-PLAN.md — Calendar 3 search boxes, WaitTimer integration, E2E tests, version bump

---

## Phase 3: Architecture Shifts
**Goal:** Implement multi-branch staff, admin delete, and voucher-linked payments.

**Requirements:** #6 Admin delete customers, #12 Multi-branch assignment, #15 Payment linked to examination vouchers

**Success Criteria:**
1. `employee_location_scope` junction table is active with API CRUD
2. `EmployeeForm` supports checkbox-style multi-branch assignment
3. Admin can soft-delete customers with FK-safe confirmation
4. `PaymentForm` lists open examination vouchers with residual amounts
5. Multiple payments can be recorded against a single voucher
6. Full E2E suite passes, CHANGELOG.json updated, version bumped

**UI hint:** yes

**Plans:** 4/4 plans complete

Plans:
- [x] 03-01-PLAN.md — DB migration for employee_location_scope + backend employee scope API
- [x] 03-02-PLAN.md — Frontend employee multi-branch UI (EmployeeForm + EmployeeTable + EmployeeProfile)
- [x] 03-03-PLAN.md — Backend customer delete endpoints (soft + hard) + frontend delete UI
- [x] 03-04-PLAN.md — Payment allocation expansion to dotkhams + frontend PaymentForm tabs + E2E tests + version bump

---

## Phase 4: Polish & Walk-in Redesign
**Goal:** Walk-in form redesign plus final verification.

**Requirements:** #11 Walk-in patient form redesign

**Success Criteria:**
1. `WalkInForm` layout follows the independent card scrolling pattern
2. Quick-add customer flow is verified end-to-end
3. Full regression Playwright suite passes
4. CHANGELOG.json updated, version bumped

**UI hint:** yes
