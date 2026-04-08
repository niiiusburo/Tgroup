import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LocationProvider } from '@/contexts/LocationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import {
  Overview,
  Calendar,
  Customers,
  Employees,
  Locations,
  ServiceCatalog,
  Settings,
  Relationships,
  Commission,
  Reports,
  Notifications,
  PermissionBoard,
  Login,
} from '@/pages';
import { ROUTES } from '@/constants';
import { AddressAutocompleteTest } from '@/components/shared/AddressAutocompleteTest';

/**
 * Route → required permission mapping
 * @crossref:used-in[ProtectedRoute]
 */
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/': 'overview.view',
  '/calendar': 'calendar.view',
  '/customers': 'customers.view',

  '/employees': 'employees.view',
  '/locations': 'locations.view',
  '/reports': 'reports.view',
  '/commission': 'commission.view',
  '/settings': 'settings.view',
  '/notifications': 'notifications.view',
  '/permissions': 'employees.edit',
};

/**
 * Access Denied page — shown when authenticated but lacking permission
 */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
        <span className="text-red-500 text-2xl font-bold">!</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        You do not have permission to view this page. Contact your administrator.
      </p>
    </div>
  );
}

/**
 * Loading spinner shown while auth state is resolving
 */
function AuthLoading() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute — redirects to /login if not authenticated,
 * shows AccessDenied if authenticated but missing permission.
 */
interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly path: string;
}

function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const requiredPermission = ROUTE_PERMISSIONS[path];
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

/**
 * LoginRoute — redirects authenticated users away from /login
 */
function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}

/**
 * Main Application Component
 * @crossref:root-component
 * @crossref:uses[Layout, Routes, Route, LocationProvider, AuthProvider]
 * @crossref:routes[
 *   / -> Overview,
 *   /calendar -> Calendar,
 *   /customers -> Customers,

 *   /employees -> Employees,
 *   /locations -> Locations,
 *   /website -> Website,
 *   /settings -> Settings,
 *   /relationships -> Relationships,
 *   /commission -> Commission,
 *   /reports -> Reports,
 *   /notifications -> Notifications
 * ]
 */
function App() {
  return (
    <AuthProvider>
      <TimezoneProvider>
        <LocationProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/test/address" element={<AddressAutocompleteTest />} />

          {/* Protected routes wrapped in Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute path="/">
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* @crossref:route[path="/", component=Overview] */}
            <Route index element={<Overview />} />

            {/* @crossref:route[path="/calendar", component=Calendar] */}
            <Route
              path={ROUTES.CALENDAR}
              element={
                <ProtectedRoute path={ROUTES.CALENDAR}>
                  <Calendar />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/customers", component=Customers] */}
            <Route
              path={ROUTES.CUSTOMERS}
              element={
                <ProtectedRoute path={ROUTES.CUSTOMERS}>
                  <Customers />
                </ProtectedRoute>
              }
            />


            {/* @crossref:route[path="/employees", component=Employees] */}
            <Route
              path={ROUTES.EMPLOYEES}
              element={
                <ProtectedRoute path={ROUTES.EMPLOYEES}>
                  <Employees />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/locations", component=Locations] */}
            <Route
              path={ROUTES.LOCATIONS}
              element={
                <ProtectedRoute path={ROUTES.LOCATIONS}>
                  <Locations />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/website", component=ServiceCatalog] */}
            <Route path={ROUTES.WEBSITE} element={<ServiceCatalog />} />

            {/* @crossref:route[path="/settings", component=Settings] */}
            <Route
              path={ROUTES.SETTINGS}
              element={
                <ProtectedRoute path={ROUTES.SETTINGS}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/relationships", component=Relationships] */}
            <Route path={ROUTES.RELATIONSHIPS} element={<Relationships />} />

            {/* @crossref:route[path="/commission", component=Commission] */}
            <Route
              path={ROUTES.COMMISSION}
              element={
                <ProtectedRoute path={ROUTES.COMMISSION}>
                  <Commission />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/reports", component=Reports] */}
            <Route
              path={ROUTES.REPORTS}
              element={
                <ProtectedRoute path={ROUTES.REPORTS}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/notifications", component=Notifications] */}
            <Route
              path={ROUTES.NOTIFICATIONS}
              element={
                <ProtectedRoute path={ROUTES.NOTIFICATIONS}>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/permissions", component=PermissionBoard] */}
            <Route
              path={ROUTES.PERMISSIONS}
              element={
                <ProtectedRoute path={ROUTES.PERMISSIONS}>
                  <PermissionBoard />
                </ProtectedRoute>
              }
            />

            {/* @crossref:catch-all-route[redirects to Overview] */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LocationProvider>
      </TimezoneProvider>
    </AuthProvider>
  );
}

export default App;
