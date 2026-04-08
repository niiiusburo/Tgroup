/**
 * useServices - Service records from API (Sale Orders), filtering, and multi-visit tracking
 * @crossref:used-in[Services, Customers, Payment]
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  type ServiceRecord,
  type ServiceStatus,
  type ServiceVisit,
  type VisitStatus,
} from '@/data/mockServices';
import type { AppointmentType } from '@/constants';
import { fetchSaleOrders, type ApiSaleOrder } from '@/lib/api';

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
  readonly locationId: string;
  readonly locationName: string;
  readonly totalVisits: number;
  readonly totalCost: number;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly notes: string;
  readonly toothNumbers: readonly string[];
}

/**
 * Map ApiSaleOrder to ServiceRecord interface
 */
function mapSaleOrderToServiceRecord(order: ApiSaleOrder): ServiceRecord {
  const statusMap: Record<string, ServiceStatus> = {
    sale: 'active',
    done: 'completed',
    cancel: 'cancelled',
  };

  const status = (statusMap[order.state || ''] || 'planned') as ServiceStatus;
  const completedVisits = status === 'completed' ? 1 : 0;

  return {
    id: order.id,
    customerId: order.partnerid || '',
    customerName: order.partnername || '',
    customerPhone: '',
    catalogItemId: '',
    serviceName: order.name || '',
    category: 'treatment' as AppointmentType,
    doctorId: order.doctorid || '',
    doctorName: order.doctorname || '',
    locationId: order.companyid || '',
    locationName: order.companyname || '',
    status,
    totalVisits: 1,
    completedVisits,
    totalCost: parseFloat(order.amounttotal || '0') || 0,
    paidAmount: parseFloat(order.totalpaid || '0') || 0,
    startDate: order.datecreated?.slice(0, 10) || '',
    expectedEndDate: '',
    notes: '',
    toothNumbers: [],
    visits: [],
    createdAt: order.datecreated?.slice(0, 10) || '',
  };
}

export function useServices(selectedLocationId?: string) {
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
      });
      setRecords(response.items.map(mapSaleOrderToServiceRecord));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [searchTerm, fetchRecords]);

  const filtered = useMemo(() => {
    let result: readonly ServiceRecord[] = records;

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category === categoryFilter);
    }

    return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [records, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter((r) => r.status === 'active').length,
    completed: records.filter((r) => r.status === 'completed').length,
    planned: records.filter((r) => r.status === 'planned').length,
    totalRevenue: records.reduce((sum, r) => sum + r.paidAmount, 0),
    outstanding: records.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0),
  }), [records]);

  /**
   * Create a service record locally (no API endpoint for this)
   */
  const createServiceRecord = useCallback((input: CreateServiceInput) => {
    const visits: ServiceVisit[] = Array.from({ length: input.totalVisits }, (_, i) => ({
      id: `v-new-${Date.now()}-${i + 1}`,
      serviceRecordId: `svc-${Date.now()}`,
      visitNumber: i + 1,
      date: '',
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      status: 'scheduled' as VisitStatus,
      notes: `Visit ${i + 1}`,
      toothNumbers: input.toothNumbers,
    }));

    const newRecord: ServiceRecord = {
      ...input,
      id: `svc-${Date.now()}`,
      status: 'planned',
      completedVisits: 0,
      paidAmount: 0,
      visits,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setRecords((prev) => [...prev, newRecord]);
    return newRecord;
  }, []);

  /**
   * Update visit status in a service record (local-only)
   */
  const updateVisitStatus = useCallback((recordId: string, visitId: string, status: VisitStatus) => {
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        const updatedVisits = record.visits.map((v) =>
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
    updateVisitStatus,
    cancelServiceRecord,
    getRecordsByCustomer,
    refetch,
  };
}
