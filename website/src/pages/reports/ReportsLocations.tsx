import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, DollarSign, Users } from 'lucide-react';
import { useReportData, formatNum } from '@/hooks/useReportData';
import { formatVND } from '@/lib/formatting';
import { KPICard } from '@/components/reports/KPICard';
import { HorizontalBarList } from '@/components/reports/BarChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

interface LocData {
  locations: { id: string; name: string; active: boolean; appointmentCount: number; doneCount: number; revenue: number; orderCount: number; employeeCount: number }[];
  trend: { location: string; month: string; count: number }[];
}

export function ReportsLocations() {
  const { t } = useTranslation('reports');
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data, loading, error, refetch } = useReportData<LocData>('/Reports/locations/comparison', filters);

  if (loading) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;
  if (error) return <ReportError error={error} onRetry={refetch} />;
  if (!data) return <div className="text-center py-12 text-gray-400">{t('noData')}</div>;

  const totalAppts = data.locations.reduce((s, l) => s + l.appointmentCount, 0);
  const totalRev = data.locations.reduce((s, l) => s + l.revenue, 0);
  const totalEmps = data.locations.reduce((s, l) => s + l.employeeCount, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('metrics.totalBranches')} value={data.locations.length} format="number" icon={<MapPin className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label={t('metrics.totalAppointments')} value={totalAppts} format="number" icon={<Calendar className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label={t('metrics.totalRevenue')} value={totalRev} format="currency" icon={<DollarSign className="w-4 h-4" />} color="violet" delay={2} />
        <KPICard label={t('metrics.totalStaff')} value={totalEmps} format="number" icon={<Users className="w-4 h-4" />} color="orange" delay={3} />
      </div>

      {/* Comparison table */}
      <SectionCard
        title={t('charts.branchComparison')}
        action={<ExportCSVButton data={data.locations.map(l => ({ Branch: l.name, Appointments: l.appointmentCount, Completed: l.doneCount, Revenue: l.revenue, Orders: l.orderCount, Staff: l.employeeCount }))} filename="location-comparison" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">{t('table.branch')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.appointments')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.completed')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.revenue')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.orders')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.staff')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.revPerAppt')}</th>
              </tr>
            </thead>
            <tbody>
              {data.locations.map((loc) => (
                <tr key={loc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="py-3 px-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${loc.active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                      {loc.name}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">{formatNum(loc.appointmentCount)}</td>
                  <td className="py-3 px-3 text-right text-emerald-600">{formatNum(loc.doneCount)}</td>
                  <td className="py-3 px-3 text-right font-medium">{formatVND(loc.revenue)}</td>
                  <td className="py-3 px-3 text-right">{formatNum(loc.orderCount)}</td>
                  <td className="py-3 px-3 text-right">{formatNum(loc.employeeCount)}</td>
                  <td className="py-3 px-3 text-right text-gray-500">
                    {loc.appointmentCount > 0 ? formatVND(loc.revenue / loc.appointmentCount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={t('charts.appointmentsByBranch')}>
          <HorizontalBarList
            items={data.locations.filter(l => l.appointmentCount > 0).map(l => ({ label: l.name, value: l.appointmentCount }))}
            formatValue={formatNum}
            color="bg-blue-500"
          />
        </SectionCard>

        <SectionCard title={t('charts.revenueByBranch')}>
          <HorizontalBarList
            items={data.locations.filter(l => l.revenue > 0).map(l => ({ label: l.name, value: l.revenue }))}
            formatValue={formatVND}
            color="bg-emerald-500"
          />
        </SectionCard>
      </div>
    </div>
  );
}
