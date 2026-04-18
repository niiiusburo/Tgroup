/**
 * Calendar and appointment mapping utilities
 */

import { type CalendarAppointment } from '@/data/mockCalendar';
import { type ApiAppointment } from '@/lib/api';
import { apiStateToPhase } from './appointmentStatusMapping';
import { getStoredArrivalTime } from './arrivalTimeStorage';

/**
 * Calculate end time given a start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number | null | undefined): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + (durationMinutes || 30);
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Convert a UTC ISO date string to a Vietnam local date string (YYYY-MM-DD)
 */
export function utcToLocalDateStr(isoDate: string): string {
  if (!isoDate.includes('T')) return isoDate;
  const d = new Date(isoDate);
  // en-CA gives YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Map appointment state string to CalendarAppointment status
 */
export function mapStateToStatus(state: string | null): CalendarAppointment['status'] {
  const stateMap: Record<string, CalendarAppointment['status']> = {
    draft: 'scheduled',
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    arrived: 'confirmed',
    'in examination': 'in-progress',
    'in-progress': 'in-progress',
    done: 'completed',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return stateMap[state?.toLowerCase().trim() || ''] || 'scheduled';
}

/**
 * Map hex color or tailwind color class to a usable color code
 */
export function mapHexToColorCode(color: string | null | undefined): string | null {
  if (color === null || color === undefined) return null;
  if (/^[0-7]$/.test(color)) return color;
  const hexMap: Record<string, string> = {
    '#ef4444': '3',
    '#3b82f6': '0',
    '#10b981': '1',
    '#f59e0b': '2',
    '#8b5cf6': '4',
    '#ec4899': '5',
    '#06b6d4': '6',
    '#84cc16': '7',
  };
  return hexMap[color.toLowerCase()] ?? null;
}

/**
 * Strip system metadata from notes, keeping only user comments
 * Removes lines like "Duration: 30 min", "Type: Khách mới", "Auto-populated ..."
 */
export function stripNotesMetadata(note: string | null | undefined): string {
  if (!note) return '';
  const lines = note.split('\n');
  const metadataPatterns = [
    /^duration:\s*\d+\s*min/i,
    /^type:\s*/i,
    /^auto-populated/i,
  ];
  const userLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return !metadataPatterns.some((pattern) => pattern.test(trimmed));
  });
  return userLines.join('\n').trim();
}

/**
 * Derive appointment type from reason/note text
 */
export function deriveAppointmentType(text: string): CalendarAppointment['appointmentType'] {
  const lower = text.toLowerCase();
  if (/lấy cao|vệ sinh/.test(lower)) return 'cleaning';
  if (/niềng|chỉnh nha/.test(lower)) return 'orthodontics';
  if (/nhổ|phẫu/.test(lower)) return 'surgery';
  if (/tẩy trắng|thẩm mỹ/.test(lower)) return 'cosmetic';
  if (/cấp cứu|đau/.test(lower)) return 'emergency';
  if (/khám|tư vấn/.test(lower)) return 'consultation';
  return 'treatment';
}

/**
 * Map a backend API appointment to a CalendarAppointment
 */
export function mapApiAppointmentToCalendar(apt: ApiAppointment): CalendarAppointment {
  const dateStr = apt.date ? utcToLocalDateStr(apt.date) : '';
  const startTime = apt.time || '09:00';
  const endTime = calculateEndTime(startTime, apt.timeexpected);
  const storedArrival = getStoredArrivalTime(apt.id);
  const phase = apiStateToPhase(apt.state);
  const arrivalTime = storedArrival ?? (phase !== 'scheduled' && phase !== 'cancelled' ? startTime : null);
  const treatmentStartTime = phase === 'in-treatment' || phase === 'done' ? startTime : null;

  return {
    id: apt.id,
    customerId: apt.partnerid || '',
    customerName: apt.partnername || '',
    customerPhone: apt.partnerphone || '',
    customerCode: apt.partnercode || '',
    serviceName: apt.productname || apt.name || apt.note || '',
    appointmentType: deriveAppointmentType(apt.reason || apt.note || ''),
    dentist: apt.doctorname || '',
    dentistId: apt.doctorid || '',
    date: dateStr,
    startTime,
    endTime,
    status: mapStateToStatus(apt.state),
    locationId: apt.companyid || '',
    locationName: apt.companyname || '',
    notes: stripNotesMetadata(apt.note),
    color: mapHexToColorCode(apt.color),
    timeexpected: apt.timeexpected ?? apt.timeExpected ?? null,
    arrivalTime,
    treatmentStartTime,
    assistantId: apt.assistantid ?? null,
    assistantName: apt.assistantname ?? null,
    dentalAideId: apt.dentalaideid ?? null,
    dentalAideName: apt.dentalaidename ?? null,
    productId: apt.productid ?? null,
  };
}
