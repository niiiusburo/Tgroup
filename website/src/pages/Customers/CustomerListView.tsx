import { Users, Plus, Search } from 'lucide-react';
import type { Customer } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { DataTable } from '@/components/shared/DataTable';
import type { Column } from '@/components/shared/DataTable';
import { DeleteDialog } from './DeleteDialog';
import type { CustomerStatus } from '@/data/mockCustomers';

interface CustomerListViewProps {
  readonly customers: readonly Customer[];
  readonly columns: readonly Column<Customer>[];
  readonly stats: { total: number; active: number };
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly loading: boolean;
  readonly onPageChange: (page: number) => void;
  readonly searchTerm: string;
  readonly onSearchChange: (v: string) => void;
  readonly searchPlaceholder: string;
  readonly statusFilter: 'all' | CustomerStatus;
  readonly onStatusFilterChange: (v: 'all' | CustomerStatus) => void;
  readonly searchRequired: boolean;
  readonly minSearchLength: number;
  readonly canAddCustomers: boolean;
  readonly onAddCustomer: () => void;
  readonly onRowClick: (row: Customer) => void;
  readonly emptyMessage: string;
  readonly deleteDialog: {
    open: boolean;
    customerId: string | null;
    customerName: string;
    mode: 'soft' | 'hard';
  } | null;
  readonly linkedCounts: { appointments: number; saleorders: number; dotkhams: number } | null;
  readonly deleteError: string | null;
  readonly deleteLoading: boolean;
  readonly onDeleteCancel: () => void;
  readonly onDeleteConfirm: () => void;
  readonly t: (key: string, options?: { ns?: string }) => string;
}

const STATUS_OPTIONS: readonly { value: 'all' | CustomerStatus; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export function CustomerListView({
  customers,
  columns,
  stats,
  page,
  pageSize,
  totalItems,
  loading,
  onPageChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  onStatusFilterChange,
  searchRequired,
  minSearchLength,
  canAddCustomers,
  onAddCustomer,
  onRowClick,
  emptyMessage,
  deleteDialog,
  linkedCounts,
  deleteError,
  deleteLoading,
  onDeleteCancel,
  onDeleteConfirm,
  t,
}: CustomerListViewProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={loading ? 'Loading patients...' : `${stats.total} patients · ${stats.active} active`}
        icon={<Users className="w-6 h-6 text-primary" />}
        actions={
          canAddCustomers && (
            <button
              onClick={onAddCustomer}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusFilterChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {searchRequired && !searchTerm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-medium text-amber-900 mb-1">
            {t('searchToView')}
          </h3>
          <p className="text-xs text-amber-700">{minSearchLength}</p>
        </div>
      )}

      {(!searchRequired || searchTerm.length >= minSearchLength) && (
        <DataTable<Customer>
          columns={columns}
          data={customers}
          keyExtractor={(row) => row.id}
          pageSize={pageSize}
          totalItems={totalItems}
          currentPage={page}
          onPageChange={onPageChange}
          onRowClick={onRowClick}
          emptyMessage={emptyMessage}
          loading={loading}
          loadingMessage="Loading patients..."
        />
      )}

      <DeleteDialog
        open={deleteDialog?.open ?? false}
        customerId={deleteDialog?.customerId ?? null}
        customerName={deleteDialog?.customerName ?? ''}
        mode={deleteDialog?.mode ?? 'soft'}
        linkedCounts={linkedCounts}
        error={deleteError}
        loading={deleteLoading}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
