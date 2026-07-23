import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPartners, createPartner, updatePartner } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import {
  CUSTOMER_LOOKUP_LIMIT,
  CUSTOMER_PAGE_SIZE,
  mapPartnerToCustomer,
  type Customer,
  type CustomerStatusFilter,
} from './useCustomers/customerMapper';

export type { Customer, CustomerLocationFilter, CustomerStatus, CustomerStatusFilter } from './useCustomers/customerMapper';
export { CUSTOMER_PAGE_SIZE } from './useCustomers/customerMapper';

export const PERMISSION_VIEW_ALL_CUSTOMERS = 'customers.view.all';
export const MIN_SEARCH_LENGTH = 3;

interface UseCustomersOptions {
  readonly paginated?: boolean;
  readonly limit?: number;
}

export function useCustomers(locationId: string = 'all', options: UseCustomersOptions = {}) {
  const isPaginated = options.paginated ?? false;
  const pageSize = options.limit ?? (isPaginated ? CUSTOMER_PAGE_SIZE : CUSTOMER_LOOKUP_LIMIT);
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [activeItems, setActiveItems] = useState(0);
  const [inactiveItems, setInactiveItems] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTermValue] = useState('');
  const [statusFilter, setStatusFilterValue] = useState<CustomerStatusFilter>('all');

  const canViewAllCustomers = hasPermission(PERMISSION_VIEW_ALL_CUSTOMERS) || hasPermission('customers.view_all');
  const searchRequired = !canViewAllCustomers;

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (canViewAllCustomers || !searchTerm || searchTerm.length >= MIN_SEARCH_LENGTH) {
        setDebouncedSearch(searchTerm);
      }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchTerm, canViewAllCustomers]);

  const setSearchTerm = useCallback((value: string) => {
    setPage(0);
    setSearchTermValue(value);
  }, []);

  const setStatusFilter = useCallback((value: CustomerStatusFilter) => {
    setPage(0);
    setStatusFilterValue(value);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [locationId]);

  const loadCustomers = useCallback(async () => {
    if (searchRequired && !debouncedSearch) {
      setCustomers([]);
      setTotalItems(0);
      setActiveItems(0);
      setInactiveItems(0);
      setPage(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchPartners({
        offset: isPaginated ? page * pageSize : 0,
        limit: pageSize,
        search: debouncedSearch || undefined,
        companyId: locationId !== 'all' ? locationId : undefined,
        status: isPaginated && statusFilter !== 'all' ? statusFilter : undefined,
      });
      let mapped = res.items.map(mapPartnerToCustomer);
      if (!isPaginated && statusFilter !== 'all') {
        mapped = mapped.filter((c) => c.status === statusFilter);
      }

      mapped.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

      setCustomers(mapped);
      setTotalItems(res.totalItems);
      setActiveItems(res.aggregates?.active ?? mapped.filter((c) => c.status === 'active').length);
      setInactiveItems(res.aggregates?.inactive ?? mapped.filter((c) => c.status === 'inactive').length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
      console.error('useCustomers: fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isPaginated, locationId, page, pageSize, statusFilter, searchRequired]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const stats = {
    total: totalItems,
    active: activeItems,
    inactive: inactiveItems,
    pending: customers.filter((c) => c.status === 'pending').length,
  };

  const createCustomerFn = useCallback(async (input: CustomerFormData): Promise<Customer> => {
    try {
      const created = await createPartner({
        name: input.name,
        phone: input.phone,
        email: input.email || undefined,
        companyid: input.companyid || undefined,
        gender: input.gender || undefined,
        birthday: input.birthday ?? undefined,
        birthmonth: input.birthmonth ?? undefined,
        birthyear: input.birthyear ?? undefined,
        street: input.street || undefined,
        cityname: input.cityname || undefined,
        districtname: input.districtname || undefined,
        wardname: input.wardname || undefined,
        medicalhistory: input.medicalhistory || undefined,
        note: input.note || undefined,
        comment: input.comment || undefined,
        referraluserid: input.referraluserid || undefined,
        salestaffid: input.salestaffid || undefined,
        cskhid: input.cskhid || undefined,
        weight: input.weight ?? undefined,
        identitynumber: input.identitynumber || undefined,
        healthinsurancecardnumber: input.healthinsurancecardnumber || undefined,
        emergencyphone: input.emergencyphone || undefined,
        jobtitle: input.jobtitle || undefined,
        taxcode: input.taxcode || undefined,
        unitname: input.unitname || undefined,
        unitaddress: input.unitaddress || undefined,
        personalname: input.personalname || undefined,
        personalidentitycard: input.personalidentitycard || undefined,
        personaltaxcode: input.personaltaxcode || undefined,
        personaladdress: input.personaladdress || undefined,
        isbusinessinvoice: input.isbusinessinvoice ?? undefined,
        customer: true,
        status: true,
      });
      const mapped = mapPartnerToCustomer(created);
      setCustomers((prev) => [...prev, mapped]);
      setTotalItems((prev) => prev + 1);
      setActiveItems((prev) => prev + 1);
      return mapped;
    } catch (err) {
      console.error('Failed to create customer:', err);
      throw err;
    }
  }, []);

  const updateCustomerFn = useCallback(async (id: string, updates: CustomerFormData) => {
    const hasUpdate = (key: keyof CustomerFormData) =>
      Object.prototype.hasOwnProperty.call(updates, key);

    const updatePayload = {
      name: updates.name,
      phone: updates.phone,
      email: updates.email || undefined,
      companyid: updates.companyid || undefined,
      gender: updates.gender || undefined,
      birthday: updates.birthday ?? undefined,
      birthmonth: updates.birthmonth ?? undefined,
      birthyear: updates.birthyear ?? undefined,
      street: updates.street || undefined,
      cityname: updates.cityname || undefined,
      districtname: updates.districtname || undefined,
      wardname: updates.wardname || undefined,
      medicalhistory: hasUpdate('medicalhistory') ? updates.medicalhistory : undefined,
      note: hasUpdate('note') ? updates.note : undefined,
      comment: hasUpdate('comment') ? updates.comment : undefined,
      referraluserid: hasUpdate('referraluserid') ? updates.referraluserid : undefined,
      weight: updates.weight ?? undefined,
      identitynumber: updates.identitynumber || undefined,
      healthinsurancecardnumber: updates.healthinsurancecardnumber || undefined,
      emergencyphone: updates.emergencyphone || undefined,
      jobtitle: updates.jobtitle || undefined,
      taxcode: updates.taxcode || undefined,
      unitname: updates.unitname || undefined,
      unitaddress: updates.unitaddress || undefined,
      personalname: updates.personalname || undefined,
      personalidentitycard: updates.personalidentitycard || undefined,
      personaltaxcode: updates.personaltaxcode || undefined,
      personaladdress: updates.personaladdress || undefined,
      ref: updates.ref || undefined,
      isbusinessinvoice: updates.isbusinessinvoice ?? undefined,
      cskhid: hasUpdate('cskhid') ? updates.cskhid : undefined,
      salestaffid: hasUpdate('salestaffid') ? updates.salestaffid : undefined,
    };

    await updatePartner(id, updatePayload);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? Object.assign(
              { ...c },
              hasUpdate('name') ? { name: updates.name } : {},
              hasUpdate('phone') ? { phone: updates.phone } : {},
              hasUpdate('email') ? { email: updates.email } : {},
              hasUpdate('companyid') ? { locationId: updates.companyid } : {},
              hasUpdate('gender') ? { gender: updates.gender || null } : {},
              hasUpdate('street') ? { street: updates.street || null } : {},
              hasUpdate('note') ? { note: updates.note || null } : {},
              hasUpdate('comment') ? { comment: updates.comment || null } : {},
            )
          : c,
      ),
    );
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCustomerById = useCallback(
    (id: string): Customer | undefined => customers.find((c) => c.id === id),
    [customers],
  );

  return {
    customers,
    allCustomers: customers,
    stats,
    page,
    setPage,
    pageSize,
    totalItems,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    createCustomer: createCustomerFn,
    updateCustomer: updateCustomerFn,
    deleteCustomer,
    getCustomerById,
    refetch: loadCustomers,
    searchRequired,
    minSearchLength: MIN_SEARCH_LENGTH,
    canViewAllCustomers,
  };
}
