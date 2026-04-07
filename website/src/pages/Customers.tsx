// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState, useMemo } from 'react';
import { Users, Plus, Phone, Mail, MapPin } from 'lucide-react';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import { CustomerProfile } from '@/components/customer';
import { SearchBar } from '@/components/shared/SearchBar';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useLocations } from '@/hooks/useLocations';
import {
  MOCK_CUSTOMER_PHOTOS,
  MOCK_CUSTOMER_DEPOSIT,
  MOCK_SERVICE_HISTORY,
  type CustomerProfileData,
  type CustomerAppointment,
} from '@/data/mockCustomerProfile';
import type { ApiAppointment } from '@/lib/api';
import type { CustomerStatus } from '@/data/mockCustomers';
import type { CustomerFormData } from '@/data/mockCustomerForm';

/**
 * Customers Page - Patient records with search, filters, table, and profile view
 * @crossref:route[/customers]
 * @crossref:used-in[App]
 * @crossref:uses[SearchBar, DataTable, StatusBadge, useCustomers, CustomerProfile, AddCustomerForm]
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

/** Normalize API gender string to the 'male' | 'female' union */
function normalizeGender(gender: string): 'male' | 'female' {
  const g = gender.toLowerCase();
  if (g === 'female' || g === 'nữ' || g === 'f') return 'female';
  return 'male';
}

/** Map an ApiAppointment to the CustomerAppointment shape the component expects */
function mapApiAppointment(apt: ApiAppointment): CustomerAppointment {
  const time = apt.time ?? apt.datetimeappointment?.slice(11, 16) ?? '00:00';
  const status =
    apt.state === 'cancel' || apt.state === 'cancelled'
      ? 'cancelled'
      : apt.state === 'no_show'
      ? 'no-show'
      : 'completed';
  return {
    id: apt.id,
    date: apt.date.slice(0, 10),
    time,
    doctor: apt.doctorname ?? 'N/A',
    service: apt.name ?? apt.reason ?? 'N/A',
    status,
    location: apt.companyname ?? 'N/A',
    notes: apt.note ?? '',
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** @crossref:uses[DataTable] */
function buildCustomerColumns(locationNameMap: Map<string, string>): readonly Column<Customer>[] {
  return [
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
        {locationNameMap.get(row.locationId) ?? 'Unknown'}
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
  ]; // end buildCustomerColumns
}

export function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { selectedLocationId } = useLocationFilter();

  const {
    customers,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  } = useCustomers(selectedLocationId);

  // Fetch all companies once for location name lookup
  const { allLocations } = useLocations();
  const locationNameMap = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l.name])),
    [allLocations],
  );
  const customerColumns = useMemo(() => buildCustomerColumns(locationNameMap), [locationNameMap]);

  // Fetch real profile data when a customer is selected
  const { profile: hookProfile, appointments: hookAppointments, isLoading: profileLoading } =
    useCustomerProfile(selectedCustomerId);

  const handleSubmit = (_data: CustomerFormData) => {
    setShowForm(false);
  };

  // Show profile view when a customer is selected
  if (selectedCustomerId) {
    // Build CustomerProfileData from hook result, falling back to customer list data
    const listCustomer = customers.find((c) => c.id === selectedCustomerId);

    let profileData: CustomerProfileData;
    if (hookProfile) {
      profileData = {
        id: hookProfile.id,
        name: hookProfile.name,
        phone: hookProfile.phone,
        email: hookProfile.email,
        dateOfBirth: hookProfile.dateOfBirth,
        gender: normalizeGender(hookProfile.gender),
        address: hookProfile.address,
        locationId: hookProfile.companyId,
        locationName: hookProfile.companyName || locationNameMap.get(hookProfile.companyId) || 'N/A',
        memberSince: hookProfile.memberSince,
        totalVisits: hookProfile.totalVisits,
        totalSpent: hookProfile.totalSpent,
        lastVisit: hookProfile.lastVisit,
        notes: hookProfile.notes,
        tags: hookProfile.tags,
      };
    } else {
      // While loading or on error, build from list data
      profileData = {
        id: listCustomer?.id ?? selectedCustomerId,
        name: listCustomer?.name ?? '',
        phone: listCustomer?.phone ?? '',
        email: listCustomer?.email ?? '',
        dateOfBirth: 'N/A',
        gender: 'male',
        address: 'N/A',
        locationId: listCustomer?.locationId ?? '',
        locationName: locationNameMap.get(listCustomer?.locationId ?? '') ?? 'N/A',
        memberSince: 'N/A',
        totalVisits: 0,
        totalSpent: 0,
        lastVisit: listCustomer?.lastVisit ?? 'N/A',
        notes: '',
        tags: [],
      };
    }

    // Map real appointments to component format
    const appointments = hookAppointments.map(mapApiAppointment);

    if (profileLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <span className="text-gray-500">Loading profile...</span>
        </div>
      );
    }

    return (
      <CustomerProfile
        profile={profileData}
        photos={MOCK_CUSTOMER_PHOTOS}
        deposit={MOCK_CUSTOMER_DEPOSIT}
        appointments={appointments}
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
        columns={customerColumns}
        data={customers}
        keyExtractor={(row) => row.id}
        pageSize={10}
        onRowClick={(row) => setSelectedCustomerId(row.id)}
        emptyMessage="No customers found"
      />
    </div>
  );
}
