import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Scale, WalletCards } from 'lucide-react';
import { useReportData } from '@/hooks/useReportData';
import { useExport } from '@/hooks/useExport';
import { formatVND } from '@/lib/formatting';
import { fetchEmployees, type ApiEmployee } from '@/lib/api/employees';
import { KPICard } from '@/components/reports/KPICard';
import { BarChart, HorizontalBarList } from '@/components/reports/BarChart';
import { DonutChart } from '@/components/reports/DonutChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';

interface RevSummary { orders: { state: string; cnt: number; total: number; paid: number; outstanding: number }[]; payments: { method: string; status: string; cnt: number; total: number }[] }
type RevTrend = { month: string; orderCount: number; invoiced: number; paid: number; outstanding: number }[]
type RevByLoc = { id: string; name: string; orderCount: number; invoiced: number; paid: number; outstanding: number }[]
type RevByDoc = { id: string; name: string; orderCount: number; invoiced: number; paid: number }[]
type RevByCat = { id: string; category: string; lineCount: number; revenue: number }[]
type RevenueRule = { key: string; label?: string; treatment: string }
type CashFlowCategory = { key: string; direction: string; count: number; amount: number; signedAmount: number }
type CashFlowSummary = {
  moneyIn: number;
  moneyOut: number;
  netCashFlow: number;
  internalDepositUsed: number;
  adjustments: number;
  categories: CashFlowCategory[];
  trend: { date: string; moneyIn: number; moneyOut: number; netCashFlow: number }[];
}

type EmployeeExportType = 'doctor' | 'assistant' | 'consultant' | 'sales';

const EMPLOYEE_EXPORT_TYPES: EmployeeExportType[] = ['doctor', 'assistant', 'consultant', 'sales'];

