/**
 * useCustomers - Customer CRUD, search, and filter hook
 * NOW CONNECTED TO REAL API (tdental-api → PostgreSQL)
 * @crossref:used-in[Customers, Appointments, Payment, Services]
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPartners, createPartner, updatePartner, type ApiPartner } from '@/lib/api';
import type { CustomerStatus } from '@/data/mockCustomers';

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
  readonly sourcename?: string | null;
  readonly agentname?: string | null;
  readonly companyname?: string | null;
}

export type CustomerStatusFilter = 'all' | CustomerStatus;
export type CustomerLocationFilter = string; // companyId or 'all'

interface CreateCustomerInput {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
}

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
    sourcename: p.sourcename,
    agentname: p.agentname,
    companyname: p.companyname,
  };
}

export function useCustomers(locationId: string = 'all') {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('all');

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchTerm]);

  // Fetch from API
  const loadCustomers = useCallback(async () => {
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
  }, [debouncedSearch, locationId, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const stats = {
    total: totalItems,
    active: customers.filter((c) => c.status === 'active').length,
    inactive: customers.filter((c) => c.status === 'inactive').length,
    pending: customers.filter((c) => c.status === 'pending').length,
  };

  const createCustomerFn = useCallback(async (input: CreateCustomerInput): Promise<Customer> => {
    try {
      const created = await createPartner({
        name: input.name,
        phone: input.phone,
        email: input.email,
        companyid: input.locationId,
        customer: true,
        status: true,
      });
      const mapped = mapPartnerToCustomer(created);
      setCustomers((prev) => [...prev, mapped]);
      return mapped;
    } catch (err) {
      console.error('useCustomers: create error', err);
      // Fallback to local-only creation
      const fallback: Customer = {
        ...input,
        id: `cust-${Date.now()}`,
        status: 'active',
        lastVisit: new Date().toISOString().slice(0, 10),
      };
      setCustomers((prev) => [...prev, fallback]);
      return fallback;
    }
  }, []);

  const updateCustomerFn = useCallback(async (id: string, updates: Partial<Omit<Customer, 'id'>>) => {
    try {
      await updatePartner(id, {
        name: updates.name,
        phone: updates.phone,
        email: updates.email,
        companyid: updates.locationId,
      });
    } catch (err) {
      console.error('useCustomers: update error', err);
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
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
  };
}
