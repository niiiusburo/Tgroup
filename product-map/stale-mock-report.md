# TGroup Stale Mock Data Report

> Analysis of `website/src/data/*.ts` mock files — which are still imported and which appear dead.

## Summary

| File | Import Count | Status | Risk Level |
|------|-------------|--------|------------|
| `mockAppointments.ts` | 4 | **Active** | Medium |
| `mockCalendar.ts` | 11 | **Active** | High |
| `mockCustomerForm.ts` | 6 | **Active** | Medium |
| `mockCustomerProfile.ts` | 0 | **Dead** | Low |
| `mockCustomers.ts` | 3 | **Active** | Medium |
| `mockDashboard.ts` | 1 | **Active** | Low |
| `mockEmployees.ts` | 8 | **Active** | High |
| `mockIpAccessControl.ts` | 0 | **Dead** | Low |
| `mockLocations.ts` | 3 | **Active** | Medium |
| `mockMonthlyPlans.ts` | 1 | **Active** | Low |
| `mockPayment.ts` | 3 | **Active** | Medium |
| `mockPermissionGroups.ts` | 2 | **Active** | Low |
| `mockPermissions.ts` | 0 | **Dead** | Low |
| `mockServices.ts` | 6 | **Active** | Medium |
| `mockSettings.ts` | 0 | **Dead** | Low |
| `mockWebsite.ts` | 4 | **Active** | Low |
| `serviceCatalog.ts` | 0 | **Dead** | Low |

**Total files:** 18  
**Active imports:** 13  
**Dead (0 imports):** 5

---

## Active Mock Files

### `mockAppointments.ts`
**Imported by:**
- `components/appointments/CheckInFlow.tsx`
- `hooks/useAppointments.ts`
- `pages/Appointments/index.tsx`
- `pages/Appointments/index.tsx` (possibly duplicate import path)

**Assessment:** Used as fallback data when API fails or during initial development. `hooks/useAppointments.ts` may still reference it.

**Recommendation:** Verify if `useAppointments.ts` still falls back to mocks when the API returns empty. If so, this can mask real data issues in production.

---

### `mockCalendar.ts`
**Imported by:**
- `components/calendar/AppointmentCard.tsx`
- `components/calendar/AppointmentDetailsModal.tsx`
- `components/calendar/DayView.tsx`
- `components/calendar/MonthView.tsx`
- `components/calendar/TimeSlot.tsx`
- `components/calendar/WeekView.tsx`
- `components/modules/TodaySchedule.tsx`
- `hooks/useAppointments.ts`
- `hooks/useCalendarData.ts`
- `hooks/useDragReschedule.ts`
- `hooks/useTodaySchedule.ts`
- `pages/Appointments/index.tsx`
- `pages/Calendar.tsx`

**Assessment:** This is the **most widely imported mock file**. It likely provides calendar event shapes or fallback data.

**Recommendation:** High priority to audit. If calendar components still use mock data as fallback, users may see fake appointments when the API is slow or failing.

---

### `mockCustomerForm.ts`
**Imported by:**
- `components/forms/AddCustomerForm/AddCustomerForm.tsx`
- `components/forms/AddCustomerForm/BasicInfoTab.tsx`
- `components/forms/AddCustomerForm/useAddCustomerForm.ts`
- `components/shared/CustomerSourceDropdown.tsx`
- `components/shared/ReferralCodeInput.tsx`
- `hooks/useCustomers.ts`
- `pages/Customers.tsx`

**Assessment:** Used for customer form defaults or dropdown mock options.

**Recommendation:** Check if `useAddCustomerForm.ts` initializes state from mocks. If so, replace with empty defaults to avoid prefilling production forms with fake data.

---

### `mockCustomers.ts`
**Imported by:**
- `hooks/useCustomers.ts`
- `pages/Customers.tsx`
- `pages/Customers/CustomerColumns.tsx`

**Assessment:** Likely used as fallback customer list or for column shape definitions.

**Recommendation:** Verify `useCustomers.ts` fallback logic.

---

### `mockDashboard.ts`
**Imported by:**
- `components/shared/QuickActionsBar.tsx`

**Assessment:** Likely provides quick action definitions (which are static config, not truly "mock data").

**Recommendation:** Low risk; this may be legitimate static config that happens to live in the `data/` folder.

---

