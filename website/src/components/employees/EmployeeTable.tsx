import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { MapPin } from 'lucide-react';
import {
  TIER_LABELS,
  TIER_STYLES,
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
}


const STATUS_MAP: Record<string, StatusVariant> = {
  active: 'active',
  'on-leave': 'pending',
  inactive: 'inactive',
};

const columns: readonly Column<Employee>[] = [
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
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${TIER_STYLES[emp.tier]}`}>
        {TIER_LABELS[emp.tier]}
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
            {ROLE_LABELS[role]}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: 'locationId',
    header: 'Location',
    sortable: true,
    width: '130px',
    render: (emp) => (
      <span className="flex items-center gap-1 text-gray-600">
        <MapPin className="w-3.5 h-3.5 text-gray-400" />
        {emp.locationName || emp.locationId}
      </span>
    ),
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

export function EmployeeTable({
  employees,
  onSelect,
}: EmployeeTableProps) {
  return (
    <DataTable
      columns={columns}
      data={employees}
      keyExtractor={(emp) => emp.id}
      pageSize={8}
      onRowClick={(emp) => onSelect(emp.id)}
      emptyMessage="No employees match your filters"
    />
  );
}