function normalizeRole(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isEmployeeForType(employee: ApiEmployee, employeeType: EmployeeExportType) {
  const title = normalizeRole(`${employee.jobtitle || ''} ${employee.hrjobname || ''}`);
  if (employeeType === 'doctor') return employee.isdoctor || title.includes('bac si');
  if (employeeType === 'assistant') return employee.isassistant || title.includes('phu ta') || title.includes('tro ly');
  if (employeeType === 'consultant') return title.includes('tu van') || title.includes('cskh') || title.includes('counselor');
  return title.includes('sale') || title.includes('kinh doanh');
}

export function ReportsRevenue() {
  const { t, i18n } = useTranslation('reports');
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const [employeeType, setEmployeeType] = useState<EmployeeExportType>('doctor');
  const [employeeId, setEmployeeId] = useState('all');
  const [employeeOptions, setEmployeeOptions] = useState<ApiEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const summaryQ = useReportData<RevSummary>('/Reports/revenue/summary', filters);
  const trendQ = useReportData<RevTrend>('/Reports/revenue/trend', filters);
  const byLocQ = useReportData<RevByLoc>('/Reports/revenue/by-location', filters);
  const byDocQ = useReportData<RevByDoc>('/Reports/revenue/by-doctor', filters);
  const byCatQ = useReportData<RevByCat>('/Reports/revenue/by-category', filters);
  const rulesQ = useReportData<{ rules: RevenueRule[] }>('/Reports/revenue/rules', filters);
  const cashFlowQ = useReportData<CashFlowSummary>('/Reports/cash-flow/summary', filters);
  const employeeExportFilters = useMemo(() => ({
    companyId: filters.companyId || 'all',
    employeeType,
    employeeId: employeeId === 'all' ? '' : employeeId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  }), [filters.companyId, filters.dateFrom, filters.dateTo, employeeType, employeeId]);
  const employeeExport = useExport({
    type: 'report-sales-employees',
    filters: employeeExportFilters,
  });

  useEffect(() => {
    let active = true;
    setEmployeeId('all');
    setEmployeesLoading(true);

    fetchEmployees({
      limit: 500,
      companyId: filters.companyId || undefined,
      isDoctor: employeeType === 'doctor' ? true : undefined,
      isAssistant: employeeType === 'assistant' ? true : undefined,
      active: 'true',
    })
      .then((response) => {
        if (!active) return;
        setEmployeeOptions(response.items.filter((employee) => isEmployeeForType(employee, employeeType)));
      })
      .catch(() => {
        if (active) setEmployeeOptions([]);
      })
      .finally(() => {
        if (active) setEmployeesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.companyId, employeeType]);

  const anyLoading = summaryQ.loading || trendQ.loading || byLocQ.loading || byDocQ.loading || byCatQ.loading || rulesQ.loading || cashFlowQ.loading;
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
  const cashFlowTrend = (cashFlowQ.data?.trend || []).map(point => {
    const d = new Date(`${point.date}T00:00:00`);
    return { label: d.toLocaleDateString(i18n.language || 'en', { month: 'short', day: 'numeric' }), value: point.netCashFlow, secondary: point.moneyIn };
  });

  return (
    <div className="space-y-5">
      <SectionCard
        title={t('charts.employeeRevenueExcel')}
        action={
          <ExportMenu
            onExport={employeeExport.handleDirectExport}
            onPreview={employeeExport.openPreview}
            disabled={employeeExport.downloading}
            loading={employeeExport.downloading || employeeExport.loading}
          />
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('employeeExport.employeeType')}
            </span>
            <select
              value={employeeType}
              onChange={(event) => setEmployeeType(event.target.value as EmployeeExportType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {EMPLOYEE_EXPORT_TYPES.map((type) => (
                <option key={type} value={type}>{t(`employeeExport.types.${type}`)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('employeeExport.employee')}
            </span>
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              disabled={employeesLoading}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="all">
                {employeesLoading ? t('employeeExport.loadingEmployees') : t('employeeExport.allEmployees')}
              </option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.ref ? `${employee.name} (${employee.ref})` : employee.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {employeeExport.error ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {employeeExport.error}
          </div>
        ) : null}
      </SectionCard>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('metrics.totalInvoiced')} value={totalInvoiced} format="currency" icon={<DollarSign className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label={t('metrics.totalCollected')} value={totalPaid} format="currency" icon={<DollarSign className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label={t('metrics.outstanding')} value={totalOutstanding} format="currency" icon={<DollarSign className="w-4 h-4" />} color="amber" delay={2} />
        <KPICard label={t('metrics.collectionRate')} value={totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100) : 0} format="percent" icon={<DollarSign className="w-4 h-4" />} color="violet" delay={3} />
      </div>

      {cashFlowQ.error ? <ReportError error={cashFlowQ.error} onRetry={cashFlowQ.refetch} /> : cashFlowQ.data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label={t('metrics.moneyIn')} value={cashFlowQ.data.moneyIn} format="currency" icon={<ArrowUpCircle className="w-4 h-4" />} color="emerald" delay={0} />
          <KPICard label={t('metrics.moneyOut')} value={cashFlowQ.data.moneyOut} format="currency" icon={<ArrowDownCircle className="w-4 h-4" />} color="amber" delay={1} />
          <KPICard label={t('metrics.netCashFlow')} value={cashFlowQ.data.netCashFlow} format="currency" icon={<Scale className="w-4 h-4" />} color="blue" delay={2} />
          <KPICard label={t('metrics.internalDepositUsed')} value={cashFlowQ.data.internalDepositUsed} format="currency" icon={<WalletCards className="w-4 h-4" />} color="violet" delay={3} />
        </div>
      ) : null}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={t('charts.cashFlowTrend')}>
          {cashFlowQ.data ? <BarChart data={cashFlowTrend} formatValue={formatVND} color="bg-emerald-500" height={220} /> : null}
        </SectionCard>

        <SectionCard title={t('charts.revenueRecognitionBasis')}>
          {rulesQ.error ? <ReportError error={rulesQ.error} onRetry={rulesQ.refetch} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">{t('table.rule')}</th>
                    <th className="py-2 pr-3 font-medium">{t('table.treatment')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(rulesQ.data?.rules || []).map(rule => (
                    <tr key={rule.key}>
                      <td className="py-3 pr-3 font-medium text-gray-800">{t(`revenueRules.${rule.key}.label`)}</td>
                      <td className="py-3 pr-3 text-gray-600">{t(`revenueRules.treatments.${rule.treatment}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={t('charts.cashFlowMovement')}
        action={cashFlowQ.data ? <ExportCSVButton data={cashFlowQ.data.categories.map(c => ({ Type: t(`cashFlow.categories.${c.key}`), Direction: t(`cashFlow.directions.${c.direction}`), Count: c.count, Amount: c.amount, Net: c.signedAmount }))} filename="cash-flow-movement" /> : undefined}
      >
        {cashFlowQ.data ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">{t('table.cashFlowType')}</th>
                  <th className="py-2 pr-3 font-medium">{t('table.direction')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('table.count')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('table.amount')}</th>
                  <th className="py-2 text-right font-medium">{t('table.net')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashFlowQ.data.categories.map(category => (
                  <tr key={category.key}>
                    <td className="py-3 pr-3 font-medium text-gray-800">{t(`cashFlow.categories.${category.key}`)}</td>
                    <td className="py-3 pr-3 text-gray-600">{t(`cashFlow.directions.${category.direction}`)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-600">{category.count}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-800">{formatVND(category.amount)}</td>
                    <td className="py-3 text-right tabular-nums text-gray-800">{formatVND(category.signedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>

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

      <ExportPreviewModal
        isOpen={employeeExport.previewOpen}
        onClose={employeeExport.closePreview}
        onDownload={employeeExport.handleDownload}
        preview={employeeExport.previewData}
        loading={employeeExport.loading}
        error={employeeExport.error}
      />
    </div>
  );
}
