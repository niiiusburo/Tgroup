import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, UserCheck, MapPin } from 'lucide-react';
import { useReportData, formatVND, formatNum } from '@/hooks/useReportData';
import { KPICard } from '@/components/reports/KPICard';
import { HorizontalBarList } from '@/components/reports/BarChart';
import { DonutChart } from '@/components/reports/DonutChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

interface CustSummary {
  total: number; newInPeriod: number;
  sources: { name: string; count: number }[];
  gender: { gender: string; count: number }[];
  cities: { city: string; count: number }[];
  topSpenders: { id: string; name: string; totalPaid: number; orderCount: number }[];
  outstanding: { id: string; name: string; outstanding: number }[];
  growth: { month: string; count: number }[];
}

export function ReportsCustomers() {
  const { t, i18n } = useTranslation('reports');
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data, loading, error, refetch } = useReportData<CustSummary>('/Reports/customers/summary', filters);

  if (loading) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;
  if (error) return <ReportError error={error} onRetry={refetch} />;
  if (!data) return <div className="text-center py-12 text-gray-400">{t('noData')}</div>;

  const growthPct = data.total > 0 ? (data.newInPeriod / data.total * 100).toFixed(1) : '0';

  const genderSegs = data.gender.map(g => ({
    label: g.gender === 'male' ? 'Male' : g.gender === 'female' ? 'Female' : 'Other',
    value: g.count,
    color: g.gender === 'male' ? '#3B82F6' : g.gender === 'female' ? '#EC4899' : '#6B7280',
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('metrics.totalCustomers')} value={data.total} format="number" icon={<Users className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label={t('metrics.newThisPeriod')} value={data.newInPeriod} format="number" icon={<UserPlus className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label={t('metrics.growthRate')} value={parseFloat(growthPct)} format="percent" icon={<UserCheck className="w-4 h-4" />} color="violet" delay={2} />
        <KPICard label={t('metrics.withOutstanding')} value={data.outstanding.length} format="number" icon={<MapPin className="w-4 h-4" />} color="amber" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By gender */}
        <SectionCard title={t('charts.genderDistribution')}>
          <DonutChart segments={genderSegs.length > 0 ? genderSegs : [{ label: 'No data', value: 1, color: '#E5E7EB' }]} />
        </SectionCard>
      </div>

      {/* Growth trend */}
      <SectionCard title={t('charts.customerGrowth')}>
        <HorizontalBarList
          items={data.growth.map(g => {
            const d = new Date(g.month);
            return { label: d.toLocaleDateString(i18n.language || 'en', { month: 'short', year: 'numeric' }), value: g.count };
          })}
          formatValue={formatNum}
          color="bg-violet-500"
        />
      </SectionCard>

      {/* Top spenders */}
      <SectionCard
        title={t('charts.topCustomersBySpend')}
        action={<ExportCSVButton data={data.topSpenders.filter(s => s.totalPaid > 0).map(s => ({ Customer: s.name, Spent: s.totalPaid, Orders: s.orderCount }))} filename="top-customers" />}
      >
        <HorizontalBarList
          items={data.topSpenders.filter(s => s.totalPaid > 0).map(s => ({ label: s.name, value: s.totalPaid }))}
          formatValue={formatVND}
          color="bg-emerald-500"
          maxItems={10}
        />
      </SectionCard>

      {/* Outstanding */}
      {data.outstanding.length > 0 && (
        <SectionCard
          title={t('charts.outstandingBalances')}
          action={<ExportCSVButton data={data.outstanding.map(o => ({ Customer: o.name, Outstanding: o.outstanding }))} filename="outstanding-balances" />}
        >
          <HorizontalBarList
            items={data.outstanding.map(o => ({ label: o.name, value: o.outstanding }))}
            formatValue={formatVND}
            color="bg-amber-500"
            maxItems={10}
          />
        </SectionCard>
      )}

      {/* Cities */}
      {data.cities.length > 0 && (
        <SectionCard title={t('charts.customersByCity')}>
          <HorizontalBarList
            items={data.cities.map(c => ({ label: c.city, value: c.count }))}
            formatValue={formatNum}
            color="bg-cyan-500"
          />
        </SectionCard>
      )}
    </div>
  );
}
