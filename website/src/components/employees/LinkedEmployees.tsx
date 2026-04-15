import { Users } from 'lucide-react';
import { ROLE_LABELS, type Employee } from '@/data/mockEmployees';

/**
 * Shows team relationships for an employee
 * @crossref:used-in[EmployeeProfile, Relationships]
 */

interface LinkedEmployeesProps {
  readonly employees: readonly Employee[];
  readonly onSelect: (id: string) => void;
}

export function LinkedEmployees({ employees, onSelect }: LinkedEmployeesProps) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No linked team members</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {employees.map((emp) => (
        <button
          key={emp.id}
          onClick={() => onSelect(emp.id)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {emp.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {emp.roles.map((r) => ROLE_LABELS[r]).join(', ')}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-medium shrink-0 bg-purple-100 text-purple-700">
            {emp.tierName || 'No Tier'}
          </span>
        </button>
      ))}
    </div>
  );
}
