# AUDIT TEAM: State & Hooks (Team B)

## CONTEXT
Tgroup dental clinic dashboard. Audit all hooks and contexts for API integration completeness, mock data removal, and logic correctness.

## FILES TO AUDIT
**Hooks (all in website/src/hooks/):**
useAppointments, useCalendarData, useClientIp, useCustomerProfile, useCustomers, useDashboardStats, useDeposits, useDragReschedule, useEmployees, useEmployeesData, useFormValidation, useIpAccessControl, useLocations, useMonthlyPlans, useOverviewAppointments, useOverviewData, usePayment, usePermissionBoard, usePermissionGroups, usePermissions, useProducts, useRelationshipsData, useServices, useSettings, useTodaySchedule, useVersionCheck, useWebsiteData

**Contexts (website/src/contexts/):**
AuthContext, LocationContext, TimezoneContext, AppointmentHoverContext

**API layer:**
website/src/lib/api.ts (check all endpoints match backend routes)

**Known mock data sources in hooks (P0):**
- useEmployeesData.ts → imports MOCK_EMPLOYEES (no API call)
- useMonthlyPlans.ts → imports MOCK_MONTHLY_PLANS (no API call)
- useWebsiteData.ts → imports MOCK_PAGES, MOCK_SERVICES (no API call)
- useSettings.ts → imports ROLES, PERMISSIONS from mockPermissions (has API for products but not settings/permissions data)
- usePermissions.ts → imports ROLES, PERMISSIONS from mockPermissions (no API call)
- useRelationshipsData.ts → imports ROLES, PERMISSIONS, ENTITY_NODES, ENTITY_RELATIONS from mockPermissions (no API call)
- usePermissionGroups.ts → imports MOCK_LOCATION_BRANCHES from mockLocations (no API call)
- useIpAccessControl.ts → imports DEFAULT_IP_ACCESS_SETTINGS from mockIpAccessControl (no API call)

**Hooks that import BOTH mock types AND API:**
- useCustomers.ts → API + mock type imports (CustomerStatus, CustomerFormData)
- useAppointments.ts → imports from mockCalendar types
- useTodaySchedule.ts → imports from mockCalendar types + API
- useCalendarData.ts → imports from mockCalendar types + API
- useDragReschedule.ts → imports from mockCalendar types (no API)
- useOverviewData.ts → API + may use mock data

## WHAT TO CHECK
1. Every hook: does it call real API? If not, flag as P0 migration needed
2. Mock data only used for TYPES (no data usage)? Can types be moved out?
3. Loading/error/empty states handled in every data-fetching hook?
4. Pagination handled? Offset/limit consistent across all API-calling hooks?
5. Any useEffect missing cleanup? Missing dependency arrays?
6. AuthContext: token storage, expiration, refresh logic complete?
7. LocationContext: URL sync, persistence, default selection?
8. TimezoneContext: default timezone, persistence, propagation?
9. API field mapping: snake_case vs camelCase consistency between lib/api.ts and backend?
10. Missing API hooks: any hook that should exist but doesn't?

## OUTPUT FORMAT
Per-team report. For each hook/context: audit result, issues found, severity.
