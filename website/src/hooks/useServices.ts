/**
 * useServices - Service records from API (Sale Orders), filtering, and multi-visit tracking
 * @crossref:used-in[Services, Customers, Payment]
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  type ServiceRecord,
  type ServiceStatus,
  type VisitStatus,
} from '@/data/mockServices';
import type { AppointmentType } from '@/constants';
import {
  fetchSaleOrders,
  createSaleOrder,
  updateSaleOrder,
  updateSaleOrderState,
} from '@/lib/api';
import { mapSaleOrderToServiceRecord } from './useServices/mapSaleOrderToServiceRecord';

export type ServiceFilter = 'all' | ServiceStatus;
export type CategoryFilter = 'all' | AppointmentType;

export interface CreateServiceInput {
  readonly id?: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly catalogItemId: string;
  readonly serviceName: string;
  readonly category: AppointmentType;
  readonly doctorId: string | null;
  readonly doctorName: string;
  readonly assistantId?: string | null;
  readonly assistantName?: string;
  readonly dentalAideId?: string | null;
  readonly dentalAideName?: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly totalVisits: number;
  readonly totalCost: number;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly notes: string;
  readonly quantity?: number;
  readonly unit?: string;
  readonly toothNumbers: readonly string[];
  readonly toothComment?: string;
  readonly sourceId?: string | null;
}

interface UseServicesOptions {
  readonly enabled?: boolean;
}

export function useServices(selectedLocationId?: string, partnerId?: string, options: UseServicesOptions = {}) {
  const enabled = options.enabled ?? true;
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ServiceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialFetchRef = useRef(false);
  const previousSearchTermRef = useRef('');

  /**
   * Load service records from API (Sale Orders)
   */
  const fetchRecords = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchSaleOrders({
        offset: 0,
        limit: 500,
        search,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
        partnerId: partnerId || undefined,
      });
      setRecords(response.items.map(mapSaleOrderToServiceRecord));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, partnerId]);

  /**
   * Refetch with current search term
   */
  const refetch = useCallback(() => {
    fetchRecords(searchTerm || undefined);
  }, [fetchRecords, searchTerm]);

  /**
   * Load records on mount
   */
  useEffect(() => {
    if (!enabled) {
      setRecords([]);
      setLoading(false);
      setError(null);
      didInitialFetchRef.current = false;
      previousSearchTermRef.current = '';
      return;
    }
    fetchRecords();
    didInitialFetchRef.current = true;
  }, [enabled, fetchRecords]);

  /**
   * Debounced search
   */
  useEffect(() => {
    if (!enabled) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchTerm && didInitialFetchRef.current && !previousSearchTermRef.current) {
      return;
    }

    previousSearchTermRef.current = searchTerm;
    debounceTimerRef.current = setTimeout(() => {
      fetchRecords(searchTerm || undefined);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, searchTerm, fetchRecords, partnerId]);

  const filtered = useMemo(() => {
    let result: readonly ServiceRecord[] = records;

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category === categoryFilter);
    }

    return [...result].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [records, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter((r) => r.status === 'active').length,
    completed: records.filter((r) => r.status === 'completed').length,
    cancelled: records.filter((r) => r.status === 'cancelled').length,
    totalRevenue: records.reduce((sum, r) => sum + r.paidAmount, 0),
    outstanding: records.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0),
  }), [records]);

  /**
   * Create a service record via API
   */
  const createServiceRecord = useCallback(async (input: CreateServiceInput) => {
    const apiPayload = {
      partnerid: input.customerId,
      partnername: input.customerName,
      companyid: input.locationId,
      productid: input.catalogItemId,
      productname: input.serviceName,
      doctorid: input.doctorId ?? undefined,
      doctorname: input.doctorName,
      assistantid: input.assistantId ?? null,
      dentalaideid: input.dentalAideId ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'services.form.unitPlaceholder',
      amounttotal: input.totalCost,
      datestart: input.startDate,
      dateend: input.expectedEndDate,
      notes: input.notes,
      tooth_numbers: input.toothNumbers?.join(',') || null,
      tooth_comment: input.toothComment || null,
      sourceid: input.sourceId ?? null,
    };

    const created = await createSaleOrder(apiPayload);
    const newRecord = mapSaleOrderToServiceRecord(created);
    setRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  }, []);

  /**
   * Update a service record via API
   */
  const updateServiceRecord = useCallback(async (input: CreateServiceInput) => {
    if (!input.id) throw new Error('Missing service record id');
    const apiPayload = {
      partnerid: input.customerId,
      partnername: input.customerName,
      companyid: input.locationId,
      productid: input.catalogItemId,
      productname: input.serviceName,
      doctorid: input.doctorId ?? undefined,
      doctorname: input.doctorName,
      assistantid: input.assistantId ?? null,
      dentalaideid: input.dentalAideId ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'services.form.unitPlaceholder',
      amounttotal: input.totalCost,
      datestart: input.startDate,
      dateend: input.expectedEndDate,
      notes: input.notes,
      tooth_numbers: input.toothNumbers?.join(',') || null,
      tooth_comment: input.toothComment || null,
      sourceid: input.sourceId ?? null,
    };

    const updated = await updateSaleOrder(input.id, apiPayload);
    const mapped = mapSaleOrderToServiceRecord(updated);
    setRecords((prev) => prev.map((r) => (r.id === input.id ? mapped : r)));
    return mapped;
  }, []);

  /**
   * Update visit status in a service record (local-only)
   */
  const updateVisitStatus = useCallback((recordId: string, visitId: string, status: VisitStatus) => {
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        const updatedVisits = (record.visits ?? []).map((v) =>
          v.id === visitId ? { ...v, status } : v,
        );
        const completedVisits = updatedVisits.filter((v) => v.status === 'completed').length;
        const allDone = completedVisits === record.totalVisits;
        const hasActive = completedVisits > 0 && !allDone;
        return {
          ...record,
          visits: updatedVisits,
          completedVisits,
          status: allDone ? 'completed' as const : hasActive ? 'active' as const : record.status,
        };
      }),
    );
  }, []);

  /**
   * Cancel a service record (local-only)
   */
  const cancelServiceRecord = useCallback((recordId: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, status: 'cancelled' as const } : r,
      ),
    );
  }, []);

  /**
   * Map frontend ServiceStatus to backend state value
   */
  function statusToState(status: ServiceStatus): string {
    switch (status) {
      case 'active': return 'sale';
      case 'completed': return 'done';
      case 'cancelled': return 'cancel';
      default:
        // Exhaustiveness check for compile-time safety
        throw new Error(`Unsupported service status: ${String(status)}`);
    }
  }

  /**
   * Update a service record's status via API
   */
  const updateServiceStatus = useCallback(async (recordId: string, newStatus: ServiceStatus) => {
    const newState = statusToState(newStatus);
    const updated = await updateSaleOrderState(recordId, newState);
    const mapped = mapSaleOrderToServiceRecord(updated);
    setRecords((prev) =>
      prev.map((r) => r.id === recordId ? mapped : r),
    );
    return mapped;
  }, []);

  /**
   * Get all records for a specific customer
   */
  const getRecordsByCustomer = useCallback((customerId: string) =>
    records.filter((r) => r.customerId === customerId),
  [records]);

  return {
    records: filtered,
    allRecords: records,
    stats,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    createServiceRecord,
    updateServiceRecord,
    updateVisitStatus,
    cancelServiceRecord,
    updateServiceStatus,
    getRecordsByCustomer,
    refetch,
  };
}
