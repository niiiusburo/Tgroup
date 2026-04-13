import { useOutletContext } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import { useReportData, formatVND } from '@/hooks/useReportData';
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
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data: summary, loading: l1, error: e1, refetch: r1 } = useReportData<RevSummary>('/Reports/revenue/summary', filters);
  const { data: trend, loading: l2, error: e2, refetch: r2 } = useReportData<RevTrend>('/Reports/revenue/trend', filters);
  const { data: byLoc, loading: l3, error: e3, refetch: r3 } = useReportData<RevByLoc>('/Reports/revenue/by-location', filters);
  const { data: byDoc, loading: l4, error: e4, refetch: r4 } = useReportData<RevByDoc>('/Reports/revenue/by-doctor', filters);
  const { data: byCat, loading: l5, error: e5, refetch: r5 } = useReportData<RevByCat>('/Reports/revenue/by-category', filters);

  if (l1 || l2 || l3 || l4 || l5) return <div className="text-center py-12 text-gray-400">Loading revenue…</div>;
  const firstError = e1 || e2 || e3 || e4 || e5;
  if (firstError) return <ReportError error={firstError} onRetry={() => { r1(); r2(); r3(); r4(); r5(); }} />;
  if (!summary) return <div className="text-center py-12 text-gray-400">No data available</div>;

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

  const trendMonths = (trend || []).map(t => {
    const d = new Date(t.month);
    return { label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), value: t.paid, secondary: t.invoiced };
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Invoiced" value={totalInvoiced} format="currency" icon={<DollarSign className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label="Total Collected" value={totalPaid} format="currency" icon={<DollarSign className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label="Outstanding" value={totalOutstanding} format="currency" icon={<DollarSign className="w-4 h-4" />} color="amber" delay={2} />
        <KPICard label="Collection Rate" value={totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100) : 0} format="percent" icon={<DollarSign className="w-4 h-4" />} color="violet" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue trend */}
        <SectionCard title="Revenue Trend">
          <BarChart data={trendMonths} formatValue={formatVND} color="bg-blue-500" height={220} />
        </SectionCard>

        {/* Payment method breakdown */}
        <SectionCard title="By Payment Method">
          <DonutChart segments={methodSegments} />
        </SectionCard>
      </div>

      {/* Revenue by Doctor */}
      <SectionCard
        title="Revenue by Doctor"
        action={byDoc ? <ExportCSVButton data={byDoc.map(d => ({ Doctor: d.name, Orders: d.orderCount, Invoiced: d.invoiced, Collected: d.paid }))} filename="revenue-by-doctor" /> : undefined}
      >
        <HorizontalBarList
          items={(byDoc || []).filter(d => d.paid > 0).map(d => ({ label: d.name, value: d.paid }))}
          formatValue={formatVND}
          color="bg-emerald-500"
        />
      </SectionCard>

      {/* Revenue by Location */}
      <SectionCard
        title="Revenue by Location"
        action={byLoc ? <ExportCSVButton data={byLoc.filter(l => l.invoiced > 0).map(l => ({ Location: l.name, Orders: l.orderCount, Invoiced: l.invoiced, Collected: l.paid, Outstanding: l.outstanding }))} filename="revenue-by-location" /> : undefined}
      >
        <HorizontalBarList
          items={(byLoc || []).filter(l => l.invoiced > 0).map(l => ({ label: l.name, value: l.paid }))}
          formatValue={formatVND}
          color="bg-blue-500"
        />
      </SectionCard>

      {/* Revenue by Category */}
      <SectionCard
        title="Revenue by Service Category"
        action={byCat ? <ExportCSVButton data={byCat.filter(c => c.revenue > 0).map(c => ({ Category: c.category, Orders: c.lineCount, Revenue: c.revenue }))} filename="revenue-by-category" /> : undefined}
      >
        <HorizontalBarList
          items={(byCat || []).filter(c => c.revenue > 0).map(c => ({ label: c.category, value: c.revenue }))}
          formatValue={formatVND}
          color="bg-violet-500"
        />
      </SectionCard>
    </div>
  );
}
