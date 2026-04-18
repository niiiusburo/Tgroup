/**
 * Reports Page — Shell with nested routing for 8 report sub-pages.
 * Provides shared filters (date range, location) and renders <Outlet /> for child routes.
 */
import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import {
  BarChart3, LayoutDashboard, CreditCard, Calendar, Stethoscope,
  Users, MapPin, FolderOpen, UserCog,
} from 'lucide-react';
import { ROUTES } from '@/constants';
import { useLocations } from '@/hooks/useLocations';
import { ReportsFilters } from '@/components/reports/ReportsFilters';
import { useTranslation } from 'react-i18next';

const TABS = [
  { path: ROUTES.REPORTS_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { path: ROUTES.REPORTS_REVENUE, label: 'Revenue', icon: CreditCard },
  { path: ROUTES.REPORTS_APPOINTMENTS, label: 'Appointments', icon: Calendar },
  { path: ROUTES.REPORTS_DOCTORS, label: 'Doctors', icon: Stethoscope },
  { path: ROUTES.REPORTS_CUSTOMERS, label: 'Customers', icon: Users },
  { path: ROUTES.REPORTS_LOCATIONS, label: 'Locations', icon: MapPin },
  { path: ROUTES.REPORTS_SERVICES, label: 'Services', icon: FolderOpen },
  { path: ROUTES.REPORTS_EMPLOYEES, label: 'Employees', icon: UserCog },
];

export default function Reports() {
  const { t } = useTranslation('reports');
  const location = useLocation();
  const navigate = useNavigate();
  const { allLocations } = useLocations();

  // Default: start of this year → today
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-01-01`;
  const defaultTo = now.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [companyId, setCompanyId] = useState('');

  const activeTab = TABS.find(t => location.pathname === t.path) || TABS[0];
  const locations = useMemo(() => allLocations.map((l: any) => ({ id: l.id, name: l.name })), [allLocations]);

  const filters = useMemo(() => ({ dateFrom, dateTo, companyId }), [dateFrom, dateTo, companyId]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{activeTab.label} analytics &amp; insights</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 px-2">
          {TABS.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors duration-150 flex-shrink-0
                  ${isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global filters */}
      <ReportsFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        companyId={companyId}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onCompanyChange={setCompanyId}
        locations={locations}
      />

      {/* Tab content */}
      <div className="transition-opacity duration-200">
        <Outlet context={filters} />
      </div>
    </div>
  );
}

// Re-export sub-pages for App.tsx lazy loading
export { ReportsDashboard as Dashboard } from './reports/ReportsDashboard';
export { ReportsRevenue as Revenue } from './reports/ReportsRevenue';
export { ReportsAppointments as Appointments } from './reports/ReportsAppointments';
export { ReportsDoctors as Doctors } from './reports/ReportsDoctors';
export { ReportsCustomers as Customers } from './reports/ReportsCustomers';
export { ReportsLocations as Locations } from './reports/ReportsLocations';
export { ReportsServices as Services } from './reports/ReportsServices';
export { ReportsEmployees as Employees } from './reports/ReportsEmployees';
