import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSaleOrderLines } from '@/lib/api';
import type { Customer } from '@/hooks/useCustomers';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useServices } from '@/hooks/useServices';
import { useDeposits } from '@/hooks/useDeposits';
import { useEmployees } from '@/hooks/useEmployees';
import { useCustomerPayments } from '@/hooks/useCustomerPayments';
import { useExternalCheckups } from '@/hooks/useExternalCheckups';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import type { CustomerService } from '@/types/customer';
import { mapSaleOrderLineToCustomerService } from './mapSaleOrderLines';
import { useCustomerDepositActions } from './useCustomerDepositActions';
import { useCustomerFormActions } from './useCustomerFormActions';
import { useCustomerPaymentActions } from './useCustomerPaymentActions';
import { useCustomerProfileData } from './useCustomerProfileData';
import { useCustomerServiceActions } from './useCustomerServiceActions';

interface UseCustomerDetailControllerOptions {
  readonly selectedCustomerId: string | null;
  readonly customers: readonly Customer[];
  readonly locationNameMap: Map<string, string>;
  readonly isEditMode: boolean;
  readonly createCustomer: (data: CustomerFormData) => Promise<Customer>;
  readonly updateCustomer: (id: string, data: CustomerFormData) => Promise<void>;
  readonly setShowForm: (value: boolean) => void;
  readonly setIsEditMode: (value: boolean) => void;
}

export function useCustomerDetailController({
  selectedCustomerId,
  customers,
  locationNameMap,
  isEditMode,
  createCustomer,
  updateCustomer,
  setShowForm,
  setIsEditMode,
}: UseCustomerDetailControllerOptions) {
  const {
    profile: hookProfile,
    rawPartner,
    appointments: hookAppointments,
    linkedCounts,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useCustomerProfile(selectedCustomerId);

  const {
    createServiceRecord,
    updateServiceRecord,
    updateServiceStatus,
    refetch: refetchServices,
  } = useServices(undefined, selectedCustomerId ?? undefined, { enabled: Boolean(selectedCustomerId) });
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
  const { employees: allEmployees } = useEmployees(undefined, { enabled: Boolean(selectedCustomerId) });
  const {
    payments: customerPayments,
    isLoading: paymentsLoading,
    addPayment,
    refetch: refetchPayments,
    deletePaymentById,
  } = useCustomerPayments(selectedCustomerId);

  const [saleOrderLines, setSaleOrderLines] = useState<CustomerService[]>([]);
  const [saleOrderLinesLoading, setSaleOrderLinesLoading] = useState(false);

  const loadSaleOrderLines = useCallback(async () => {
    if (!selectedCustomerId) {
      setSaleOrderLines([]);
      return;
    }
    setSaleOrderLinesLoading(true);
    try {
      const res = await fetchSaleOrderLines({ partnerId: selectedCustomerId, limit: 500 });
      setSaleOrderLines(res.items.map(mapSaleOrderLineToCustomerService));
    } catch (err) {
      console.error('Failed to fetch sale order lines:', err);
      setSaleOrderLines([]);
    } finally {
      setSaleOrderLinesLoading(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    loadSaleOrderLines();
  }, [loadSaleOrderLines]);

  const handleCreateAppointment = useCallback(() => {
    refetchProfile();
  }, [refetchProfile]);

  const handleUpdateAppointment = useCallback(() => {
    refetchProfile();
  }, [refetchProfile]);

  const serviceActions = useCustomerServiceActions({
    createServiceRecord,
    updateServiceRecord,
    selectedCustomerId,
    hookProfile,
    loadSaleOrderLines,
    refetchProfile,
    refetchServices,
  });

  const handleMakePayment = useCustomerPaymentActions({
    addPayment,
    refetchProfile,
    refetchPayments,
    loadDeposits,
    refetchServices,
    loadSaleOrderLines,
  });

  const depositActions = useCustomerDepositActions({
    addDeposit,
    addRefund,
    voidDeposit,
    removeDeposit,
    editDeposit,
    loadDeposits,
    refetchProfile,
    selectedCustomerId,
  });

  useEffect(() => {
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [selectedCustomerId, loadDeposits]);

  const formActions = useCustomerFormActions({
    isEditMode,
    selectedCustomerId,
    rawPartner,
    hookProfile,
    customers,
    createCustomer,
    updateCustomer,
    refetchProfile,
    setShowForm,
    setIsEditMode,
  });

  const customerCode = formActions.getCustomerCode();
  const {
    data: checkupData,
    isLoading: checkupsLoading,
    error: checkupsError,
    refetch: refetchCheckups,
  } = useExternalCheckups(customerCode);

  const listCustomer = useMemo(
    () => selectedCustomerId ? customers.find((customer) => customer.id === selectedCustomerId) : undefined,
    [customers, selectedCustomerId],
  );
  const profileData = useCustomerProfileData(
    hookProfile,
    listCustomer,
    selectedCustomerId,
    locationNameMap,
    customers,
  );

  useEffect(() => {
    if (selectedCustomerId) refetchServices();
  }, [selectedCustomerId, refetchServices]);

  return {
    hookProfile,
    hookAppointments,
    linkedCounts,
    profileLoading,
    refetchProfile,
    profileData,
    allEmployees,
    depositList,
    usageHistory,
    depositBalanceData,
    depositsLoading,
    customerPayments,
    paymentsLoading,
    refetchPayments,
    deletePaymentById,
    loadSaleOrderLines,
    saleOrderLines,
    saleOrderLinesLoading,
    handleCreateAppointment,
    handleUpdateAppointment,
    handleMakePayment,
    updateServiceStatus,
    checkupData,
    checkupsLoading,
    checkupsError,
    refetchCheckups,
    ...serviceActions,
    ...depositActions,
    ...formActions,
  };
}
