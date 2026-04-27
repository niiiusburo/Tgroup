/**
 * Appointment-related type definitions
 * @crossref:used-in[Calendar, DayView, WeekView, MonthView, TimeSlot, AppointmentCard, AppointmentDetailsModal]
 */

import type { AppointmentType } from '@/constants';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'arrived' | 'in-progress' | 'completed' | 'cancelled';
export type CheckInStatus = 'not-arrived' | 'arrived' | 'waiting' | 'in-treatment' | 'done';

export interface CalendarAppointment {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerCode: string;
  readonly serviceName: string;
  readonly appointmentType: AppointmentType;
  readonly dentist: string;
  readonly dentistId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: AppointmentStatus;
  readonly locationId: string;
  readonly locationName: string;
  readonly notes: string;
  readonly color: string | null;
  readonly timeexpected?: number | null;
  // NEW fields for V18.2 status flow
  readonly arrivalTime: string | null;
  readonly treatmentStartTime: string | null;
  // Assistant / dental aide (populated from API)
  readonly assistantId?: string | null;
  readonly assistantName?: string | null;
  readonly dentalAideId?: string | null;
  readonly dentalAideName?: string | null;
  // Service / product mapping
  readonly productId?: string | null;
}

export interface ManagedAppointment {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorId?: string;
  readonly doctorName?: string;
  readonly assistantId?: string;
  readonly assistantName?: string;
  readonly dentalAideId?: string;
  readonly dentalAideName?: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly productId?: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: AppointmentStatus;
  readonly checkInStatus: CheckInStatus;
  readonly arrivalTime: string | null;
  readonly treatmentStartTime: string | null;
  readonly completionTime: string | null;
  readonly notes: string;
  readonly convertedToServiceId: string | null;
  readonly estimatedDuration?: number;
  readonly color?: string;
}

// Check-in flow order
export const CHECK_IN_FLOW_ORDER: readonly CheckInStatus[] = [
  'not-arrived',
  'arrived',
  'waiting',
  'in-treatment',
  'done',
];

export const CHECK_IN_STATUS_LABELS: Record<CheckInStatus, string> = {
  'not-arrived': 'Not Arrived',
  arrived: 'Arrived',
  waiting: 'Waiting',
  'in-treatment': 'In Treatment',
  done: 'Done',
};

export const CHECK_IN_STATUS_STYLES: Record<CheckInStatus, string> = {
  'not-arrived': 'bg-gray-100 text-gray-500',
  arrived: 'bg-blue-100 text-blue-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  'in-treatment': 'bg-orange-100 text-orange-700',
  done: 'bg-green-100 text-green-700',
};
