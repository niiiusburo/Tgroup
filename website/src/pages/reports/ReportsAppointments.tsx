import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, XCircle, Repeat } from 'lucide-react';
import { useReportData, formatNum } from '@/hooks/useReportData';
import { KPICard } from '@/components/reports/KPICard';
import { BarChart, HorizontalBarList } from '@/components/reports/BarChart';
import { DonutChart, ProgressRing } from '@/components/reports/DonutChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

const STATE_COLORS: Record<string, string> = {
  done: '#10B981', confirmed: '#3B82F6', scheduled: '#8B5CF6', arrived: '#0EA5E9',
  'in Examination': '#F59E0B', 'in-progress': '#F97316', cancel: '#EF4444', cancelled: '#EF4444',
};

interface ApptSummary {
  total: number; done: number; cancelled: number;
  completionRate: string; cancellationRate: string; conversionRate: string;
  states: { state: string; count: number }[];
  repeatCustomers: number; newCustomers: number;
}
interface ApptTrend {
  trend: { week: string; total: number; done: number; cancelled: number }[];
  peakHours: { hour: number; count: number }[];
}

export function ReportsAppointments() {
  const { t, i18n } = useTranslation('reports');
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data: summary, loading: l1, error: e1, refetch: r1 } = useReportData<ApptSummary>('/Reports/appointments/summary', filters);
  const { data: trendData, loading: l2, error: e2, refetch: r2 } = useReportData<ApptTrend>('/Reports/appointments/trend', filters);

  if (l1 || l2) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;
  if (e1 || e2) return <ReportError error={e1 || e2 || ''} onRetry={() => { r1(); r2(); }} />;
  if (!summary) return <div className="text-center py-12 text-gray-400">{t('noData')}</div>;

  const statusSegments = summary.states.map(s => ({
    label: s.state || 'unknown',
    value: s.count,
    color: STATE_COLORS[s.state] || '#6B7280',
  }));

  const weeklyTrend = (trendData?.trend || []).map(t => {
    const d = new Date(t.week);
    return { label: d.toLocaleDateString(i18n.language || 'en', { month: 'short', day: 'numeric' }), value: t.total };
  });

  const peakHours = (trendData?.peakHours || []).map(h => ({
    label: `${h.hour}:00`,
    value: h.count,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('metrics.totalAppointments')} value={summary.total} format="number" icon={<Calendar className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label={t('metrics.completedAppointments')} value={summary.done} format="number" icon={<CheckCircle className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label={t('metrics.cancelledAppointments')} value={summary.cancelled} format="number" icon={<XCircle className="w-4 h-4" />} color="rose" delay={2} />
        <KPICard label={t('kpi.repeatPatients')} value={summary.repeatCustomers} format="number" icon={<Repeat className="w-4 h-4" />} color="violet" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Status breakdown */}
        <SectionCard title={t('charts.statusBreakdown')}>
          <DonutChart segments={statusSegments} />
        </SectionCard>

        {/* Rate rings */}
        <SectionCard title={t('charts.keyRates')}>
          <div className="flex items-center justify-around py-4">
            <ProgressRing value={parseFloat(summary.completionRate)} label={t('metrics.completion')} color="#10B981" />
            <ProgressRing value={parseFloat(summary.cancellationRate)} label={t('metrics.cancellation')} color="#EF4444" />
            <ProgressRing value={parseFloat(summary.conversionRate)} label={t('metrics.conversion')} color="#3B82F6" />
          </div>
        </SectionCard>

        {/* New vs Repeat */}
        <SectionCard title={t('charts.patientType')}>
          <DonutChart segments={[
            { label: t('kpi.newPatients'), value: summary.newCustomers, color: '#8B5CF6' },
            { label: t('kpi.repeatPatients'), value: summary.repeatCustomers, color: '#0EA5E9' },
          ]} />
        </SectionCard>
      </div>

      {/* Weekly trend */}
      <SectionCard title={t('charts.weeklyAppointmentVolume')}>
        <BarChart data={weeklyTrend} formatValue={formatNum} color="bg-blue-500" height={220} />
      </SectionCard>

      {/* Peak hours */}
      <SectionCard
        title={t('charts.peakHours')}
        action={<ExportCSVButton data={(trendData?.peakHours || []).map(h => ({ Hour: `${h.hour}:00`, Appointments: h.count }))} filename="peak-hours" />}
      >
        <HorizontalBarList items={peakHours} formatValue={formatNum} color="bg-cyan-500" maxItems={12} />
      </SectionCard>
    </div>
  );
}
