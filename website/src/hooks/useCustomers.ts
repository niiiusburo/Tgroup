/**
 * useCustomers - Customer CRUD, search, and filter hook
 * NOW CONNECTED TO REAL API (tgclinic-api → PostgreSQL)
 * @crossref:used-in[Customers, Appointments, Payment, Services]
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPartners, createPartner, updatePartner, type ApiPartner } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerStatus } from '@/data/mockCustomers';
import type { CustomerFormData } from '@/data/mockCustomerForm';

export type { CustomerStatus } from '@/data/mockCustomers';

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
  readonly status: CustomerStatus;
  readonly lastVisit: string;
  // Extra fields from real API
  readonly code?: string | null;
  readonly gender?: string | null;
  readonly street?: string | null;
  readonly city?: string | null;
  readonly district?: string | null;
  readonly ward?: string | null;
  readonly comment?: string | null;
  readonly note?: string | null;
  readonly agentname?: string | null;
  readonly companyname?: string | null;
  // CSKH (Customer Service) assignment
  readonly cskhid?: string | null;
  readonly cskhname?: string | null;
}

export type CustomerStatusFilter = 'all' | CustomerStatus;
export type CustomerLocationFilter = string; // companyId or 'all'


function mapPartnerToCustomer(p: ApiPartner): Customer {
  return {
    id: p.id,
    name: p.name || '',
    phone: p.phone || '',
    email: p.email || '',
    locationId: p.companyid || '',
    status: p.status ? 'active' : 'inactive',
    lastVisit: p.lastupdated?.slice(0, 10) || p.datecreated?.slice(0, 10) || '',
    code: p.code,
    gender: p.gender,
    street: p.street,
    city: p.city,
    district: p.district,
    ward: p.ward,
    comment: p.comment,
    note: p.note,
    agentname: p.agentname,
    companyname: p.companyname,
    cskhid: p.cskhid,
    cskhname: p.cskhname,
  };
}

// Permission constant for viewing all customers
export const PERMISSION_VIEW_ALL_CUSTOMERS = 'customers.view.all';
// Minimum search length when user lacks view.all permission
export const MIN_SEARCH_LENGTH = 3;

export function useCustomers(locationId: string = 'all') {
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('all');

  // Check if user has permission to view all customers
  // Support both legacy 'customers.view.all' and current 'customers.view_all'
  const canViewAllCustomers = hasPermission(PERMISSION_VIEW_ALL_CUSTOMERS) || hasPermission('customers.view_all');
  // Search is required if user doesn't have view.all permission
  const searchRequired = !canViewAllCustomers;

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      // Only update debounced search if:
      // - User can view all customers (any search term is fine)
      // - OR search term is empty (will show empty state for restricted users)
      // - OR search term meets minimum length requirement
      if (canViewAllCustomers || !searchTerm || searchTerm.length >= MIN_SEARCH_LENGTH) {
        setDebouncedSearch(searchTerm);
      }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchTerm, canViewAllCustomers]);

  // Fetch from API
  const loadCustomers = useCallback(async () => {
    // If search is required and no valid search term provided, don't fetch
    if (searchRequired && !debouncedSearch) {
      setCustomers([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchPartners({
        offset: 0,
        limit: 200,
        search: debouncedSearch || undefined,
        companyId: locationId !== 'all' ? locationId : undefined,
      });
      let mapped = res.items.map(mapPartnerToCustomer);

      // Client-side status filter (API doesn't support it directly)
      if (statusFilter !== 'all') {
        mapped = mapped.filter((c) => c.status === statusFilter);
      }

      // Sort by lastVisit descending
      mapped.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

      setCustomers(mapped);
      setTotalItems(res.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
      console.error('useCustomers: fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, locationId, statusFilter, searchRequired]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const stats = {
    total: totalItems,
    active: customers.filter((c) => c.status === 'active').length,
    inactive: customers.filter((c) => c.status === 'inactive').length,
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
      // Update totalItems to reflect the new customer
      setTotalItems((prev) => prev + 1);
      return mapped;
    } catch (err) {
      console.error('Failed to create customer:', err);
      throw err;
    }
  }, []);

  const updateCustomerFn = useCallback(async (id: string, updates: CustomerFormData) => {
    await updatePartner(id, {
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
      medicalhistory: updates.medicalhistory || undefined,
      note: updates.note || undefined,
      comment: updates.comment || undefined,
      referraluserid: updates.referraluserid || undefined,
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
      cskhid: updates.cskhid || undefined,
      salestaffid: updates.salestaffid || undefined,
    });
    // Only update local state after successful API call
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              name: updates.name,
              phone: updates.phone,
              email: updates.email,
              locationId: updates.companyid,
              gender: updates.gender || null,
              street: updates.street || null,
              note: updates.note || null,
              comment: updates.comment || null,
            }
          : c,
      ),
    );
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    // Soft-delete: mark as inactive
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
    // Permission-related properties
    searchRequired,
    minSearchLength: MIN_SEARCH_LENGTH,
    canViewAllCustomers,
  };
}
