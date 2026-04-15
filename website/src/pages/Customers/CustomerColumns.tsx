import { Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import type { Column } from '@/components/shared/DataTable';
import type { Customer } from '@/hooks/useCustomers';
import type { CustomerStatus } from '@/data/mockCustomers';

const STATUS_TO_VARIANT: Record<CustomerStatus, StatusVariant> = {
  active: 'active',
  inactive: 'inactive',
  pending: 'pending',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildCustomerColumns(locationNameMap: Map<string, string>, canSoftDelete: boolean, onSoftDelete: (id: string, name: string) => void): readonly Column<Customer>[] {
  return [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: '10%',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
          {row.code || '-'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      width: '20%',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">{row.name.charAt(0)}</span>
          </div>
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      width: '14%',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          {row.phone}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: false,
      width: '20%',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          {row.email}
        </span>
      ),
    },
    {
      key: 'locationId',
      header: 'Location',
      sortable: true,
      width: '16%',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          {locationNameMap.get(row.locationId) ?? 'Unknown'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '12%',
      render: (row) => <StatusBadge status={STATUS_TO_VARIANT[row.status]} />,
    },
    {
      key: 'lastVisit',
      header: 'Last Visit',
      sortable: true,
      width: '14%',
      render: (row) => <span className="text-gray-500">{formatDate(row.lastVisit)}</span>,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      width: '48px',
      render: (row) => (
        canSoftDelete ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSoftDelete(row.id, row.name); }}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Delete"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null
      ),
    },
  ];
}

