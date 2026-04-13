import { useOutletContext } from 'react-router-dom';
import { UserCog, Stethoscope, Users, Building2 } from 'lucide-react';
import { useReportData, formatNum } from '@/hooks/useReportData';
import { KPICard } from '@/components/reports/KPICard';
import { HorizontalBarList } from '@/components/reports/BarChart';
import { DonutChart } from '@/components/reports/DonutChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

interface EmpData {
  roles: { doctors: number; assistants: number; receptionists: number; total: number };
  byLocation: { location: string; count: number; doctors: number; assistants: number }[];
  employees: { id: string; name: string; isdoctor: boolean; isassistant: boolean; isreceptionist: boolean; jobtitle: string | null; location: string | null; startworkdate: string | null; active: boolean }[];
}

export function ReportsEmployees() {
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data, loading, error, refetch } = useReportData<EmpData>('/Reports/employees/overview', filters);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading employees…</div>;
  if (error) return <ReportError error={error} onRetry={refetch} />;
  if (!data) return <div className="text-center py-12 text-gray-400">No data available</div>;

  const roleSegs = [
    { label: 'Doctors', value: data.roles.doctors, color: '#3B82F6' },
    { label: 'Assistants', value: data.roles.assistants, color: '#10B981' },
    { label: 'Receptionists', value: data.roles.receptionists, color: '#F59E0B' },
    { label: 'Other', value: data.roles.total - data.roles.doctors - data.roles.assistants - data.roles.receptionists, color: '#6B7280' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Employees" value={data.roles.total} format="number" icon={<UserCog className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label="Doctors" value={data.roles.doctors} format="number" icon={<Stethoscope className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label="Assistants" value={data.roles.assistants} format="number" icon={<Users className="w-4 h-4" />} color="violet" delay={2} />
        <KPICard label="Locations" value={data.byLocation.filter(l => l.count > 0).length} format="number" icon={<Building2 className="w-4 h-4" />} color="orange" delay={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Role distribution */}
        <SectionCard title="Role Distribution">
          <DonutChart segments={roleSegs} />
        </SectionCard>

        {/* Staff by location */}
        <SectionCard title="Staff by Location">
          <HorizontalBarList
            items={data.byLocation.filter(l => l.count > 0).map(l => ({ label: l.location || 'Unassigned', value: l.count }))}
            formatValue={formatNum}
            color="bg-blue-500"
          />
        </SectionCard>
      </div>

      {/* Employee table */}
      <SectionCard
        title="Employee Directory"
        action={<ExportCSVButton data={data.employees.map(e => ({ Name: e.name, Role: e.isdoctor ? 'Doctor' : e.isassistant ? 'Assistant' : e.isreceptionist ? 'Receptionist' : 'Other', Title: e.jobtitle || '', Location: e.location || '', StartDate: e.startworkdate || '', Active: e.active ? 'Yes' : 'No' }))} filename="employees" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Name</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Role</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Title</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Location</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Start Date</th>
                <th className="text-center py-3 px-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="py-3 px-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      emp.isdoctor ? 'bg-blue-100 text-blue-700' :
                      emp.isassistant ? 'bg-emerald-100 text-emerald-700' :
                      emp.isreceptionist ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {emp.isdoctor ? 'Doctor' : emp.isassistant ? 'Assistant' : emp.isreceptionist ? 'Receptionist' : 'Other'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{emp.jobtitle || '—'}</td>
                  <td className="py-3 px-3 text-gray-500">{emp.location || '—'}</td>
                  <td className="py-3 px-3 text-gray-500">{emp.startworkdate ? new Date(emp.startworkdate).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex w-2 h-2 rounded-full ${emp.active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
