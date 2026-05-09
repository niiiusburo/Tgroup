/**
 * Reports Page — Shell with nested routing for 8 report sub-pages.
 * Provides shared filters (date range, location) and renders <Outlet /> for child routes.
 */
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import {
  BarChart3, LayoutDashboard, CreditCard, Calendar, Stethoscope,
  Users, MapPin, FolderOpen, UserCog, FileSpreadsheet,
} from 'lucide-react';
import { ROUTES } from '@/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLocations } from '@/hooks/useLocations';
import { ReportsFilters } from '@/components/reports/ReportsFilters';
import { useTranslation } from 'react-i18next';
import { fetchEmployees, type ApiEmployee } from '@/lib/api/employees';
import { useExport } from '@/hooks/useExport';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';

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

type ReportExportType = 'appointments' | 'services' | 'payments' | 'deposits' | 'revenue-flat' | 'deposit-flat';

const REPORT_EXPORT_TYPES: Array<{ key: ReportExportType; labelKey: string }> = [
  { key: 'appointments', labelKey: 'appointments' },
  { key: 'services', labelKey: 'services' },
  { key: 'payments', labelKey: 'payments' },
  { key: 'deposits', labelKey: 'deposits' },
  { key: 'revenue-flat', labelKey: 'revenueFlat' },
  { key: 'deposit-flat', labelKey: 'depositFlat' },
];

export default function Reports() {
  const { t } = useTranslation('reports');
  const location = useLocation();
  const navigate = useNavigate();
  const { allLocations, isLoading: locationsLoading } = useLocations();

  // Default: today (Vietnam timezone)
  const todayParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => todayParts.find(p => p.type === type)?.value ?? '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const defaultFrom = `${year}-${month}-${day}`;
  const defaultTo = `${year}-${month}-${day}`;

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [companyId, setCompanyId] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [doctorId, setDoctorId] = useState('all');
  const [exportType, setExportType] = useState<ReportExportType>('payments');
  const [doctorOptions, setDoctorOptions] = useState<ApiEmployee[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const activeTab = TABS.find(t => location.pathname === t.path) || TABS[0];
  const locations = useMemo(() => allLocations.map((l: any) => ({ id: l.id, name: l.name })), [allLocations]);

  useEffect(() => {
    let active = true;
    setDoctorsLoading(true);
    setDoctorId('all');

    fetchEmployees({
      limit: 500,
      companyId: companyId || undefined,
      isDoctor: true,
      active: 'true',
    })
      .then((response) => {
        if (!active) return;
        setDoctorOptions(response.items);
      })
      .catch(() => {
        if (active) setDoctorOptions([]);
      })
      .finally(() => {
        if (active) setDoctorsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [companyId]);

  const filters = useMemo(() => ({
    dateFrom,
    dateTo,
    companyId,
    timeFrom,
    timeTo,
    doctorId,
  }), [dateFrom, dateTo, companyId, timeFrom, timeTo, doctorId]);

  const exportFilters = useMemo(() => ({
    companyId: companyId || 'all',
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
    doctorId: doctorId === 'all' ? '' : doctorId,
  }), [companyId, dateFrom, dateTo, timeFrom, timeTo, doctorId]);

  const reportExport = useExport({
    type: exportType,
    filters: exportFilters,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={`${activeTab.label} analytics & insights`}
        icon={<BarChart3 className="w-6 h-6 text-primary" />}
      />

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
        timeFrom={timeFrom}
        timeTo={timeTo}
        doctorId={doctorId}
        onTimeFromChange={setTimeFrom}
        onTimeToChange={setTimeTo}
        onDoctorChange={setDoctorId}
        locations={locations}
        doctors={doctorOptions}
        locationsLoading={locationsLoading}
        doctorsLoading={doctorsLoading}
      />

      <div className="bg-white rounded-xl shadow-card border border-gray-100">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-gray-900">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">{t('exportCenter.title')}</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('exportCenter.subtitle')}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="space-y-1.5">
              <span className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('exportCenter.dataset')}
              </span>
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value as ReportExportType)}
                className="w-full min-w-[220px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {REPORT_EXPORT_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>{t(`exportCenter.types.${type.labelKey}`)}</option>
                ))}
              </select>
            </label>

            <ExportMenu
              onExport={reportExport.handleDirectExport}
              onPreview={reportExport.openPreview}
              disabled={reportExport.downloading}
              loading={reportExport.downloading || reportExport.loading}
            />
          </div>
        </div>

        {reportExport.error ? (
          <div className="mx-4 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {reportExport.error}
          </div>
        ) : null}
      </div>

      {/* Tab content */}
      <div className="transition-opacity duration-200">
        <Outlet context={filters} />
      </div>

      <ExportPreviewModal
        isOpen={reportExport.previewOpen}
        onClose={reportExport.closePreview}
        onDownload={reportExport.handleDownload}
        preview={reportExport.previewData}
        loading={reportExport.loading}
        error={reportExport.error}
      />
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
