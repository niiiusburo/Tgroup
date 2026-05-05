import { useTranslation } from 'react-i18next';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { Edit3, MapPin } from 'lucide-react';
import {
  ROLE_LABELS,
  ROLE_STYLES,
  type Employee,
} from '@/data/mockEmployees';

/**
 * EmployeeTable — tabular employee listing with sorting and pagination
 * @crossref:used-in[Employees]
 * @crossref:uses[DataTable, StatusBadge]
 */

interface EmployeeTableProps {
  readonly employees: readonly Employee[];
  readonly selectedEmployeeId: string | null;
  readonly onSelect: (id: string) => void;
  readonly locationNameMap?: Map<string, string>;
  readonly loading?: boolean;
  readonly locationsLoading?: boolean;
  readonly onEdit?: (id: string) => void;
}


const STATUS_MAP: Record<string, StatusVariant> = {
  active: 'active',
  'on-leave': 'pending',
  inactive: 'inactive',
};

function useColumns(
  locationNameMap?: Map<string, string>,
  locationsLoading = false,
  onEdit?: (id: string) => void,
): readonly Column<Employee>[] {
  const { t } = useTranslation('employees');
  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      width: '240px',
      render: (emp) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {emp.avatar}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{emp.name}</p>
            <p className="text-xs text-gray-500 truncate">{emp.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (emp) => {
        const variant = STATUS_MAP[emp.status] ?? 'inactive';
        const label =
          emp.status === 'on-leave'
            ? 'On Leave'
            : emp.status.charAt(0).toUpperCase() + emp.status.slice(1);
        return <StatusBadge status={variant} label={label} />;
      },
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      width: '110px',
      render: (emp) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
          {emp.tierName || 'No Tier'}
        </span>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (emp) => (
        <div className="flex flex-wrap gap-1">
          {emp.roles.map((role) => (
            <span key={role} className={`text-xs px-2 py-0.5 rounded ${ROLE_STYLES[role]}`}>
              {t(ROLE_LABELS[role])}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'locationId',
      header: 'Location',
      sortable: true,
      width: '160px',
      render: (emp) => {
        if (locationsLoading) {
          return <span className="text-gray-400">Loading locations...</span>;
        }
        const scopeNames = (emp.locationScopeIds || [])
          .filter((id) => id !== emp.locationId)
          .map((id) => locationNameMap?.get(id) || id);
        const branchNames = [emp.locationName || emp.locationId, ...scopeNames];
        return (
          <span className="flex items-start gap-1 text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span className="truncate" title={branchNames.join(', ')}>
              {branchNames.join(', ')}
            </span>
          </span>
        );
      },
    },
    {
      key: 'hireDate',
      header: 'Hired',
      sortable: true,
      width: '110px',
      render: (emp) => (
        <span className="text-gray-600">
          {new Date(emp.hireDate).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  if (onEdit) {
    columns.push({
      key: 'actions',
      header: t('columns.actions', 'Actions'),
      width: '96px',
      render: (emp) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(emp.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          aria-label={t('editEmployeeNamed', { name: emp.name, defaultValue: `Edit employee ${emp.name}` })}
        >
          <Edit3 className="h-3.5 w-3.5" />
          {t('editShort', 'Edit')}
        </button>
      ),
    });
  }

  return columns;
}

export function EmployeeTable({
  employees,
  selectedEmployeeId: _selectedEmployeeId,
  onSelect,
  locationNameMap,
  loading = false,
  locationsLoading = false,
  onEdit,
}: EmployeeTableProps) {
  const columns = useColumns(locationNameMap, locationsLoading, onEdit);
  return (
    <DataTable
      columns={columns}
      data={employees}
      keyExtractor={(emp) => emp.id}
      pageSize={20}
      onRowClick={(emp) => onSelect(emp.id)}
      emptyMessage="No employees match your filters"
      loading={loading}
      loadingMessage="Loading staff..."
    />
  );
}
