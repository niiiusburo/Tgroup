# AUDIT TEAM: Pages & Routing (Team D)

## CONTEXT
Tgroup dental clinic dashboard. Audit all pages, routing structure, layout, and navigation.

## FILES TO AUDIT
**Pages:**
website/src/pages/Overview.tsx
website/src/pages/Calendar.tsx
website/src/pages/Customers.tsx
website/src/pages/Customers.tsx.fixed (⚠️ suspicious file)
website/src/pages/Appointments/index.tsx
website/src/pages/Employees/index.tsx
website/src/pages/Locations.tsx
website/src/pages/Login.tsx
website/src/pages/Notifications.tsx
website/src/pages/Payment.tsx
website/src/pages/PermissionBoard.tsx
website/src/pages/Relationships.tsx
website/src/pages/Reports.tsx
website/src/pages/Commission.tsx
website/src/pages/ServiceCatalog.tsx
website/src/pages/Services/index.tsx
website/src/pages/Settings/index.tsx
website/src/pages/Website.tsx
website/src/pages/index.ts

**App & Layout:**
website/src/App.tsx (routes with permission checks)
website/src/components/Layout.tsx (sidebar navigation, header)

## WHAT TO CHECK
1. **Route protection gaps**: 
   - ServiceCatalog (/website) — NOT protected by ProtectedRoute
   - Relationships (/relationships) — NOT protected
   Are these intentional security gaps?

2. **Navigation vs Routes**: NAVIGATION_ITEMS in constants/index.ts lists specific routes.
   Do all pages have nav entries? Are there orphan routes?
   
3. **Customers.tsx.fixed**: What is this file? Is it a backup? Should it be deleted?

4. **Layout consistency**: Same header/sidebar across all pages?

5. **Page patterns**: Do all pages follow same structure?
   - Loading states
   - Error states
   - Empty states
   - Breadcrumbs/page titles

6. **Missing pages**: Feature tracker says all 20 features done. Are there pages missing?

7. **Route naming**: Any inconsistency between ROUTES constants and actual paths?

8. **Page-level hooks**: Are hooks called correctly? Any duplicate hook calls?

9. **AuthContext**: ProtectedRoute uses hasPermission — does it work when auth provider loads?

10. **Catch-all route**: Only catches nested routes? What about top-level 404s?

## OUTPUT FORMAT
Per-team report with security concerns, UX gaps, and structural issues. Severity P0-P3.
