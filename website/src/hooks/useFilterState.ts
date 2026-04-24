/**
 * useFilterState — Generic hook for search + filter state management
 * Replaces duplicated filter state patterns across 8+ pages.
 * @crossref:used-in[Customers, Services, Employees, Locations, Payment, Website, Calendar]
 */
import { useState, useMemo, useCallback } from 'react';
import { normalizeText } from '@/lib/utils';

interface FilterConfig<T> {
  /** Function to extract searchable text from an item */
  searchFields?: (item: T) => string[];
  /** Function to extract status field from an item */
  statusField?: (item: T) => string;
}

interface UseFilterStateOptions<T> {
  data: T[];
  config?: FilterConfig<T>;
}

interface UseFilterStateResult<T> {
  filtered: T[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useFilterState<T>({
  data,
  config = {},
}: UseFilterStateOptions<T>): UseFilterStateResult<T> {
  const { searchFields, statusField } = config;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let result = data;

    // Apply status filter
    if (statusFilter !== 'all' && statusField) {
      result = result.filter((item) => statusField(item) === statusFilter);
    }

    // Apply search filter
    if (searchTerm.trim() && searchFields) {
      const normalizedSearch = normalizeText(searchTerm);
      result = result.filter((item) => {
        const searchable = searchFields(item).join(' ');
        return normalizeText(searchable).includes(normalizedSearch);
      });
    }

    return result;
  }, [data, searchTerm, statusFilter, searchFields, statusField]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
  }, []);

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  return {
    filtered,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    clearFilters,
    hasActiveFilters,
  };
}
