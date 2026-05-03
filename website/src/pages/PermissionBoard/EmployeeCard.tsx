import type { PermissionGroup, EmployeePermission } from '@/lib/api';
import { getInitials, getRoleLabel } from './constants';

interface EmployeeCardProps {
  emp: EmployeePermission;
  group: PermissionGroup | undefined;
  effectiveCount: number;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export function EmployeeCard({ emp, group, effectiveCount, isSelected, isDimmed, onClick }: EmployeeCardProps) {
  const initials = getInitials(emp.employeeName);
  const locLabel = emp.locScope === 'all'
    ? 'All Locations'
    : emp.locations.map(l => l.name).join(', ') || 'No locations';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-px border-2"
      style={{
        opacity: isDimmed ? 0.35 : 1,
        borderColor: isSelected ? '#3b82f6' : group ? group.color + '40' : '#e5e7eb',
        background: isSelected ? '#eff6ff' : '#fff',
        boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.15)' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
          style={{ background: group?.color || '#94a3b8' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] text-gray-900 truncate">{emp.employeeName}</div>
          {emp.employeeEmail && (
            <div className="text-[11px] text-gray-500 truncate">{emp.employeeEmail}</div>
          )}
          <div className="text-[11px] text-gray-400">{getRoleLabel(emp)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {group && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: `${group.color}18`, color: group.color }}
          >
            {group.name}
          </span>
        )}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${emp.locScope === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {locLabel}
        </span>
        {effectiveCount !== (group?.permissions.length ?? 0) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
            {effectiveCount} effective
          </span>
        )}
      </div>
    </button>
  );
}
