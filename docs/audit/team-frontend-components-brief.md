# AUDIT TEAM: Frontend Components (Team A)

## CONTEXT
Tgroup is a multi-location dental clinic dashboard. 177 frontend files (TypeScript/React/Tailwind).
You are auditing ALL component files under website/src/components/

## FILES TO AUDIT
Components split by domain:
- shared/: DataTable, SearchBar, StatusBadge, CustomerSelector, DoctorSelector, LocationSelector, FilterByLocation, FilterByDoctor, CustomerSourceDropdown, ServiceCatalogSelector, NotificationsPanel, QuickActionsBar, QuickAddAppointmentButton, ReferralCodeInput, ImageUpload, AddressAutocomplete, VersionDisplay
- modules/: StatCardModule, RevenueChartModule, TodaySchedule, TodayAppointments, TodayServicesTable, EditAppointmentModal, PatientCheckIn
- calendar/: DayView, WeekView, MonthView, TimeSlot, AppointmentCard, AppointmentDetailsModal
- appointments/: AppointmentForm, CheckInFlow, ConvertToService, WaitTimer
- customer/: CustomerProfile, AppointmentHistory, ServiceHistory, DepositCard, PhotoGallery
- employees/: EmployeeTable, EmployeeCard, EmployeeForm, EmployeeProfile, LinkedEmployees, TierSelector, RoleMultiSelect, ScheduleCalendar, ReferralCodeDisplay
- locations/: LocationCard, LocationDashboard, LocationDetail
- payment/: PaymentForm, PaymentHistory, DepositWallet, DepositHistory, OutstandingBalance
- payment/MonthlyPlan/: MonthlyPlanCreator, PaymentSchedule, InstallmentTracker
- services/: ServiceForm, ServiceHistoryList, MultiVisitTracker
- settings/: SystemPreferences, SystemPreferencesContent, RoleConfig, PermissionGroupConfig, CustomerSourcesConfig, ServiceCatalogSettings, IpAccessControl, TimezoneSelector
- relationships/: PermissionMatrix, EntityRelationshipMap
- website/: PageList, PageEditor, SEOManager, ServiceCatalogManager
- forms/AddCustomerForm/: AddCustomerForm
- ui/: DatePicker, TimePicker
- debug/: PermissionDebugger

## WHAT TO CHECK (Deep Review)
1. **API Integration**: Does it use real API hooks or still reference mock data?
2. **Missing types**: Any implicit any, missing props interfaces, unchecked data access?
3. **Error boundaries**: Any unhandled potential errors (null access, undefined props)?
4. **Props consistency**: Same concept = same prop name across components?
5. **Tailwind consistency**: Same patterns for cards, badges, buttons, tables?
6. **Accessibility**: Missing labels, aria attributes, keyboard nav?
7. **Logic bugs**: Incorrect conditionals, off-by-one, state sync issues?
8. **Unnecessary re-renders**: Missing React.memo, useMemo where expensive?
9. **Hardcoded values**: Magic strings, numbers that should be constants?
10. **Index files**: Do barrel exports actually export everything?

## OUTPUT FORMAT
Per-team report with P0/P1/P2/P3 findings. Each finding:
- File path
- Issue description
- Why it matters
- Severity (P0–P3)
