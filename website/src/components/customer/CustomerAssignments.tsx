/**
 * CustomerAssignments — mirrors the edit form's "Phân công" sidebar on the profile view.
 * Shows branch, sales staff, CSKH, source, and referrer for this customer.
 *
 * @crossref:used-in[CustomerProfile]
 * @crossref:uses[useEmployees, useCustomerSources]
 */

import { Building2, UserRound, Headphones, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEmployees } from '@/hooks/useEmployees';
import type { Employee } from '@/data/mockEmployees';

interface CustomerAssignmentsProps {
  readonly companyName: string | null | undefined;
  readonly salestaffId: string | null | undefined;
  readonly cskhId: string | null | undefined;
  readonly cskhName: string | null | undefined;
  readonly referralUserId: string | null | undefined;
}

function resolveName(
  id: string | null | undefined,
  list: readonly { id: string; name: string }[]
): string | null {
  if (!id) return null;
  return list.find((e) => e.id === id)?.name ?? null;
}

interface AssignmentFieldProps {
  readonly icon: React.ElementType;
  readonly label: string;
  readonly value: string | null | undefined;
}

function AssignmentField({ icon: Icon, label, value }: AssignmentFieldProps) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50/70 border border-gray-200 hover:bg-white hover:border-gray-300 transition-colors min-w-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{label}</div>
        <div className="text-[13px] font-semibold text-gray-900 truncate mt-0.5">
          {value ? value : <span className="text-gray-400 font-normal italic">— Chưa gán</span>}
        </div>
      </div>
    </div>
  );
}

export function CustomerAssignments({
  companyName,
  salestaffId,
  cskhId,
  cskhName,
  referralUserId,
}: CustomerAssignmentsProps) {
  const { t } = useTranslation('customers');
  const { allEmployees } = useEmployees();

  const employeeList = allEmployees as readonly Pick<Employee, 'id' | 'name'>[];

  return (
    <div className="bg-white rounded-xl shadow-card p-5 md:p-6 flex flex-col md:flex-row md:items-stretch gap-5 md:gap-6">
      {/* Left header column */}
      <div className="md:min-w-[180px] md:pr-6 md:border-r border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10.5px] font-bold tracking-[0.12em] text-primary-dark uppercase">PHÂN CÔNG</span>
        </div>
        <h3 className="text-[15px] font-bold text-gray-900">Phân công khách hàng</h3>
        <p className="text-xs text-gray-500 leading-snug mt-1">Thông tin phụ trách khách hàng.</p>
      </div>

      {/* Right grid of 4 fields */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AssignmentField
          icon={Building2}
          label={t('columns.location', { ns: 'customers' })}
          value={companyName}
        />
        <AssignmentField
          icon={UserRound}
          label={t('form.assignTo', { ns: 'customers' })}
          value={resolveName(salestaffId, employeeList)}
        />
        <AssignmentField
          icon={Headphones}
          label={t('assignments', { ns: 'customers' })}
          value={cskhName || resolveName(cskhId, employeeList)}
        />
        <AssignmentField
          icon={Users}
          label="NGƯỜI GIỚI THIỆU"
          value={resolveName(referralUserId, employeeList)}
        />
      </div>
    </div>
  );
}
