import { Mail, Phone, MapPin, Calendar, X, Users } from 'lucide-react';
import {
  TIER_LABELS,
  TIER_STYLES,
  ROLE_LABELS,
  ROLE_STYLES,
  STATUS_BADGE_STYLES,
  type Employee,
} from '@/data/mockEmployees';
import { ScheduleCalendar } from './ScheduleCalendar';
import { LinkedEmployees } from './LinkedEmployees';

/**
 * Employee detail profile panel
 * @crossref:used-in[Employees]
 */

interface EmployeeProfileProps {
  readonly employee: Employee;
  readonly linkedEmployees: readonly Employee[];
  readonly onClose: () => void;
  readonly onSelectLinked: (id: string) => void;
}

const LOCATION_NAMES: Record<string, string> = {
  'loc-1': 'District 1',
  'loc-2': 'District 7',
  'loc-3': 'Thu Duc',
};

export function EmployeeProfile({
  employee,
  linkedEmployees,
  onClose,
  onSelectLinked,
}: EmployeeProfileProps) {
  const statusLabel = employee.status === 'on-leave' ? 'On Leave' : employee.status.charAt(0).toUpperCase() + employee.status.slice(1);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-lg font-bold text-primary">
              {employee.avatar}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{employee.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${TIER_STYLES[employee.tier]}`}>
                  {TIER_LABELS[employee.tier]}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BADGE_STYLES[employee.status]}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Roles */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Roles</h3>
          <div className="flex flex-wrap gap-1.5">
            {employee.roles.map((role) => (
              <span key={role} className={`text-xs px-2.5 py-1 rounded-lg ${ROLE_STYLES[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Contact</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{employee.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{employee.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{LOCATION_NAMES[employee.locationId] ?? employee.locationId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Hired {new Date(employee.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Weekly Schedule</h3>
          <ScheduleCalendar schedule={employee.schedule} />
        </div>

        {/* Linked Employees */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members ({linkedEmployees.length})
          </h3>
          <LinkedEmployees employees={linkedEmployees} onSelect={onSelectLinked} />
        </div>
      </div>
    </div>
  );
}
