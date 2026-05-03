import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LocationProvider } from '@/contexts/LocationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { Login } from '@/pages';
import { ROUTES } from '@/constants';
import { AddressAutocompleteTest } from '@/components/shared/AddressAutocompleteTest';

// Lazy-loaded pages (code-split for smaller initial bundle)
const Overview = lazy(() => import('@/pages/Overview').then(m => ({ default: m.Overview })));
const Calendar = lazy(() => import('@/pages/Calendar').then(m => ({ default: m.Calendar })));
const Customers = lazy(() => import('@/pages/Customers').then(m => ({ default: m.Customers })));
const Employees = lazy(() => import('@/pages/Employees').then(m => ({ default: m.Employees })));
const Locations = lazy(() => import('@/pages/Locations').then(m => ({ default: m.Locations })));
const Website = lazy(() => import('@/pages/Website').then(m => ({ default: m.Website })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Relationships = lazy(() => import('@/pages/Relationships').then(m => ({ default: m.Relationships })));
const Commission = lazy(() => import('@/pages/Commission').then(m => ({ default: m.Commission })));
const ReportsShell = lazy(() => import('@/pages/Reports'));
const ReportsDashboard = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Dashboard })));
const ReportsRevenue = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Revenue })));
const ReportsAppointments = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Appointments })));
const ReportsDoctors = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Doctors })));
const ReportsCustomers = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Customers })));
const ReportsLocations = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Locations })));
const ReportsServices = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Services })));
const ReportsEmployees = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Employees })));
const Notifications = lazy(() => import('@/pages/Notifications').then(m => ({ default: m.Notifications })));
const PermissionBoard = lazy(() => import('@/pages/PermissionBoard').then(m => ({ default: m.PermissionBoard })));
const Payment = lazy(() => import('@/pages/Payment').then(m => ({ default: m.Payment })));
const Feedback = lazy(() => import('@/pages/Feedback').then(m => ({ default: m.Feedback })));
const Services = lazy(() => import('@/pages/Services').then(m => ({ default: m.Services })));
const ServiceCatalog = lazy(() => import('@/pages/ServiceCatalog').then(m => ({ default: m.ServiceCatalog })));

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
  '/services': 'services.view',
  '/service-catalog': 'services.view',
  '/website': 'website.view',
  '/reports': 'reports.view',
  '/reports/dashboard': 'reports.view',
  '/reports/revenue': 'reports.view',
  '/reports/appointments': 'reports.view',
  '/reports/doctors': 'reports.view',
  '/reports/customers': 'reports.view',
  '/reports/locations': 'reports.view',
  '/reports/services': 'reports.view',
  '/reports/employees': 'reports.view',
  '/commission': 'commission.view',
  '/settings': 'settings.view',
  '/notifications': 'notifications.view',
  '/relationships': 'relationships.view',
  '/permissions': 'permissions.view',
  '/payment': 'payment.view',
  '/feedback': 'permissions.view',
};

/**
 * Access Denied page — shown when authenticated but lacking permission
 */
function AccessDenied() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
        <span className="text-red-500 text-2xl font-bold">!</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        You do not have permission to view this page. Contact your administrator.
      </p>
      <button
        onClick={handleLogout}
        className="mt-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Log Out
      </button>
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
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginRoute />} />
          {import.meta.env.DEV && (
            <Route path="/test/address" element={<AddressAutocompleteTest />} />
          )}

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

            {/* @crossref:route[path="/customers/:id", component=Customers] */}
            <Route
              path={`${ROUTES.CUSTOMERS}/:id`}
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

            {/* @crossref:route[path="/services", component=Services] */}
            <Route
              path={ROUTES.SERVICES}
              element={
                <ProtectedRoute path={ROUTES.SERVICES}>
                  <Services />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/service-catalog", component=ServiceCatalog] */}
            <Route
              path={ROUTES.SERVICE_CATALOG}
              element={
                <ProtectedRoute path={ROUTES.SERVICE_CATALOG}>
                  <ServiceCatalog />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/website", component=Website] */}
            <Route
              path={ROUTES.WEBSITE}
              element={
                <ProtectedRoute path={ROUTES.WEBSITE}>
                  <Website />
                </ProtectedRoute>
              }
            />

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
            <Route
              path={ROUTES.RELATIONSHIPS}
              element={
                <ProtectedRoute path={ROUTES.RELATIONSHIPS}>
                  <Relationships />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/commission", component=Commission] */}
            <Route
              path={ROUTES.COMMISSION}
              element={
                <ProtectedRoute path={ROUTES.COMMISSION}>
                  <Commission />
                </ProtectedRoute>
              }
            />

            {/* Reports section with nested sub-pages */}
            <Route
              path={ROUTES.REPORTS}
              element={
                <ProtectedRoute path={ROUTES.REPORTS}>
                  <ReportsShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={ROUTES.REPORTS_DASHBOARD} replace />} />
              <Route path="dashboard" element={<ProtectedRoute path="/reports/dashboard"><ReportsDashboard /></ProtectedRoute>} />
              <Route path="revenue" element={<ProtectedRoute path="/reports/revenue"><ReportsRevenue /></ProtectedRoute>} />
              <Route path="appointments" element={<ProtectedRoute path="/reports/appointments"><ReportsAppointments /></ProtectedRoute>} />
              <Route path="doctors" element={<ProtectedRoute path="/reports/doctors"><ReportsDoctors /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute path="/reports/customers"><ReportsCustomers /></ProtectedRoute>} />
              <Route path="locations" element={<ProtectedRoute path="/reports/locations"><ReportsLocations /></ProtectedRoute>} />
              <Route path="services" element={<ProtectedRoute path="/reports/services"><ReportsServices /></ProtectedRoute>} />
              <Route path="employees" element={<ProtectedRoute path="/reports/employees"><ReportsEmployees /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to={ROUTES.REPORTS_DASHBOARD} replace />} />
            </Route>

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

            {/* @crossref:route[path="/payment", component=Payment] */}
            <Route
              path={ROUTES.PAYMENT}
              element={
                <ProtectedRoute path={ROUTES.PAYMENT}>
                  <Payment />
                </ProtectedRoute>
              }
            />

            {/* @crossref:route[path="/feedback", component=Feedback] */}
            <Route
              path={ROUTES.FEEDBACK}
              element={
                <ProtectedRoute path={ROUTES.FEEDBACK}>
                  <Feedback />
                </ProtectedRoute>
              }
            />

            {/* @crossref:catch-all-route[redirects to Overview] */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </Suspense>
      </LocationProvider>
      </TimezoneProvider>
    </AuthProvider>
  );
}

export default App;
