import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Stethoscope, Award, DollarSign, Activity } from 'lucide-react';
import { useReportData, formatNum } from '@/hooks/useReportData';
import { formatVND } from '@/lib/formatting';
import { KPICard } from '@/components/reports/KPICard';
import { HorizontalBarList } from '@/components/reports/BarChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

type DocPerf = { id: string; name: string; totalAppointments: number; done: number; cancelled: number; revenue: number }[]

export function ReportsDoctors() {
  const { t } = useTranslation('reports');
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data: doctors, loading, error, refetch } = useReportData<DocPerf>('/Reports/doctors/performance', filters);

  if (loading) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;
  if (error) return <ReportError error={error} onRetry={refetch} />;
  if (!doctors) return <div className="text-center py-12 text-gray-400">{t('noData')}</div>;

  const totalAppts = doctors.reduce((s, d) => s + d.totalAppointments, 0);
  const totalDone = doctors.reduce((s, d) => s + d.done, 0);
  const totalRev = doctors.reduce((s, d) => s + d.revenue, 0);
  const topDoctor = doctors.reduce((best, d) => d.done > (best?.done || 0) ? d : best, doctors[0]);
  void topDoctor;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('metrics.totalDoctors')} value={doctors.length} format="number" icon={<Stethoscope className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label={t('metrics.totalAppointments')} value={totalAppts} format="number" icon={<Activity className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label={t('metrics.totalCompleted')} value={totalDone} format="number" icon={<Award className="w-4 h-4" />} color="violet" delay={2} />
        <KPICard label={t('metrics.totalRevenue')} value={totalRev} format="currency" icon={<DollarSign className="w-4 h-4" />} color="orange" delay={3} />
      </div>

      {/* By Appointments */}
      <SectionCard
        title={t('charts.appointmentsPerDoctor')}
        action={<ExportCSVButton data={doctors.map(d => ({ Doctor: d.name, Total: d.totalAppointments, Done: d.done, Cancelled: d.cancelled, Revenue: d.revenue }))} filename="doctors-appointments" />}
      >
        <HorizontalBarList
          items={doctors.filter(d => d.totalAppointments > 0).map(d => ({ label: d.name, value: d.totalAppointments, extra: `${d.done} ${t('table.done')}` }))}
          formatValue={formatNum}
          color="bg-blue-500"
        />
      </SectionCard>

      {/* By Revenue */}
      <SectionCard
        title={t('charts.revenuePerDoctor')}
        action={<ExportCSVButton data={doctors.filter(d => d.revenue > 0).map(d => ({ Doctor: d.name, Revenue: d.revenue }))} filename="doctors-revenue" />}
      >
        <HorizontalBarList
          items={doctors.filter(d => d.revenue > 0).map(d => ({ label: d.name, value: d.revenue }))}
          formatValue={formatVND}
          color="bg-emerald-500"
        />
      </SectionCard>

      {/* Detail table */}
      <SectionCard title={t('charts.doctorPerformanceDetail')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">{t('table.doctor')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.appointments')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.completed')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.cancelled')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.completionPct')}</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">{t('table.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {doctors.filter(d => d.totalAppointments > 0).map((doc, i) => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="py-3 px-3 font-medium text-gray-900">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {doc.name}
                  </td>
                  <td className="py-3 px-3 text-right">{formatNum(doc.totalAppointments)}</td>
                  <td className="py-3 px-3 text-right text-emerald-600 font-medium">{formatNum(doc.done)}</td>
                  <td className="py-3 px-3 text-right text-red-500">{formatNum(doc.cancelled)}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      doc.totalAppointments > 0 && (doc.done / doc.totalAppointments * 100) >= 70
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.totalAppointments > 0 ? (doc.done / doc.totalAppointments * 100).toFixed(0) : 0}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{formatVND(doc.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
