import { useOutletContext } from 'react-router-dom';
import { DollarSign, Calendar, Users, AlertTriangle } from 'lucide-react';
import { useReportData } from '@/hooks/useReportData';
import { KPICard } from '@/components/reports/KPICard';
import { BarChart } from '@/components/reports/BarChart';
import { ProgressRing } from '@/components/reports/DonutChart';
import { SectionCard } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';
import { formatVND, formatNum } from '@/hooks/useReportData';

interface DashboardData {
  revenue: { invoiced: number; paid: number; outstanding: number; change: number | null };
  appointments: { total: number; done: number; cancelled: number; change: number | null };
  customers: { newCustomers: number };
  trend: { month: string; revenue: number; invoiced: number }[];
}

export function ReportsDashboard() {
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data, loading, error, refetch } = useReportData<DashboardData>('/Reports/dashboard', filters);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading dashboard…</div>;
  if (error) return <ReportError error={error} onRetry={refetch} />;
  if (!data) return <div className="text-center py-12 text-gray-400">No data available</div>;


  const months = data.trend.map(t => {
    const d = new Date(t.month);
    return { label: d.toLocaleDateString('en', { month: 'short' }), value: t.revenue };
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Revenue Collected" value={data.revenue.paid} format="currency" change={data.revenue.change} icon={<DollarSign className="w-4 h-4" />} color="emerald" delay={0} />
        <KPICard label="Appointments" value={data.appointments.total} format="number" change={data.appointments.change} icon={<Calendar className="w-4 h-4" />} color="blue" delay={1} />
        <KPICard label="New Customers" value={data.customers.newCustomers} format="number" icon={<Users className="w-4 h-4" />} color="violet" delay={2} />
        <KPICard label="Outstanding" value={data.revenue.outstanding} format="currency" icon={<AlertTriangle className="w-4 h-4" />} color="amber" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue trend chart */}
        <SectionCard title="12-Month Revenue Trend" className="lg:col-span-2">
          <BarChart data={months} formatValue={formatVND} color="bg-emerald-500" height={220} />
        </SectionCard>

        {/* Completion rings */}
        <SectionCard title="Appointment Rates">
          <div className="flex items-center justify-around py-4">
            <ProgressRing
              value={data.appointments.total > 0 ? (data.appointments.done / data.appointments.total * 100) : 0}
              label="Completion"
              color="#10B981"
            />
            <ProgressRing
              value={data.revenue.invoiced > 0 ? (data.revenue.paid / data.revenue.invoiced * 100) : 0}
              label="Collection"
              color="#3B82F6"
            />
          </div>
        </SectionCard>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="text-xs text-gray-500 mb-1">Invoiced</div>
          <div className="text-xl font-bold text-gray-900">{formatVND(data.revenue.invoiced)}</div>
          <div className="text-xs text-gray-400 mt-1">{formatNum(data.appointments.done)} appointments completed</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="text-xs text-gray-500 mb-1">Collected</div>
          <div className="text-xl font-bold text-emerald-600">{formatVND(data.revenue.paid)}</div>
          <div className="text-xs text-gray-400 mt-1">{data.revenue.invoiced > 0 ? (data.revenue.paid / data.revenue.invoiced * 100).toFixed(1) : 0}% collection rate</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="text-xs text-gray-500 mb-1">Outstanding</div>
          <div className="text-xl font-bold text-amber-600">{formatVND(data.revenue.outstanding)}</div>
          <div className="text-xs text-gray-400 mt-1">{data.appointments.cancelled} cancellations</div>
        </div>
      </div>
    </div>
  );
}
