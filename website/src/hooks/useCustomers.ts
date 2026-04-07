/**
 * useCustomers - Customer CRUD, search, and filter hook
 * @crossref:used-in[Customers, Appointments, Payment, Services]
 */

import { useState, useMemo, useCallback } from 'react';
import { MOCK_CUSTOMERS, type Customer, type CustomerStatus } from '@/data/mockCustomers';

export type CustomerStatusFilter = 'all' | CustomerStatus;
export type CustomerLocationFilter = string; // locationId or 'all'

interface CreateCustomerInput {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([...MOCK_CUSTOMERS]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('all');
  const [locationFilter, setLocationFilter] = useState<CustomerLocationFilter>('all');

  const filtered = useMemo(() => {
    let result: readonly Customer[] = customers;

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (locationFilter !== 'all') {
      result = result.filter((c) => c.locationId === locationFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.phone.includes(lower) ||
          c.email.toLowerCase().includes(lower),
      );
    }

    return [...result].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [customers, statusFilter, locationFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter((c) => c.status === 'active').length,
    inactive: customers.filter((c) => c.status === 'inactive').length,
    pending: customers.filter((c) => c.status === 'pending').length,
  }), [customers]);

  const createCustomer = useCallback((input: CreateCustomerInput): Customer => {
    const today = new Date().toISOString().slice(0, 10);
    const newCustomer: Customer = {
      ...input,
      id: `cust-${Date.now()}`,
      status: 'active',
      lastVisit: today,
    };
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Omit<Customer, 'id'>>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
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
    customers: filtered,
    allCustomers: customers,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    locationFilter,
    setLocationFilter,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
  };
}
