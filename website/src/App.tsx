import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LocationProvider } from '@/contexts/LocationContext';
import {
  Overview,
  Calendar,
  Customers,
  Appointments,
  Services,
  Payment,
  Employees,
  Locations,
  ServiceCatalog,
  Settings,
  Relationships,
  Commission,
  Reports,
  Notifications,
  PermissionBoard,
} from '@/pages';
import { ROUTES } from '@/constants';

/**
 * Main Application Component
 * @crossref:root-component
 * @crossref:uses[Layout, Routes, Route, LocationProvider]
 * @crossref:routes[
 *   / -> Overview,
 *   /calendar -> Calendar,
 *   /customers -> Customers,
 *   /appointments -> Appointments,
 *   /services -> Services,
 *   /payment -> Payment,
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
    <LocationProvider>
    <Routes>
      {/* @crossref:route-wrapper[Layout] */}
      <Route path="/" element={<Layout />}>
        {/* @crossref:route[path="/", component=Overview] */}
        <Route index element={<Overview />} />
        
        {/* @crossref:route[path="/calendar", component=Calendar] */}
        <Route path={ROUTES.CALENDAR} element={<Calendar />} />
        
        {/* @crossref:route[path="/customers", component=Customers] */}
        <Route path={ROUTES.CUSTOMERS} element={<Customers />} />
        
        {/* @crossref:route[path="/appointments", component=Appointments] */}
        <Route path={ROUTES.APPOINTMENTS} element={<Appointments />} />
        
        {/* @crossref:route[path="/services", component=Services] */}
        <Route path={ROUTES.SERVICES} element={<Services />} />
        
        {/* @crossref:route[path="/payment", component=Payment] */}
        <Route path={ROUTES.PAYMENT} element={<Payment />} />
        
        {/* @crossref:route[path="/employees", component=Employees] */}
        <Route path={ROUTES.EMPLOYEES} element={<Employees />} />
        
        {/* @crossref:route[path="/locations", component=Locations] */}
        <Route path={ROUTES.LOCATIONS} element={<Locations />} />
        
        {/* @crossref:route[path="/website", component=ServiceCatalog] */}
        <Route path={ROUTES.WEBSITE} element={<ServiceCatalog />} />
        
        {/* @crossref:route[path="/settings", component=Settings] */}
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
        
        {/* @crossref:route[path="/relationships", component=Relationships] */}
        <Route path={ROUTES.RELATIONSHIPS} element={<Relationships />} />

        {/* @crossref:route[path="/commission", component=Commission] */}
        <Route path={ROUTES.COMMISSION} element={<Commission />} />

        {/* @crossref:route[path="/reports", component=Reports] */}
        <Route path={ROUTES.REPORTS} element={<Reports />} />

        {/* @crossref:route[path="/notifications", component=Notifications] */}
        <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />

        {/* @crossref:route[path="/permissions", component=PermissionBoard] */}
        <Route path={ROUTES.PERMISSIONS} element={<PermissionBoard />} />

        {/* @crossref:catch-all-route[redirects to Overview] */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </LocationProvider>
  );
}

export default App;
