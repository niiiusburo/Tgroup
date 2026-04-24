/**
 * Appointment Form Mapper
 * Bidirectional mapping between UnifiedAppointmentFormData and ApiAppointment.
 *
 * This is the ONLY place where field name translations happen.
 * If the API changes its field names, update ONLY this file.
 */

import type { UnifiedAppointmentFormData } from './appointmentForm.types';
import type { ApiAppointment } from '@/lib/api';
import { calculateEndTime } from '@/lib/calendarUtils';

// ─── Form → API (CREATE / UPDATE) ─────────────────────────────────

export function formDataToApiPayload(
  data: UnifiedAppointmentFormData,
): Partial<ApiAppointment> {
  return {
    partnerid: data.customerId,
    partnername: data.customerName,
    partnerphone: data.customerPhone,
    doctorid: data.doctorId,
    doctorname: data.doctorName,
    assistantid: data.assistantId,
    assistantname: data.assistantName,
    dentalaideid: data.dentalAideId,
    dentalaidename: data.dentalAideName,
    companyid: data.locationId,
    companyname: data.locationName,
    name: data.serviceName || data.appointmentType,
    date: data.date,
    time: data.startTime,
    note: data.notes,
    timeexpected: (data.estimatedDuration && data.estimatedDuration > 0) ? data.estimatedDuration : 30,
    color: data.color ?? '1',
    state: data.status ?? 'scheduled',
    productid: data.serviceId,
  };
}

// ─── API → Form (EDIT preload) ────────────────────────────────────

function normalizeTime(time: string | null | undefined): string {
  if (!time) return '09:00';
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '09:00';
  return `${String(parseInt(match[1], 10)).padStart(2, '0')}:${match[2]}`;
}

export function apiAppointmentToFormData(
  api: ApiAppointment,
): Partial<UnifiedAppointmentFormData> {
  const startTime = normalizeTime(api.time);
  const estimatedDuration = api.timeexpected ?? 30;

  return {
    id: api.id,
    customerId: api.partnerid ?? '',
    customerName: api.partnername ?? api.partnerdisplayname ?? '',
    customerPhone: api.partnerphone ?? '',
    doctorId: api.doctorid ?? api.doctorId ?? undefined,
    doctorName: api.doctorname ?? undefined,
    assistantId: api.assistantid ?? undefined,
    assistantName: api.assistantname ?? undefined,
    dentalAideId: api.dentalaideid ?? undefined,
    dentalAideName: api.dentalaidename ?? undefined,
    locationId: api.companyid ?? '',
    locationName: api.companyname ?? '',
    appointmentType: 'consultation', // Default — caller should override if known
    serviceName: api.productname ?? api.name ?? '',
    serviceId: api.productid ?? undefined,
    date: api.date ? api.date.split('T')[0] : '',
    startTime,
    endTime: calculateEndTime(startTime, estimatedDuration),
    notes: api.note ?? '',
    estimatedDuration,
    color: api.color ?? '1',
    status: mapApiStateToUiStatus(api.state),
  };
}

// ─── OverviewAppointment → Form (for edit from Overview/Calendar) ─

import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';

export function overviewAppointmentToFormData(
  overview: OverviewAppointment,
): Partial<UnifiedAppointmentFormData> {
  const startTime = normalizeTime(overview.time);
  return {
    id: overview.id,
    customerId: overview.customerId,
    customerName: overview.customerName,
    customerPhone: overview.customerPhone,
    doctorId: overview.doctorId || undefined,
    doctorName: overview.doctorName || undefined,
    assistantId: overview.assistantId ?? undefined,
    assistantName: overview.assistantName ?? undefined,
    dentalAideId: overview.dentalAideId ?? undefined,
    dentalAideName: overview.dentalAideName ?? undefined,
    locationId: overview.locationId,
    locationName: overview.locationName,
    appointmentType: 'consultation',
    serviceName: overview.note || '', // Overview doesn't have serviceName directly
    serviceId: overview.productId ?? undefined,
    date: overview.date,
    startTime,
    endTime: calculateEndTime(startTime, 30), // Default duration
    notes: overview.note,
    color: overview.color ?? '1',
    status: overview.topStatus,
  };
}

// ─── CalendarAppointment → Form (for edit from Calendar) ──────────

import type { CalendarAppointment } from '@/types/appointment';

export function calendarAppointmentToFormData(
  cal: CalendarAppointment,
): Partial<UnifiedAppointmentFormData> {
  const startTime = normalizeTime(cal.startTime);
  return {
    id: cal.id,
    customerId: cal.customerId,
    customerName: cal.customerName,
    customerPhone: cal.customerPhone,
    doctorId: cal.dentistId || undefined,
    doctorName: cal.dentist || undefined,
    assistantId: cal.assistantId ?? undefined,
    assistantName: cal.assistantName ?? undefined,
    dentalAideId: cal.dentalAideId ?? undefined,
    dentalAideName: cal.dentalAideName ?? undefined,
    locationId: cal.locationId,
    locationName: cal.locationName,
    appointmentType: cal.appointmentType,
    serviceName: cal.serviceName,
    serviceId: cal.productId ?? undefined,
    date: cal.date,
    startTime,
    endTime: calculateEndTime(startTime, cal.timeexpected ?? 30),
    notes: cal.notes ?? '',
    estimatedDuration: cal.timeexpected ?? 30,
    color: cal.color ?? '1',
    status: mapApiStateToUiStatus(cal.status),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function mapApiStateToUiStatus(
  state: string | null,
): 'scheduled' | 'arrived' | 'cancelled' | undefined {
  const s = state?.toLowerCase() ?? '';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'arrived' || s === 'confirmed' || s === 'in examination' || s === 'in-progress' || s === 'done' || s === 'completed') {
    return 'arrived';
  }
  return 'scheduled';
}