### `mockEmployees.ts`
**Imported by:**
- `components/customer/CustomerAssignments.tsx`
- `components/employees/EmployeeCard.tsx`
- `components/employees/EmployeeForm.tsx`
- `components/employees/EmployeeProfile.tsx`
- `components/employees/EmployeeTable.tsx`
- `components/employees/LinkedEmployees.tsx`
- `components/employees/RoleMultiSelect.tsx`
- `components/shared/DoctorSelector.tsx`
- `hooks/useEmployees.ts`

**Assessment:** Widely used across employee-related components. High risk of fake employee data appearing in UI.

**Recommendation:** Audit each component to see if mocks are used as props fallback or initial state.

---

### `mockLocations.ts`
**Imported by:**
- `components/locations/LocationCard.tsx`
- `components/locations/LocationDetail.tsx`
- `hooks/useLocations.ts`
- `pages/Locations.tsx`

**Assessment:** Used as fallback or for location shape definitions.

**Recommendation:** Check `useLocations.ts` fallback logic.

---

### `mockMonthlyPlans.ts`
**Imported by:**
- `pages/Payment.tsx`

**Assessment:** Single consumer. Likely fallback for monthly plan data.

**Recommendation:** Verify if still needed.

---

### `mockPayment.ts`
**Imported by:**
- `components/payment/PaymentHistory.test.tsx`
- `components/payment/PaymentHistory.tsx`
- `hooks/usePayment.ts`

**Assessment:** Used in production component (`PaymentHistory.tsx`) and tests. Risk of fake payments appearing in UI.

**Recommendation:** High priority to remove from `PaymentHistory.tsx` if used as fallback.

---

### `mockPermissionGroups.ts`
**Imported by:**
- `hooks/usePermissionGroups.ts`
- `hooks/useSettings.ts`

**Assessment:** Likely fallback for permission group dropdowns.

**Recommendation:** Check fallback logic in both hooks.

---

### `mockServices.ts`
**Imported by:**
- `components/services/MultiVisitTracker.tsx`
- `components/services/ServiceForm.tsx`
- `components/services/ServiceHistoryList.tsx`
- `components/shared/ServiceCatalogSelector.tsx`
- `hooks/useServices.ts`
- `pages/Services/index.tsx`

**Assessment:** Used across service record UI.

**Recommendation:** Audit for fallback usage.

---

### `mockWebsite.ts`
**Imported by:**
- `components/website/PageEditor.tsx`
- `components/website/PageList.tsx`
- `components/website/SEOManager.tsx`
- `components/website/ServiceCatalogManager.tsx`

**Assessment:** Used for CMS page shapes or fallbacks.

**Recommendation:** Low traffic page; verify but not urgent.

---

## Dead Mock Files (0 Imports)

| File | Recommendation |
|------|----------------|
| `mockCustomerProfile.ts` | **Delete** or move to `__mocks__` if needed for future tests. |
| `mockIpAccessControl.ts` | **Delete**. IP access control is implemented via `useIpAccessControl.ts` and real API. |
| `mockPermissions.ts` | **Delete**. Permission strings are now sourced from backend or constants. |
| `mockSettings.ts` | **Delete**. Settings are fetched from `/api/SystemPreferences`. |
| `serviceCatalog.ts` | **Delete**. Product catalog is fetched from `/api/Products`. |

---

## Overall Risk Assessment

**High Risk:** `mockCalendar.ts`, `mockEmployees.ts`, `mockPayment.ts`  
These are imported by many production components. If any component falls back to mock data when the API fails or while loading, users will see fake appointments, employees, or payments.

**Medium Risk:** `mockAppointments.ts`, `mockCustomerForm.ts`, `mockCustomers.ts`, `mockLocations.ts`, `mockServices.ts`  
Moderate import count; could mask empty API responses.

**Low Risk:** `mockDashboard.ts`, `mockMonthlyPlans.ts`, `mockPermissionGroups.ts`, `mockWebsite.ts`  
Limited scope or likely used as static config rather than data fallback.

---

## Recommended Action Plan

1. **Immediate cleanup:** Delete the 5 dead mock files.
2. **Audit active mocks:** For each active mock file, grep for `|| mockData` or `?? mockData` patterns in consuming files.
3. **Refactor fallbacks:** Replace mock fallbacks in production components with:
   - Empty arrays `[]` for lists
   - Skeleton loaders for missing data
   - Error messages for failed loads
4. **Move test-only mocks:** If any mock file is only needed for tests, move it to `website/src/__mocks__/` or colocate it with the test file.
