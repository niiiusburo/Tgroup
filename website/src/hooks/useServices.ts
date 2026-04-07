/**
 * useServices - Service records CRUD, filtering, and multi-visit tracking
 * @crossref:used-in[Services, Customers, Payment]
 */

import { useState, useMemo, useCallback } from 'react';
import {
  MOCK_SERVICE_RECORDS,
  type ServiceRecord,
  type ServiceStatus,
  type ServiceVisit,
  type VisitStatus,
} from '@/data/mockServices';
import type { AppointmentType } from '@/constants';

export type ServiceFilter = 'all' | ServiceStatus;
export type CategoryFilter = 'all' | AppointmentType;

export interface CreateServiceInput {
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

export function useServices() {
  const [records, setRecords] = useState<ServiceRecord[]>(
    [...MOCK_SERVICE_RECORDS],
  );
  const [statusFilter, setStatusFilter] = useState<ServiceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    let result: readonly ServiceRecord[] = records;

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category === categoryFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.customerName.toLowerCase().includes(lower) ||
          r.customerPhone.includes(lower) ||
          r.serviceName.toLowerCase().includes(lower) ||
          r.doctorName.toLowerCase().includes(lower),
      );
    }

    return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [records, statusFilter, categoryFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter((r) => r.status === 'active').length,
    completed: records.filter((r) => r.status === 'completed').length,
    planned: records.filter((r) => r.status === 'planned').length,
    totalRevenue: records.reduce((sum, r) => sum + r.paidAmount, 0),
    outstanding: records.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0),
  }), [records]);

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

  const cancelServiceRecord = useCallback((recordId: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, status: 'cancelled' as const } : r,
      ),
    );
  }, []);

  const getRecordsByCustomer = useCallback((customerId: string) =>
    records.filter((r) => r.customerId === customerId),
  [records]);

  return {
    records: filtered,
    allRecords: records,
    stats,
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
  };
}
