import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, X, Users, Pencil, Loader2, Building2 } from 'lucide-react';
import {
  TIER_LABELS,
  TIER_STYLES,
  ROLE_LABELS,
  ROLE_STYLES,
  STATUS_BADGE_STYLES,
  type Employee,
} from '@/data/mockEmployees';
import { fetchCompanies, type ApiCompany } from '@/lib/api';

/**
 * Employee detail profile panel — personal info, stats, linked data
 * @crossref:used-in[Employees]
 * @crossref:uses[fetchCompanies]
 */


interface EmployeeProfileProps {
  readonly employee: Employee;
  readonly linkedEmployees: readonly Employee[];
  readonly onClose: () => void;
  readonly onSelectLinked: (id: string) => void;
  readonly onEdit?: () => void;
}

export function EmployeeProfile({
  employee,
  linkedEmployees,
  onClose,
  onSelectLinked,
  onEdit,
}: EmployeeProfileProps) {
  const [locations, setLocations] = useState<ApiCompany[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Load locations for name lookup
  useEffect(() => {
    fetchCompanies()
      .then((res) => {
        setLocations(res.items);
        setLoadingLocations(false);
      })
      .catch(() => {
        setLoadingLocations(false);
      });
  }, []);

  const getLocationName = (locationId: string): string => {
    if (!locationId) return 'No Location';
    const location = locations.find((l) => l.id === locationId);
    return location?.name ?? locationId;
  };

  const statusLabel = employee.status === 'on-leave' ? 'On Leave' : employee.status.charAt(0).toUpperCase() + employee.status.slice(1);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-lg font-bold text-primary">
              {employee.avatar || employee.name.substring(0, 2).toUpperCase()}
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
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                title="Edit employee"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
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
            {employee.roles.length === 0 && (
              <span className="text-xs text-gray-400">No roles assigned</span>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Contact</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{employee.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{employee.phone || 'No phone'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>
              {loadingLocations ? (
                <span className="flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                getLocationName(employee.locationId)
              )}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span>
              {loadingLocations ? (
                <span className="flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                (employee.locationScopeIds || []).length > 0
                  ? (employee.locationScopeIds || [])
                      .filter((id) => id !== employee.locationId)
                      .map((id) => getLocationName(id))
                      .join(', ')
                  : 'Không có chi nhánh phụ'
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>
              {employee.hireDate
                ? `Hired ${new Date(employee.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'No hire date'}
            </span>
          </div>
        </div>

        {/* Team Members */}
        {linkedEmployees.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members ({linkedEmployees.length})
            </h3>
            <div className="space-y-2">
              {linkedEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => onSelectLinked(emp.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {emp.avatar || emp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.locationName || 'No location'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
