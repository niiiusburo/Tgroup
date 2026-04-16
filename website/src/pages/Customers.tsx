// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Search } from 'lucide-react';
import { softDeletePartner, hardDeletePartner, registerFace, fetchDotKhams } from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import { CustomerProfile } from '@/components/customer';
import { SearchBar } from '@/components/shared/SearchBar';
import { DataTable } from '@/components/shared/DataTable';
import { useCustomers, type Customer } from '@/hooks/useCustomers';

import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useLocations } from '@/hooks/useLocations';
import { useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { useDeposits } from '@/hooks/useDeposits';
import { useCustomerPayments } from '@/hooks/useCustomerPayments';
import { useExternalCheckups } from '@/hooks/useExternalCheckups';
import type { AppointmentFormData } from '@/components/appointments/AppointmentForm';
import type { PaymentFormData } from '@/components/payment/PaymentForm';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { ProfileTab } from '@/components/customer/CustomerProfile';
import type { CustomerService } from '@/types/customer';
import type { CustomerStatus } from '@/data/mockCustomers';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import type { ApiDotKham } from '@/lib/api';
import { buildCustomerColumns } from './Customers/CustomerColumns';

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

export function Customers() {
  const { t } = useTranslation('customers');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(id ?? null);
  const [profileTab, setProfileTab] = useState<ProfileTab>('profile');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; customerId: string | null; customerName: string; mode: 'soft' | 'hard' } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showForm]);
  // Sync selected customer with URL param for deep-linking
  useEffect(() => {
    setSelectedCustomerId(id ?? null);
  }, [id]);

  // Reset profile tab when switching customers or returning to list
  useEffect(() => {
    setProfileTab('profile');
  }, [selectedCustomerId]);

  const { hasPermission } = useAuth();
  
  // Check permissions
  const canEditCustomers = hasPermission('customers.edit');
  const canAddCustomers = hasPermission('customers.add');
  const canSoftDelete = hasPermission('customers.delete');
  const canHardDelete = hasPermission('customers.hard_delete');

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
  // Load customers across all locations so staff can search by name/phone
  // regardless of the global clinic filter.
  } = useCustomers(undefined);

  const { allLocations } = useLocations();
  const locationNameMap = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l.name])),
    [allLocations],
  );
  const customerColumns = useMemo(() => buildCustomerColumns(locationNameMap, canSoftDelete, (id, name) => {
    setDeleteDialog({ open: true, customerId: id, customerName: name, mode: 'soft' });
  }), [locationNameMap, canSoftDelete]);

  const { profile: hookProfile, rawPartner, appointments: hookAppointments, linkedCounts, isLoading: profileLoading, refetch: refetchProfile } =
    useCustomerProfile(selectedCustomerId);

  // Hooks for profile actions (fetch across all locations — a customer's history
  // should never be hidden by the global clinic filter).
  const { createAppointment, updateAppointment } = useAppointments(undefined);
  // Fetch service records without location filter so the customer profile shows
  // treatment history across all locations (not just the currently selected one).
  const { createServiceRecord, updateServiceRecord, getRecordsByCustomer, updateServiceStatus, refetch: refetchServices } = useServices(undefined, selectedCustomerId ?? undefined);
  const {
    depositList,
    usageHistory,
    balance: depositBalanceData,
    loading: depositsLoading,
    loadDeposits,
    addDeposit,
    addRefund,
    voidDeposit,
    removeDeposit,
    editDeposit,
  } = useDeposits();
  const { payments: customerPayments, isLoading: paymentsLoading, addPayment, refetch: refetchPayments, deletePaymentById } = useCustomerPayments(selectedCustomerId);

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
    doctorId: string | null;
    doctorName: string;
    assistantId?: string | null;
    assistantName?: string;
    dentalAideId?: string | null;
    dentalAideName?: string;
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
      assistantId: data.assistantId ?? null,
      assistantName: data.assistantName ?? '',
      dentalAideId: data.dentalAideId ?? null,
      dentalAideName: data.dentalAideName ?? '',
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

  const handleUpdateService = useCallback(async (data: {
    id: string;
    catalogItemId: string;
    serviceName: string;
    doctorId: string | null;
    doctorName: string;
    assistantId?: string | null;
    assistantName?: string;
    dentalAideId?: string | null;
    dentalAideName?: string;
    locationId: string;
    locationName: string;
    startDate: string;
    notes: string;
    totalCost: number;
    toothNumbers: readonly string[];
  }) => {
    await updateServiceRecord({
      id: data.id,
      customerId: selectedCustomerId ?? '',
      customerName: hookProfile?.name ?? '',
      customerPhone: hookProfile?.phone ?? '',
      catalogItemId: data.catalogItemId,
      serviceName: data.serviceName,
      category: 'treatment',
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      assistantId: data.assistantId ?? null,
      assistantName: data.assistantName ?? '',
      dentalAideId: data.dentalAideId ?? null,
      dentalAideName: data.dentalAideName ?? '',
      locationId: data.locationId,
      locationName: data.locationName,
      totalVisits: 1,
      totalCost: data.totalCost,
      startDate: data.startDate,
      expectedEndDate: data.startDate,
      notes: data.notes,
      toothNumbers: data.toothNumbers,
    });
  }, [updateServiceRecord, selectedCustomerId, hookProfile]);

  const handleMakePayment = useCallback(async (data: PaymentFormData) => {
    await addPayment({
      customerId: data.customerId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      paymentDate: data.paymentDate,
      referenceCode: data.referenceCode,
      depositUsed: data.sources?.depositAmount,
      cashAmount: data.sources?.cashAmount,
      bankAmount: data.sources?.bankAmount,
      allocations: data.allocations?.map((a) => ({
        invoice_id: a.invoiceId,
        dotkham_id: a.dotkhamId,
        allocated_amount: a.allocatedAmount,
      })),
    });
    refetchProfile();
    refetchPayments();
    loadDeposits(data.customerId);
    refetchServices();
  }, [addPayment, refetchProfile, refetchPayments, loadDeposits, refetchServices]);

  const handleAddDeposit = useCallback(async (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank_transfer' | 'vietqr',
    date?: string,
    note?: string
  ) => {
    await addDeposit(customerId, amount, method, date, note);
    refetchProfile();
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [addDeposit, refetchProfile, selectedCustomerId, loadDeposits]);

  const handleAddRefund = useCallback(async (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank_transfer',
    date?: string,
    note?: string
  ) => {
    await addRefund(customerId, amount, method, date, note);
    refetchProfile();
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [addRefund, refetchProfile, selectedCustomerId, loadDeposits]);

  const handleVoidDeposit = useCallback(async (id: string) => {
    await voidDeposit(id);
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [voidDeposit, selectedCustomerId, loadDeposits]);

  const handleDeleteDeposit = useCallback(async (id: string) => {
    await removeDeposit(id);
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [removeDeposit, selectedCustomerId, loadDeposits]);

  const handleEditDeposit = useCallback(async (id: string, data: Partial<{ amount: number; method: 'cash' | 'bank_transfer'; notes: string; paymentDate: string }>) => {
    await editDeposit(id, data);
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [editDeposit, selectedCustomerId, loadDeposits]);

  const handleRefreshDeposits = useCallback(() => {
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [selectedCustomerId, loadDeposits]);

  // Load deposits when a customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      loadDeposits(selectedCustomerId);
    }
  }, [selectedCustomerId, loadDeposits]);

  // Load dotkhams (examination rounds) when a customer is selected
  useEffect(() => {
    if (!selectedCustomerId) {
      setDotKhams([]);
      return;
    }
    fetchDotKhams({ partnerId: selectedCustomerId, limit: 500 })
      .then((res) => setDotKhams(res.items))
      .catch((err) => {
        console.error('Failed to load dotkhams:', err);
        setDotKhams([]);
      });
  }, [selectedCustomerId]);

  const [createdCustomerCode, setCreatedCustomerCode] = useState<string | null>(null);
  const [pendingFaceImage, setPendingFaceImage] = useState<Blob | null>(null);
  const [dotKhams, setDotKhams] = useState<ApiDotKham[]>([]);

  useEffect(() => {
    if (!showForm) {
      setPendingFaceImage(null);
    }
  }, [showForm]);

  const handleSubmit = async (data: CustomerFormData) => {
    if (isEditMode && selectedCustomerId) {
      await updateCustomer(selectedCustomerId, data);
      refetchProfile();
      setShowForm(false);
      setIsEditMode(false);
    } else {
      const created = await createCustomer(data);
      if (pendingFaceImage) {
        try {
          await registerFace(created.id, pendingFaceImage);
        } catch (err) {
          console.error('Post-save face registration failed:', err);
        }
        setPendingFaceImage(null);
      }
      setCreatedCustomerCode(created.code ?? null);
      setShowForm(false);
      setIsEditMode(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setShowForm(true);
  };

  const getEditFormData = (): Partial<CustomerFormData> | undefined => {
    if (!isEditMode || !selectedCustomerId) return undefined;
    // Prefer raw partner data (has all fields) over the summarised profile
    if (rawPartner) {
      const g = rawPartner.gender ?? '';
      return {
        name: rawPartner.name,
        phone: rawPartner.phone ?? '',
        email: rawPartner.email ?? '',
        gender: g === 'female' || g === 'Nữ' || g === 'f' ? 'female' : g ? 'male' : '',
        companyid: rawPartner.companyid ?? '',
        street: rawPartner.street ?? '',
        // API aliases cityname→city, districtname→district, wardname→ward
        cityname: rawPartner.city ?? '',
        districtname: rawPartner.district ?? '',
        wardname: rawPartner.ward ?? '',
        note: rawPartner.note ?? '',
        comment: rawPartner.comment ?? '',
        medicalhistory: rawPartner.medicalhistory ?? '',
        birthday: rawPartner.birthday ?? null,
        birthmonth: rawPartner.birthmonth ?? null,
        birthyear: rawPartner.birthyear ?? null,
        referraluserid: rawPartner.referraluserid ?? '',
        salestaffid: rawPartner.salestaffid ?? '',
        cskhid: rawPartner.cskhid ?? '',
        weight: rawPartner.weight ?? null,
        identitynumber: rawPartner.identitynumber ?? '',
        healthinsurancecardnumber: rawPartner.healthinsurancecardnumber ?? '',
        emergencyphone: rawPartner.emergencyphone ?? '',
        jobtitle: rawPartner.jobtitle ?? '',
        taxcode: rawPartner.taxcode ?? '',
        unitname: rawPartner.unitname ?? '',
        unitaddress: rawPartner.unitaddress ?? '',
        isbusinessinvoice: rawPartner.isbusinessinvoice ?? false,
        personalname: rawPartner.personalname ?? '',
        personalidentitycard: rawPartner.personalidentitycard ?? '',
        personaltaxcode: rawPartner.personaltaxcode ?? '',
        personaladdress: rawPartner.personaladdress ?? '',
        ref: rawPartner.code ?? '',
      };
    }
    // Fallback to summarised profile
    if (hookProfile) {
      return {
        name: hookProfile.name,
        phone: hookProfile.phone,
        email: hookProfile.email,
        gender: hookProfile.gender === 'female' || hookProfile.gender === 'Nữ' || hookProfile.gender === 'f'
          ? 'female'
          : hookProfile.gender && hookProfile.gender !== 'N/A'
          ? 'male'
          : '',
        companyid: hookProfile.companyId,
        street: hookProfile.address !== 'N/A' ? hookProfile.address.split(', ')[0] || '' : '',
        note: hookProfile.notes || '',
        comment: '',
        medicalhistory: hookProfile.medicalHistory || '',
        referraluserid: '',
        salestaffid: '',
        cskhid: '',
        ref: hookProfile.code || '',
      };
    }
    // Fallback to paginated customers list
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
      referraluserid: '',
      salestaffid: '',
      cskhid: customer.cskhid || '',
      ref: customer.code || '',
    };
  };

  const getCustomerCode = (): string | null | undefined => {
    if (!selectedCustomerId) return undefined;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    return customer?.code;
  };

  const customerCode = getCustomerCode();
  const { data: checkupData, isLoading: checkupsLoading, error: checkupsError, refetch: refetchCheckups } = useExternalCheckups(customerCode);

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unexpected error';
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog?.customerId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      if (deleteDialog.mode === 'hard') {
        await hardDeletePartner(deleteDialog.customerId);
      } else {
        await softDeletePartner(deleteDialog.customerId);
      }
      setDeleteDialog(null);
      navigate('/customers');
      refetchProfile();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 409) {
        setDeleteError('Khách hàng này đang có lịch hẹn, điều trị hoặc thanh toán liên quan. Vui lòng xóa các dữ liệu liên quan trước.');
      } else {
        setDeleteError(getErrorMessage(err));
      }
    } finally {
      setDeleteLoading(false);
    }
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
        code: getCustomerCode() ?? '',
        depositBalance: hookProfile.depositBalance,
        outstandingBalance: hookProfile.outstandingBalance,
        salestaffid: hookProfile.salestaffid,
        cskhid: hookProfile.cskhid,
        cskhname: hookProfile.cskhname,
        referraluserid: hookProfile.referraluserid,
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
        code: listCustomer?.code ?? '',
        depositBalance: 0,
        outstandingBalance: 0,
        salestaffid: null,
        cskhid: null,
        cskhname: null,
        referraluserid: null,
      };
    }

    const saleServices: CustomerService[] = selectedCustomerId
      ? getRecordsByCustomer(selectedCustomerId).map((r) => ({
          id: r.id,
          date: r.startDate || r.createdAt || '-',
          service: r.serviceName,
          doctor: r.doctorName || 'N/A',
          doctorId: r.doctorId,
          assistantId: r.assistantId,
          assistantName: r.assistantName,
          dentalAideId: r.dentalAideId,
          dentalAideName: r.dentalAideName,
          catalogItemId: r.catalogItemId,
          cost: r.totalCost,
          status:
            r.status === 'completed'
              ? 'completed'
              : r.status === 'cancelled'
              ? 'cancelled'
              : 'active',
          tooth: r.toothNumbers?.join(', ') || '-',
          notes: r.notes || '',
          orderName: r.orderName,
          orderCode: r.orderCode,
          paidAmount: r.paidAmount,
          residual: r.residual ?? Math.max(0, (r.totalCost ?? 0) - (r.paidAmount ?? 0)),
        }))
      : [];

    const dotkhamServices: CustomerService[] = dotKhams.map((dk) => {
      const cost = parseFloat(dk.totalamount || '0') || 0;
      const residual = parseFloat(dk.amountresidual || '0') || 0;
      const status =
        dk.state === 'done' || dk.state === 'completed'
          ? 'completed'
          : dk.state === 'cancel' || dk.state === 'cancelled'
          ? 'cancelled'
          : 'active';
      return {
        id: dk.id,
        date: dk.date ? dk.date.slice(0, 10) : '-',
        service: dk.name || 'Đợt khám',
        doctor: dk.doctorname || 'N/A',
        doctorId: dk.doctorid || '',
        assistantId: dk.assistantid,
        assistantName: dk.assistantname || undefined,
        dentalAideId: dk.assistantsecondaryid,
        dentalAideName: dk.assistantsecondaryname || undefined,
        catalogItemId: '',
        cost,
        status,
        tooth: '-',
        notes: dk.note || '',
        orderName: dk.name || undefined,
        paidAmount: Math.max(0, cost - residual),
        residual,
        locationName: dk.companyname || undefined,
      };
    });

    const customerServices: CustomerService[] = [...saleServices, ...dotkhamServices].sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    if (profileLoading) {
      return <div className="flex items-center justify-center h-64"><span className="text-gray-500">{t('loadingProfile') || 'Loading...'}</span></div>;
    }

    return (
      <>
        <CustomerProfile
          profile={profileData}
          appointments={hookAppointments}
          services={customerServices}
          depositList={depositList}
          usageHistory={usageHistory}
          depositBalance={depositBalanceData}
          payments={customerPayments}
          activeTab={profileTab}
          onTabChange={setProfileTab}
          onBack={() => navigate('/customers')}
          onEdit={canEditCustomers ? handleEdit : undefined}
          onAddDeposit={handleAddDeposit}
          onAddRefund={handleAddRefund}
          onVoidDeposit={handleVoidDeposit}
          onDeleteDeposit={handleDeleteDeposit}
          onEditDeposit={handleEditDeposit}
          onRefreshDeposits={handleRefreshDeposits}
          onCreateAppointment={handleCreateAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onCreateService={handleCreateService}
          onUpdateService={handleUpdateService}
          onMakePayment={handleMakePayment}
          onDeletePayment={async (id) => { await deletePaymentById(id); refetchPayments(); refetchProfile(); }}
          canSoftDelete={canSoftDelete}
          canHardDelete={canHardDelete}
          onSoftDelete={() => {
            if (selectedCustomerId && hookProfile) {
              setDeleteDialog({ open: true, customerId: selectedCustomerId, customerName: hookProfile.name, mode: 'soft' });
            }
          }}
          onHardDelete={() => {
            if (selectedCustomerId && hookProfile) {
              setDeleteDialog({ open: true, customerId: selectedCustomerId, customerName: hookProfile.name, mode: 'hard' });
            }
          }}
          loadingDeposits={depositsLoading}
          loadingPayments={paymentsLoading}
          checkupData={checkupData}
          checkupsLoading={checkupsLoading}
          checkupsError={checkupsError}
          onRefetchCheckups={refetchCheckups}
          onUpdateServiceStatus={async (serviceId, newStatus) => {
            await updateServiceStatus(serviceId, newStatus as 'active' | 'completed' | 'cancelled');
          }}
        />
        {showForm && isEditMode && (
          <div className="modal-container">
            <div className="modal-content max-w-[1100px] animate-in zoom-in-95 duration-200 flex flex-col">
              <AddCustomerForm
                isEdit={true}
                canEdit={canEditCustomers}
                initialData={getEditFormData()}
                customerRef={getCustomerCode()}
                customerId={selectedCustomerId ?? undefined}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setIsEditMode(false); }}
                onPendingFaceImage={setPendingFaceImage}
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
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
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
            <AddCustomerForm
              customerRef={createdCustomerCode}
              customerId={selectedCustomerId ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setCreatedCustomerCode(null); }}
              onPendingFaceImage={setPendingFaceImage}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t('searchPlaceholder')} />
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
          <h3 className="text-sm font-medium text-amber-900 mb-1">{t('searchToView')}</h3>
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
          pageSize={20}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          emptyMessage={t('table.noData', { ns: 'common' })}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {deleteDialog.mode === 'hard' ? 'Xóa vĩnh viễn' : 'Xóa khách hàng'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc muốn <strong>{deleteDialog.mode === 'hard' ? 'xóa vĩnh viễn' : 'xóa'}</strong> khách hàng <strong>{deleteDialog.customerName}</strong>?
              {deleteDialog.mode === 'soft' && ' Khách hàng sẽ bị ẩn khỏi danh sách nhưng dữ liệu vẫn được giữ lại.'}
              {deleteDialog.mode === 'hard' && ' Hành động này không thể hoàn tác.'}
            </p>
            {linkedCounts && (linkedCounts.appointments > 0 || linkedCounts.saleorders > 0 || linkedCounts.dotkhams > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                <p className="font-medium mb-1">{t('relatedData')}</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {linkedCounts.appointments > 0 && <li>{linkedCounts.appointments} lịch hẹn</li>}
                  {linkedCounts.saleorders > 0 && <li>{linkedCounts.saleorders} hóa đơn</li>}
                  {linkedCounts.dotkhams > 0 && <li>{linkedCounts.dotkhams} đợt khám</li>}
                </ul>
              </div>
            )}
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteDialog(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xử lý...' : (deleteDialog.mode === 'hard' ? 'Xóa vĩnh viễn' : 'Xóa')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
