/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 route graph root: website/src/App]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { LocationProvider } from '@/contexts/LocationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { InvestorAuthProvider, useInvestorAuth } from '@/contexts/InvestorAuthContext';
import { BusinessUnitProvider, useBusinessUnit } from '@/contexts/BusinessUnitContext';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { Login } from '@/pages';
import { ROUTES, ROUTE_PERMISSIONS } from '@/constants';
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
const CtvDashboard = lazy(() => import('@/pages/CTV/CtvDashboard'));
const Landing = lazy(() => import('@/pages/Landing').then(m => ({ default: m.Landing })));
const JoinCtv = lazy(() => import('@/pages/CTV/JoinCtv').then(m => ({ default: m.JoinCtv })));
const VerifyDiscount = lazy(() => import('@/pages/VerifyDiscount'));
const CtvDiscountLanding = lazy(() => import('@/pages/CtvDiscountLanding'));
const InvestorLogin = lazy(() => import('@/pages/Investor/InvestorLogin').then(m => ({ default: m.InvestorLogin })));
const InvestorDashboard = lazy(() => import('@/pages/Investor/InvestorDashboard').then(m => ({ default: m.InvestorDashboard })));
const InvestorResetPassword = lazy(() => import('@/pages/Investor/InvestorResetPassword').then(m => ({ default: m.InvestorResetPassword })));

/**
 * Access Denied page — shown when authenticated but lacking permission
 */
function AccessDenied() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
        <span className="text-red-500 text-2xl font-bold">!</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{t('accessDenied.title')}</h2>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        {t('accessDenied.message')}
      </p>
      <button
        onClick={handleLogout}
        className="mt-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        {t('signOut')}
      </button>
    </div>
  );
}

/**
 * Loading spinner shown while auth state is resolving
 */
function AuthLoading() {
  const { t } = useTranslation('common');
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-gray-500">{t('loading')}</span>
      </div>
    </div>
  );
}

/**
 * Build the /login redirect target carrying the current location as returnTo,
 * so deep-linked protected pages bounce back after login (TC009 regression).
 * LoginRoute/Login already sanitize returnTo (must start with '/', not '//').
 */
function loginRedirectWithReturnTo(): string {
  if (typeof window === 'undefined') return '/login';
  const { pathname, search } = window.location;
  if (!pathname || pathname === '/' || pathname === '/login') return '/login';
  return `/login?returnTo=${encodeURIComponent(pathname + search)}`;
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
  const { isAuthenticated, isLoading, hasPermission, user } = useAuth();
  const isCtv = user?.is_ctv === true || user?.isCtv === true;

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to={loginRedirectWithReturnTo()} replace />;

  // Redirect CTV users to /ctv dashboard before admin routes render.
  if (isCtv) {
    return <Navigate to="/ctv" replace />;
  }

  const requiredPermission = ROUTE_PERMISSIONS[path];
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

/**
 * CTVRouteGuard — ensures only CTV users can access /ctv
 */
function CTVRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isCtv = user?.is_ctv === true || user?.isCtv === true;
  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to={loginRedirectWithReturnTo()} replace />;
  if (!isCtv) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * LoginRoute — redirects authenticated users away from /login
 */
function LoginRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const returnTo =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('returnTo')
      : null;
  const safeReturn =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  const isCtv = user?.is_ctv === true || user?.isCtv === true;

  if (isLoading) return <AuthLoading />;
  if (isAuthenticated) {
    if (isCtv) return <Navigate to="/ctv" replace />;
    return <Navigate to={safeReturn} replace />;
  }
  return <Login />;
}

function InvestorLoginRoute() {
  const { isAuthenticated, isLoading } = useInvestorAuth();
  if (isLoading) return <AuthLoading />;
  if (isAuthenticated) return <Navigate to="/investor" replace />;
  return <InvestorLogin />;
}

function AppRoutes({ children }: { readonly children: React.ReactNode }) {
  const { currentLOB } = useBusinessUnit();
  return <Routes key={currentLOB}>{children}</Routes>;
}

