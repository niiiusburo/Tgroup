import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { useReportData } from '@/hooks/useReportData';
import { formatVND } from '@/lib/formatting';
import { KPICard } from '@/components/reports/KPICard';
import { BarChart, HorizontalBarList } from '@/components/reports/BarChart';
import { DonutChart } from '@/components/reports/DonutChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

interface RevSummary { orders: { state: string; cnt: number; total: number; paid: number; outstanding: number }[]; payments: { method: string; status: string; cnt: number; total: number }[] }
type RevTrend = { month: string; orderCount: number; invoiced: number; paid: number; outstanding: number }[]
type RevByLoc = { id: string; name: string; orderCount: number; invoiced: number; paid: number; outstanding: number }[]
type RevByDoc = { id: string; name: string; orderCount: number; invoiced: number; paid: number }[]
type RevByCat = { id: string; category: string; lineCount: number; revenue: number }[]

export function ReportsRevenue() {
  const { t, i18n } = useTranslation('reports');
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const summaryQ = useReportData<RevSummary>('/Reports/revenue/summary', filters);
  const trendQ = useReportData<RevTrend>('/Reports/revenue/trend', filters);
  const byLocQ = useReportData<RevByLoc>('/Reports/revenue/by-location', filters);
  const byDocQ = useReportData<RevByDoc>('/Reports/revenue/by-doctor', filters);
  const byCatQ = useReportData<RevByCat>('/Reports/revenue/by-category', filters);

  const anyLoading = summaryQ.loading || trendQ.loading || byLocQ.loading || byDocQ.loading || byCatQ.loading;
  if (anyLoading) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;
  if (summaryQ.error) return <ReportError error={summaryQ.error} onRetry={summaryQ.refetch} />;
  if (!summaryQ.data) return <div className="text-center py-12 text-gray-400">{t('noData')}</div>;

  const summary = summaryQ.data;
  const totalInvoiced = summary.orders.reduce((s, o) => s + o.total, 0);
  const totalPaid = summary.orders.reduce((s, o) => s + o.paid, 0);
  const totalOutstanding = summary.orders.reduce((s, o) => s + o.outstanding, 0);

  const methodSegments = summary.payments
    .filter(p => p.status === 'posted')
    .reduce((acc, p) => {
      const existing = acc.find(a => a.label === (p.method || 'Other'));
      if (existing) existing.value += p.total;
      else acc.push({ label: p.method || 'Other', value: p.total, color: p.method === 'cash' ? '#10B981' : p.method === 'bank' ? '#3B82F6' : p.method === 'deposit' ? '#8B5CF6' : '#6B7280' });
      return acc;
    }, [] as { label: string; value: number; color: string }[]);

  const trendMonths = (trendQ.data || []).map(t => {
    const d = new Date(t.month);
    return { label: d.toLocaleDateString(i18n.language || 'en', { month: 'short', year: '2-digit' }), value: t.paid, secondary: t.invoiced };
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('metrics.totalInvoiced')} value={totalInvoiced} format="currency" icon={<DollarSign className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label={t('metrics.totalCollected')} value={totalPaid} format="currency" icon={<DollarSign className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label={t('metrics.outstanding')} value={totalOutstanding} format="currency" icon={<DollarSign className="w-4 h-4" />} color="amber" delay={2} />
        <KPICard label={t('metrics.collectionRate')} value={totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100) : 0} format="percent" icon={<DollarSign className="w-4 h-4" />} color="violet" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue trend */}
        <SectionCard title={t('charts.revenueTrend')}>
          <BarChart data={trendMonths} formatValue={formatVND} color="bg-blue-500" height={220} />
        </SectionCard>

        {/* Payment method breakdown */}
        <SectionCard title={t('charts.byPaymentMethod')}>
          <DonutChart segments={methodSegments} />
        </SectionCard>
      </div>

      {/* Revenue by Doctor */}
      <SectionCard
        title={t('charts.revenueByDoctor')}
        action={byDocQ.data ? <ExportCSVButton data={byDocQ.data.map(d => ({ Doctor: d.name, Orders: d.orderCount, Invoiced: d.invoiced, Collected: d.paid }))} filename="revenue-by-doctor" /> : undefined}
      >
        {byDocQ.error ? <ReportError error={byDocQ.error} onRetry={byDocQ.refetch} /> : (
          <HorizontalBarList
            items={(byDocQ.data || []).filter(d => d.paid > 0).map(d => ({ label: d.name, value: d.paid }))}
            formatValue={formatVND}
            color="bg-emerald-500"
          />
        )}
      </SectionCard>

      {/* Revenue by Location */}
      <SectionCard
        title={t('charts.revenueByBranch')}
        action={byLocQ.data ? <ExportCSVButton data={byLocQ.data.filter(l => l.invoiced > 0).map(l => ({ Location: l.name, Orders: l.orderCount, Invoiced: l.invoiced, Collected: l.paid, Outstanding: l.outstanding }))} filename="revenue-by-location" /> : undefined}
      >
        {byLocQ.error ? <ReportError error={byLocQ.error} onRetry={byLocQ.refetch} /> : (
          <HorizontalBarList
            items={(byLocQ.data || []).filter(l => l.invoiced > 0).map(l => ({ label: l.name, value: l.paid }))}
            formatValue={formatVND}
            color="bg-blue-500"
          />
        )}
      </SectionCard>

      {/* Revenue by Category */}
      <SectionCard
        title={t('charts.revenueByCategory')}
        action={byCatQ.data ? <ExportCSVButton data={byCatQ.data.filter(c => c.revenue > 0).map(c => ({ Category: c.category, Orders: c.lineCount, Revenue: c.revenue }))} filename="revenue-by-category" /> : undefined}
      >
        {byCatQ.error ? <ReportError error={byCatQ.error} onRetry={byCatQ.refetch} /> : (
          <HorizontalBarList
            items={(byCatQ.data || []).filter(c => c.revenue > 0).map(c => ({ label: c.category, value: c.revenue }))}
            formatValue={formatVND}
            color="bg-violet-500"
          />
        )}
      </SectionCard>
    </div>
  );
}
