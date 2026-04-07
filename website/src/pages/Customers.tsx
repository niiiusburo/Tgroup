import { useState } from 'react';
import { Users, Plus, Phone, Mail, MapPin } from 'lucide-react';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import { CustomerProfile } from '@/components/customer';
import { SearchBar } from '@/components/shared/SearchBar';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterByLocation } from '@/components/shared/FilterByLocation';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { useCustomers } from '@/hooks/useCustomers';
import { MOCK_LOCATIONS } from '@/data/mockDashboard';
import {
  MOCK_CUSTOMER_PROFILE,
  MOCK_CUSTOMER_PHOTOS,
  MOCK_CUSTOMER_DEPOSIT,
  MOCK_APPOINTMENT_HISTORY,
  MOCK_SERVICE_HISTORY,
} from '@/data/mockCustomerProfile';
import type { Customer, CustomerStatus } from '@/data/mockCustomers';
import type { CustomerFormData } from '@/data/mockCustomerForm';

/**
 * Customers Page - Patient records with search, filters, table, and profile view
 * @crossref:route[/customers]
 * @crossref:used-in[App]
 * @crossref:uses[SearchBar, DataTable, FilterByLocation, StatusBadge, useCustomers, CustomerProfile, AddCustomerForm]
 */

const STATUS_FILTER_OPTIONS: readonly { readonly value: 'all' | CustomerStatus; readonly label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
] as const;

const STATUS_TO_VARIANT: Record<CustomerStatus, StatusVariant> = {
  active: 'active',
  inactive: 'inactive',
  pending: 'pending',
};

function getLocationName(locationId: string): string {
  return MOCK_LOCATIONS.find((l) => l.id === locationId)?.name ?? 'Unknown';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** @crossref:uses[DataTable] */
const CUSTOMER_COLUMNS: readonly Column<Customer>[] = [
  {
    key: 'name',
    header: 'Customer',
    sortable: true,
    width: '22%',
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-primary">
            {row.name.charAt(0)}
          </span>
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
        {getLocationName(row.locationId)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '12%',
    render: (row) => (
      <StatusBadge status={STATUS_TO_VARIANT[row.status]} />
    ),
  },
  {
    key: 'lastVisit',
    header: 'Last Visit',
    sortable: true,
    width: '14%',
    render: (row) => (
      <span className="text-gray-500">{formatDate(row.lastVisit)}</span>
    ),
  },
];

export function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const {
    customers,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    locationFilter,
    setLocationFilter,
  } = useCustomers();

  const handleSubmit = (_data: CustomerFormData) => {
    setShowForm(false);
  };

  // Show profile view when a customer is selected
  if (selectedCustomerId) {
    const selected = customers.find((c) => c.id === selectedCustomerId);
    const profileData = selected
      ? { ...MOCK_CUSTOMER_PROFILE, id: selected.id, name: selected.name, phone: selected.phone, email: selected.email }
      : MOCK_CUSTOMER_PROFILE;

    return (
      <CustomerProfile
        profile={profileData}
        photos={MOCK_CUSTOMER_PHOTOS}
        deposit={MOCK_CUSTOMER_DEPOSIT}
        appointments={MOCK_APPOINTMENT_HISTORY}
        services={MOCK_SERVICE_HISTORY}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">
              {stats.total} patients &middot; {stats.active} active
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Add Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <AddCustomerForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, phone, or email..."
          />
        </div>
        <FilterByLocation
          locations={MOCK_LOCATIONS}
          selectedId={locationFilter}
          onChange={setLocationFilter}
        />
        <div className="flex items-center gap-1">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${statusFilter === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      {/* @crossref:uses[DataTable] */}
      <DataTable<Customer>
        columns={CUSTOMER_COLUMNS}
        data={customers}
        keyExtractor={(row) => row.id}
        pageSize={10}
        onRowClick={(row) => setSelectedCustomerId(row.id)}
        emptyMessage="No customers found"
      />
    </div>
  );
}
