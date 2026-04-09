import { MapPin, Clock } from 'lucide-react';
import {
  TIER_LABELS,
  TIER_STYLES,
  ROLE_LABELS,
  ROLE_STYLES,
  STATUS_BADGE_STYLES,
  type Employee,
} from '@/data/mockEmployees';

/**
 * Employee card for the grid listing
 * @crossref:used-in[Employees]
 */

interface EmployeeCardProps {
  readonly employee: Employee;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}

const LOCATION_NAMES: Record<string, string> = {
  'loc-1': 'District 1',
  'loc-2': 'District 7',
  'loc-3': 'Thu Duc',
};

export function EmployeeCard({ employee, isSelected, onSelect }: EmployeeCardProps) {
  const workDays = employee.schedule.length;
  const statusLabel = employee.status === 'on-leave' ? 'On Leave' : employee.status.charAt(0).toUpperCase() + employee.status.slice(1);

  return (
    <button
      onClick={() => onSelect(employee.id)}
      className={`w-full text-left bg-white rounded-xl p-5 shadow-card card-hover ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {employee.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{employee.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full ${
              employee.status === 'active' ? 'bg-green-500' :
              employee.status === 'on-leave' ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BADGE_STYLES[employee.status]}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Tier badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${TIER_STYLES[employee.tier]}`}>
          {TIER_LABELS[employee.tier]}
        </span>
      </div>

      {/* Roles */}
      <div className="flex flex-wrap gap-1 mb-3">
        {employee.roles.map((role) => (
          <span key={role} className={`text-xs px-2 py-0.5 rounded ${ROLE_STYLES[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {LOCATION_NAMES[employee.locationId] ?? employee.locationId}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {workDays} days/week
        </span>
      </div>
    </button>
  );
}
