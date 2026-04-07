/**
 * useAppointments - Appointment CRUD and status management hook
 * @crossref:used-in[Appointments, Calendar, Overview]
 */

import { useState, useMemo, useCallback } from 'react';
import {
  MOCK_MANAGED_APPOINTMENTS,
  CHECK_IN_FLOW_ORDER,
  type ManagedAppointment,
  type CheckInStatus,
} from '@/data/mockAppointments';
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

export function useAppointments() {
  const [appointments, setAppointments] = useState<ManagedAppointment[]>(
    [...MOCK_MANAGED_APPOINTMENTS],
  );
  const [statusFilter, setStatusFilter] = useState<AppointmentFilter>('all');
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');

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
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.customerName.toLowerCase().includes(lower) ||
          a.customerPhone.includes(lower) ||
          a.doctorName.toLowerCase().includes(lower) ||
          a.serviceName.toLowerCase().includes(lower),
      );
    }

    return result.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [appointments, statusFilter, checkInFilter, searchTerm, dateFilter]);

  const createAppointment = useCallback((input: CreateAppointmentInput) => {
    const newAppointment: ManagedAppointment = {
      ...input,
      id: `apt-${Date.now()}`,
      status: 'scheduled',
      checkInStatus: 'not-arrived',
      arrivalTime: null,
      treatmentStartTime: null,
      completionTime: null,
      convertedToServiceId: null,
    };
    setAppointments((prev) => [...prev, newAppointment]);
    return newAppointment;
  }, []);

  const advanceCheckIn = useCallback((appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id !== appointmentId) return apt;
        const currentIdx = CHECK_IN_FLOW_ORDER.indexOf(apt.checkInStatus);
        if (currentIdx >= CHECK_IN_FLOW_ORDER.length - 1) return apt;
        const nextStatus = CHECK_IN_FLOW_ORDER[currentIdx + 1];
        const now = nowTimeString();

        return {
          ...apt,
          checkInStatus: nextStatus,
          ...(nextStatus === 'arrived' ? { arrivalTime: now } : {}),
          ...(nextStatus === 'in-treatment' ? { treatmentStartTime: now, status: 'in-progress' as const } : {}),
          ...(nextStatus === 'done' ? { completionTime: now, status: 'completed' as const } : {}),
        };
      }),
    );
  }, []);

  const updateStatus = useCallback((appointmentId: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status } : apt,
      ),
    );
  }, []);

  const cancelAppointment = useCallback((appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, status: 'cancelled' as const, checkInStatus: 'not-arrived' as const }
          : apt,
      ),
    );
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
    advanceCheckIn,
    updateStatus,
    cancelAppointment,
    convertToService,
  };
}
