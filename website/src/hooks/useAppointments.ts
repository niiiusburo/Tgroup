/**
 * useAppointments - Appointment CRUD and status management hook with API integration
 * @crossref:used-in[Appointments, Calendar, Overview]
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  CHECK_IN_FLOW_ORDER,
  type ManagedAppointment,
  type CheckInStatus,
} from '@/data/mockAppointments';
import {
  fetchAppointments,
  createAppointment as apiCreateAppointment,
  updateAppointment as apiUpdateAppointment,
  type ApiAppointment,
} from '@/lib/api';
import type { AppointmentStatus } from '@/data/mockCalendar';
import type { AppointmentType } from '@/constants';

export type AppointmentFilter = 'all' | AppointmentStatus;
export type CheckInFilter = 'all' | CheckInStatus;

interface CreateAppointmentInput {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly notes: string;
}

function nowTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function parseDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseTime(timeString: string | null, datetimeString: string | null): string {
  if (timeString) return timeString;
  if (datetimeString) {
    const date = new Date(datetimeString);
    if (!isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }
  return '09:00';
}

function calculateEndTime(startTime: string, durationMinutes: number | null): string {
  const duration = durationMinutes || 30;
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function mapApiToManagedAppointment(api: ApiAppointment): ManagedAppointment {
  const startTime = parseTime(api.time, api.datetimeappointment);
  const endTime = calculateEndTime(startTime, api.timeexpected);
  const date = parseDate(api.date);

  const state = api.state?.toLowerCase() || '';
  let status: AppointmentStatus = 'scheduled';
  if (state === 'confirmed') status = 'confirmed';
  else if (state === 'cancel') status = 'cancelled';
  else if (state === 'done') status = 'completed';

  let checkInStatus: CheckInStatus = 'not-arrived';
  if (state === 'done') checkInStatus = 'done';
  else if (state === 'confirmed') checkInStatus = 'not-arrived';

  return {
    id: api.id,
    customerId: api.partnerid || '',
    customerName: api.partnername || '',
    customerPhone: api.partnerphone || '',
    doctorId: api.doctorid || '',
    doctorName: api.doctorname || '',
    locationId: api.companyid || '',
    locationName: api.companyname || '',
    appointmentType: 'consultation' as const,
    serviceName: api.name || api.note || '',
    date,
    startTime,
    endTime,
    status,
    checkInStatus,
    arrivalTime: null,
    treatmentStartTime: null,
    completionTime: null,
    notes: api.note || '',
    convertedToServiceId: null,
  };
}

export function useAppointments(selectedLocationId?: string) {
  const [appointments, setAppointments] = useState<ManagedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentFilter>('all');
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Initial load and refetch
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAppointments({
        offset: 0,
        limit: 200,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
      });
      const managed = response.items.map(mapApiToManagedAppointment);
      setAppointments(managed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch appointments';
      setError(message);
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load appointments on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Debounced search with API call
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!searchTerm) {
      refetch();
      return;
    }

    setLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetchAppointments({
          offset: 0,
          limit: 200,
          search: searchTerm,
          companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
        });
        const managed = response.items.map(mapApiToManagedAppointment);
        setAppointments(managed);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, refetch]);

  const filtered = useMemo(() => {
    let result = appointments;

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (checkInFilter !== 'all') {
      result = result.filter((a) => a.checkInStatus === checkInFilter);
    }
    if (dateFilter) {
      result = result.filter((a) => a.date === dateFilter);
    }

    return result.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [appointments, statusFilter, checkInFilter, dateFilter]);

  const createAppointment = useCallback(async (input: CreateAppointmentInput) => {
    try {
      const apiPayload: Partial<ApiAppointment> = {
        partnerid: input.customerId,
        partnername: input.customerName,
        partnerphone: input.customerPhone,
        doctorid: input.doctorId,
        doctorname: input.doctorName,
        companyid: input.locationId,
        companyname: input.locationName,
        name: input.serviceName,
        date: input.date,
        time: input.startTime,
        note: input.notes,
        state: 'scheduled',
      };

      const created = await apiCreateAppointment(apiPayload);
      const managed = mapApiToManagedAppointment(created);
      setAppointments((prev) => [...prev, managed]);
      return managed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create appointment';
      setError(message);
      console.error('Failed to create appointment:', err);
      throw err;
    }
  }, []);

  const advanceCheckIn = useCallback(async (appointmentId: string) => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    const currentIdx = CHECK_IN_FLOW_ORDER.indexOf(appointment.checkInStatus);
    if (currentIdx >= CHECK_IN_FLOW_ORDER.length - 1) return;

    const nextStatus = CHECK_IN_FLOW_ORDER[currentIdx + 1];
    const now = nowTimeString();

    // Determine the API state based on next check-in status
    let apiState: string;
    switch (nextStatus) {
      case 'arrived':
        apiState = 'confirmed';
        break;
      case 'done':
        apiState = 'done';
        break;
      default:
        apiState = 'confirmed';
    }

    try {
      // Persist to API first
      await apiUpdateAppointment(appointmentId, { state: apiState });

      // Then update local state
      setAppointments((prev) =>
        prev.map((apt) => {
          if (apt.id !== appointmentId) return apt;
          return {
            ...apt,
            checkInStatus: nextStatus,
            ...(nextStatus === 'arrived' ? { arrivalTime: now } : {}),
            ...(nextStatus === 'in-treatment' ? { treatmentStartTime: now, status: 'in-progress' as const } : {}),
            ...(nextStatus === 'done' ? { completionTime: now, status: 'completed' as const } : {}),
          };
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to advance check-in status';
      setError(message);
      console.error('Failed to advance check-in status:', err);
      throw err;
    }
  }, [appointments]);

  const updateStatus = useCallback(async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return;

      const apiStatus = status === 'completed' ? 'done' : status;
      await apiUpdateAppointment(appointmentId, { state: apiStatus });

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status } : apt,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
      console.error('Failed to update appointment status:', err);
      throw err;
    }
  }, [appointments]);

  const cancelAppointment = useCallback(async (appointmentId: string) => {
    try {
      await apiUpdateAppointment(appointmentId, { state: 'cancel' });

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, status: 'cancelled' as const, checkInStatus: 'not-arrived' as const }
            : apt,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel appointment';
      setError(message);
      console.error('Failed to cancel appointment:', err);
      throw err;
    }
  }, []);

  const convertToService = useCallback((appointmentId: string) => {
    const serviceId = `svc-${Date.now()}`;
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, convertedToServiceId: serviceId }
          : apt,
      ),
    );
    return serviceId;
  }, []);

  const updateAppointment = useCallback(async (appointmentId: string, input: CreateAppointmentInput) => {
    try {
      const apiPayload: Partial<ApiAppointment> = {
        partnerid: input.customerId,
        partnername: input.customerName,
        partnerphone: input.customerPhone,
        doctorid: input.doctorId,
        doctorname: input.doctorName,
        companyid: input.locationId,
        companyname: input.locationName,
        name: input.serviceName,
        date: input.date,
        time: input.startTime,
        note: input.notes,
      };

      await apiUpdateAppointment(appointmentId, apiPayload);

      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                customerId: input.customerId,
                customerName: input.customerName,
                customerPhone: input.customerPhone,
                doctorId: input.doctorId,
                doctorName: input.doctorName,
                locationId: input.locationId,
                locationName: input.locationName,
                serviceName: input.serviceName,
                date: input.date,
                startTime: input.startTime,
                endTime: input.endTime,
                notes: input.notes,
              }
            : apt,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update appointment';
      setError(message);
      console.error('Failed to update appointment:', err);
      throw err;
    }
  }, []);

  const todayAppointments = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return appointments.filter((a) => a.date === todayStr);
  }, [appointments]);

  const stats = useMemo(() => ({
    total: todayAppointments.length,
    waiting: todayAppointments.filter((a) => a.checkInStatus === 'waiting').length,
    inTreatment: todayAppointments.filter((a) => a.checkInStatus === 'in-treatment').length,
    completed: todayAppointments.filter((a) => a.checkInStatus === 'done').length,
    notArrived: todayAppointments.filter((a) => a.checkInStatus === 'not-arrived').length,
  }), [todayAppointments]);

  return {
    appointments: filtered,
    allAppointments: appointments,
    todayAppointments,
    stats,
    statusFilter,
    setStatusFilter,
    checkInFilter,
    setCheckInFilter,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    createAppointment,
    updateAppointment,
    advanceCheckIn,
    updateStatus,
    cancelAppointment,
    convertToService,
    loading,
    error,
    refetch,
  };
}
