import { useEffect, useMemo, useState } from 'react';
import { fetchPartners } from '@/lib/api';
import { MIN_SEARCH_LENGTH } from '@/hooks/useCustomers';
import {
  mapPartnerToCustomer,
  type Customer as ApiCustomer,
} from '@/hooks/useCustomers/customerMapper';
import type { Customer } from '@/types/customer';

const SERVICE_CUSTOMER_SEARCH_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

function toSelectorCustomer(customer: ApiCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    locationId: customer.locationId,
    status: customer.status,
    lastVisit: customer.lastVisit,
  };
}

function mergeSelectedCustomer(
  customers: readonly Customer[],
  baseCustomers: readonly Customer[],
  selectedId: string | null,
): Customer[] {
  const byId = new Map(customers.map((customer) => [customer.id, customer]));
  const selected = selectedId ? baseCustomers.find((customer) => customer.id === selectedId) : undefined;
  if (selected) byId.set(selected.id, selected);
  return Array.from(byId.values());
}

export function useServiceCustomerOptions(
  baseCustomers: readonly ApiCustomer[],
  selectedId: string | null,
  searchTerm: string,
) {
  const [remoteCustomers, setRemoteCustomers] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  const baseSelectorCustomers = useMemo(
    () => baseCustomers.map(toSelectorCustomer),
    [baseCustomers],
  );

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setRemoteCustomers([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetchPartners({
          search: trimmed,
          limit: SERVICE_CUSTOMER_SEARCH_LIMIT,
        });
        if (!cancelled) {
          setRemoteCustomers(response.items.map(mapPartnerToCustomer).map(toSelectorCustomer));
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const shouldUseRemote = searchTerm.trim().length >= MIN_SEARCH_LENGTH;
  const sourceCustomers = shouldUseRemote ? remoteCustomers : baseSelectorCustomers;

  return {
    customers: mergeSelectedCustomer(sourceCustomers, baseSelectorCustomers, selectedId),
    searching,
  };
}
