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
  type ApiSaleOrder,
} from '@/lib/api';

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
  readonly doctorId: string;
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
}

/**
 * Extract sale order reference code (e.g. SO-2024-001) from API response.
 * Prioritizes the dedicated code field, then falls back to ref / origin / name.
 */
function extractOrderCode(order: ApiSaleOrder): string | undefined {
  const candidates = [order.code, order.ref, order.origin, order.name];
  for (const c of candidates) {
    if (c && /^S[-\s]?O/i.test(c)) {
      return c;
    }
  }
  return undefined;
}

/**
 * Map ApiSaleOrder to ServiceRecord interface
 */
function mapSaleOrderToServiceRecord(order: ApiSaleOrder): ServiceRecord {
  const statusMap: Record<string, ServiceStatus> = {
    sale: 'active',
    done: 'completed',
    cancel: 'cancelled',
    draft: 'active',
  };

  const status = statusMap[order.state || ''] || 'active' as ServiceStatus;
  const completedVisits = status === 'completed' ? 1 : 0;

  return {
    id: order.id,
    customerId: order.partnerid || '',
    customerName: order.partnername || '',
    customerPhone: '',
    catalogItemId: order.productid || '',
    serviceName: order.productname || order.name || '',
    category: 'treatment' as AppointmentType,
    doctorId: order.doctorid || '',
    doctorName: order.doctorname || '',
    assistantId: order.assistantid ?? null,
    assistantName: order.assistantname || '',
    dentalAideId: order.dentalaideid ?? null,
    dentalAideName: order.dentalaidename || '',
    quantity: order.quantity ? parseFloat(order.quantity) : 1,
    unit: order.unit || 'răng',
    locationId: order.companyid || '',
    locationName: order.companyname || '',
    status,
    totalVisits: 1,
    completedVisits,
    totalCost: parseFloat(order.amounttotal || '0') || 0,
    paidAmount: parseFloat(order.totalpaid || '0') || 0,
    residual: parseFloat(order.residual || '0') || 0,
    startDate: order.datestart?.slice(0, 10) || order.datecreated?.slice(0, 10) || '',
    expectedEndDate: order.dateend?.slice(0, 10) || '',
    notes: order.notes || '',
    toothNumbers: [],
    visits: [],
    createdAt: order.datecreated?.slice(0, 10) || '',
    orderName: order.name || undefined,
    orderCode: extractOrderCode(order),
  };
}

export function useServices(selectedLocationId?: string, partnerId?: string) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ServiceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fetchRecords();
  }, [fetchRecords]);

  /**
   * Debounced search
   */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchRecords(searchTerm || undefined);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, fetchRecords, partnerId]);

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
      doctorid: input.doctorId,
      doctorname: input.doctorName,
      assistantid: input.assistantId ?? null,
      dentalaideid: input.dentalAideId ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'răng',
      amounttotal: input.totalCost,
      datestart: input.startDate,
      dateend: input.expectedEndDate,
      notes: input.notes,
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
      doctorid: input.doctorId,
      doctorname: input.doctorName,
      assistantid: input.assistantId ?? null,
      dentalaideid: input.dentalAideId ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'răng',
      amounttotal: input.totalCost,
      datestart: input.startDate,
      dateend: input.expectedEndDate,
      notes: input.notes,
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
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unsupported service status: ${status}`);
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
