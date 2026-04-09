// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Users, Plus, Phone, Mail, MapPin, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import { CustomerProfile } from '@/components/customer';
import { SearchBar } from '@/components/shared/SearchBar';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useLocations } from '@/hooks/useLocations';
import { useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { usePayment } from '@/hooks/usePayment';
import { useDeposits } from '@/hooks/useDeposits';
import type { AppointmentFormData } from '@/components/appointments/AppointmentForm';
import type { PaymentFormData } from '@/components/payment/PaymentForm';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { CustomerService } from '@/types/customer';
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
  ];
}

export function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { selectedLocationId } = useLocationFilter();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showForm]);
  const { hasPermission } = useAuth();
  
  // Check permissions
  const canEditCustomers = hasPermission('customers.edit');
  const canAddCustomers = hasPermission('customers.add');

  const {
    customers,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    createCustomer,
    updateCustomer,
    searchRequired,
    minSearchLength,
  } = useCustomers(selectedLocationId);

  const { allLocations } = useLocations();
  const locationNameMap = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l.name])),
    [allLocations],
  );
  const customerColumns = useMemo(() => buildCustomerColumns(locationNameMap), [locationNameMap]);

  const { profile: hookProfile, appointments: hookAppointments, isLoading: profileLoading, refetch: refetchProfile } =
    useCustomerProfile(selectedCustomerId);

  // Hooks for profile actions
  const { createAppointment, updateAppointment } = useAppointments(selectedLocationId);
  const { createServiceRecord, getRecordsByCustomer } = useServices(selectedLocationId);
  const { createPayment } = usePayment(selectedLocationId);
  const { addDeposit, deposits, loading: depositsLoading, loadDeposits } = useDeposits();

  // Callbacks for CustomerProfile
  const handleCreateAppointment = useCallback(async (data: AppointmentFormData) => {
    await createAppointment({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      locationId: data.locationId,
      locationName: data.locationName,
      appointmentType: 'consultation',
      serviceName: data.serviceName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
    });
  }, [createAppointment]);

  const handleUpdateAppointment = useCallback(async (id: string, data: AppointmentFormData) => {
    await updateAppointment(id, {
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      locationId: data.locationId,
      locationName: data.locationName,
      appointmentType: 'consultation',
      serviceName: data.serviceName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
    });
  }, [updateAppointment]);

  const handleCreateService = useCallback(async (data: {
    catalogItemId: string;
    serviceName: string;
    doctorId: string;
    doctorName: string;
    locationId: string;
    locationName: string;
    startDate: string;
    notes: string;
    totalCost: number;
    toothNumbers: readonly string[];
  }) => {
    await createServiceRecord({
      customerId: selectedCustomerId ?? '',
      customerName: hookProfile?.name ?? '',
      customerPhone: hookProfile?.phone ?? '',
      catalogItemId: data.catalogItemId,
      serviceName: data.serviceName,
      category: 'treatment',
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      locationId: data.locationId,
      locationName: data.locationName,
      totalVisits: 1,
      totalCost: data.totalCost,
      startDate: data.startDate,
      expectedEndDate: data.startDate,
      notes: data.notes,
      toothNumbers: data.toothNumbers,
    });
  }, [createServiceRecord, selectedCustomerId, hookProfile]);

  const handleMakePayment = useCallback(async (data: PaymentFormData) => {
    await createPayment({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      amount: data.amount,
      method: data.method,
      locationName: data.locationName,
      notes: data.notes,
    });
  }, [createPayment]);

  const handleAddDeposit = useCallback(async (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank',
    note?: string
  ) => {
    await addDeposit(customerId, amount, method, note);
    refetchProfile();
  }, [addDeposit, refetchProfile]);

  // Load deposits when a customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      loadDeposits(selectedCustomerId);
    }
  }, [selectedCustomerId, loadDeposits]);

  const handleSubmit = async (data: CustomerFormData) => {
    if (isEditMode && selectedCustomerId) {
      await updateCustomer(selectedCustomerId, data);
      // Refresh the profile so the updated fields (e.g. phone) are reflected immediately
      refetchProfile();
    } else {
      await createCustomer(data);
    }
    setShowForm(false);
    setIsEditMode(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setShowForm(true);
  };

  const getEditFormData = (): Partial<CustomerFormData> | undefined => {
    if (!isEditMode || !selectedCustomerId) return undefined;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return undefined;
    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      gender: customer.gender === 'female' || customer.gender === 'Nữ' || customer.gender === 'f'
        ? 'female'
        : customer.gender
        ? 'male'
        : '',
      companyid: customer.locationId,
      street: customer.street || '',
      note: customer.note || '',
      comment: customer.comment || '',
      // Include source, referral, and assignment fields
      sourceid: customer.sourceid || '',
      referraluserid: '',
      salestaffid: '',
      cskhid: customer.cskhid || '',
    };
  };

  if (selectedCustomerId) {
    const listCustomer = customers.find((c) => c.id === selectedCustomerId);

    let profileData: CustomerProfileData;
    if (hookProfile) {
      profileData = {
        id: hookProfile.id,
        name: hookProfile.name,
        phone: hookProfile.phone,
        email: hookProfile.email,
        dateOfBirth: hookProfile.dateOfBirth,
        gender: hookProfile.gender === 'female' ? 'female' : 'male',
        address: hookProfile.address,
        notes: hookProfile.notes,
        medicalHistory: hookProfile.medicalHistory,
        tags: hookProfile.tags,
        memberSince: hookProfile.memberSince,
        totalVisits: hookProfile.totalVisits,
        lastVisit: hookProfile.lastVisit,
        totalSpent: hookProfile.totalSpent,
        companyId: hookProfile.companyId,
        companyName: hookProfile.companyName || locationNameMap.get(hookProfile.companyId) || 'N/A',
        depositBalance: hookProfile.depositBalance,
        outstandingBalance: hookProfile.outstandingBalance,
      };
    } else {
      profileData = {
        id: listCustomer?.id ?? selectedCustomerId,
        name: listCustomer?.name ?? '',
        phone: listCustomer?.phone ?? '',
        email: listCustomer?.email ?? '',
        dateOfBirth: 'N/A',
        gender: 'male',
        address: 'N/A',
        notes: '',
        medicalHistory: '',
        tags: [],
        memberSince: 'N/A',
        totalVisits: 0,
        totalSpent: 0,
        lastVisit: listCustomer?.lastVisit ?? 'N/A',
        companyId: listCustomer?.locationId ?? '',
        companyName: locationNameMap.get(listCustomer?.locationId ?? '') ?? 'N/A',
        depositBalance: 0,
        outstandingBalance: 0,
      };
    }

    const customerServices: CustomerService[] = selectedCustomerId
      ? getRecordsByCustomer(selectedCustomerId).map((r) => ({
          id: r.id,
          date: r.startDate || r.createdAt || '-',
          service: r.serviceName,
          doctor: r.doctorName || 'N/A',
          cost: r.totalCost,
          status:
            r.status === 'completed'
              ? 'completed'
              : r.status === 'active'
              ? 'in-progress'
              : 'planned',
          tooth: r.toothNumbers?.join(', ') || '-',
          notes: r.notes || '',
        }))
      : [];

    if (profileLoading) {
      return <div className="flex items-center justify-center h-64"><span className="text-gray-500">Loading profile...</span></div>;
    }

    return (
      <>
        <CustomerProfile
          profile={profileData}
          appointments={hookAppointments}
          services={customerServices}
          depositTransactions={deposits}
          onBack={() => setSelectedCustomerId(null)}
          onEdit={canEditCustomers ? handleEdit : undefined}
          onAddDeposit={handleAddDeposit}
          onCreateAppointment={handleCreateAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onCreateService={handleCreateService}
          onMakePayment={handleMakePayment}
          loadingDeposits={depositsLoading}
        />
        {showForm && isEditMode && (
          <div className="modal-container">
            <div className="modal-content max-w-[1100px] animate-in zoom-in-95 duration-200 flex flex-col">
              <AddCustomerForm
                isEdit={true}
                canEdit={canEditCustomers}
                initialData={getEditFormData()}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setIsEditMode(false); }}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">{stats.total} patients · {stats.active} active</p>
          </div>
        </div>
        {canAddCustomers && (
          <button
            onClick={() => { setIsEditMode(false); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        )}
      </div>

      {showForm && !isEditMode && (
        <div className="modal-container">
          <div className="modal-content max-w-[1100px] animate-in zoom-in-95 duration-200 flex flex-col">
            <AddCustomerForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, phone, or email..." />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Required Message */}
      {searchRequired && !searchTerm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-medium text-amber-900 mb-1">Tìm kiếm để xem khách hàng</h3>
          <p className="text-xs text-amber-700">
            Nhập ít nhất {minSearchLength} ký tự để tìm kiếm khách hàng
          </p>
        </div>
      )}

      {/* Customer Table - only show when not in search required mode or has results */}
      {(!searchRequired || searchTerm.length >= minSearchLength) && (
        <DataTable<Customer>
          columns={customerColumns}
          data={customers}
          keyExtractor={(row) => row.id}
          pageSize={10}
          onRowClick={(row) => setSelectedCustomerId(row.id)}
          emptyMessage="No customers found"
        />
      )}
    </div>
  );
}
