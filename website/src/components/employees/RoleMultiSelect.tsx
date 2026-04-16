import { ALL_ROLES, ROLE_LABELS, ROLE_STYLES, type EmployeeRole } from '@/data/mockEmployees';

/**
 * Multi-select for employee roles with toggle chips
 * Note: Database only has dentist, assistant, receptionist flags
 * @crossref:used-in[EmployeeForm, Settings]
 */

interface RoleMultiSelectProps {
  readonly value: EmployeeRole | 'all';
  readonly onChange: (role: EmployeeRole | 'all') => void;
  readonly showAll?: boolean;
  readonly counts?: Record<EmployeeRole | 'all', number>;
}

export function RoleMultiSelect({ value, onChange, showAll = true, counts }: RoleMultiSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {showAll && (
        <button
          onClick={() => onChange('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Roles
          {counts && <span className="ml-1.5 text-xs opacity-80">({counts['all']})</span>}
        </button>
      )}
      {ALL_ROLES.map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === role
              ? ROLE_STYLES[role]
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {ROLE_LABELS[role]}
          {counts && <span className="ml-1.5 text-xs opacity-80">({counts[role]})</span>}
        </button>
      ))}
    </div>
  );
}