/** Avoid admin Layout splat redirect stealing public CTV / verify routes. */
function AdminCatchAllRedirect() {
  const { pathname } = useLocation();
  if (
    pathname.startsWith('/ctv/') ||
    pathname === '/verify-discount' ||
    pathname === '/investor' ||
    pathname.startsWith('/investor/') ||
    pathname === '/welcome' ||
    pathname === '/login'
  ) {
    return null;
  }
  return <Navigate to="/" replace />;
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
      <InvestorAuthProvider>
        <TimezoneProvider>
          <LocationProvider>
            <BusinessUnitProvider>
              <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>}>
                <AppRoutes>
                  {/* Public routes */}
                  {/* @crossref:route[path="/login", component=LoginRoute] */}
                  <Route path="/login" element={<LoginRoute />} />
                  {/* @crossref:route[path="/welcome", component=Landing] — public Tâm Group landing (ported from CTV app) */}
                  <Route path="/welcome" element={<Landing />} />
                  {/* @crossref:route[path="/verify-discount"] — staff scans CTV voucher QR */}
                  <Route path="/verify-discount" element={<VerifyDiscount />} />
                  {/* @crossref:route[path="/investor/*"] — investor account login, reset, and selected-client dashboard */}
                  <Route path="/investor" element={<Outlet />}>
                    <Route path="login" element={<InvestorLoginRoute />} />
                    <Route path="reset-password" element={<InvestorResetPassword />} />
                    <Route index element={<InvestorDashboard />} />
                  </Route>
                  {/* @crossref:route[path="/ctv/*"] — CTV portal + public join + fan discount landing */}
                  <Route path="/ctv" element={<Outlet />}>
                    {/* @crossref:route[path="/ctv/join", component=JoinCtv] */}
                    <Route path="join" element={<JoinCtv />} />
                    <Route path="discount/:shortCode" element={<CtvDiscountLanding />} />
                    {/* @crossref:route[path="/ctv", component=CtvDashboard] — portal home (CTVRouteGuard) */}
                    <Route
                      index
                      element={
                        <CTVRouteGuard>
                          <CtvDashboard />
                        </CTVRouteGuard>
                      }
                    />
                  </Route>
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

            {/* @crossref:route[path="/reports", component=ReportsShell] */}
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
              {/* @crossref:route[path="/reports/dashboard", component=ReportsDashboard] */}
              <Route path="dashboard" element={<ProtectedRoute path="/reports/dashboard"><ReportsDashboard /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/revenue", component=ReportsRevenue] */}
              <Route path="revenue" element={<ProtectedRoute path="/reports/revenue"><ReportsRevenue /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/appointments", component=ReportsAppointments] */}
              <Route path="appointments" element={<ProtectedRoute path="/reports/appointments"><ReportsAppointments /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/doctors", component=ReportsDoctors] */}
              <Route path="doctors" element={<ProtectedRoute path="/reports/doctors"><ReportsDoctors /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/customers", component=ReportsCustomers] */}
              <Route path="customers" element={<ProtectedRoute path="/reports/customers"><ReportsCustomers /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/locations", component=ReportsLocations] */}
              <Route path="locations" element={<ProtectedRoute path="/reports/locations"><ReportsLocations /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/services", component=ReportsServices] */}
              <Route path="services" element={<ProtectedRoute path="/reports/services"><ReportsServices /></ProtectedRoute>} />
              {/* @crossref:route[path="/reports/employees", component=ReportsEmployees] */}
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

            {/* @crossref:catch-all-route[redirects to Overview; skips public CTV + verify paths] */}
            <Route path="*" element={<AdminCatchAllRedirect />} />
          </Route>
                </AppRoutes>
              </Suspense>
            </BusinessUnitProvider>
          </LocationProvider>
        </TimezoneProvider>
      </InvestorAuthProvider>
    </AuthProvider>
  );
}

export default App;
