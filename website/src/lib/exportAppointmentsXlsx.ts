import * as XLSX from 'xlsx-js-style';
import { apiStateToPhase, type CalendarPhase } from './appointmentStatusMapping';
import { parseAppointmentNote } from './appointmentNotes';
import type { CalendarAppointment } from '@/types/appointment';

export function getExportHeaders(t: (key: string, options?: Record<string, unknown>) => string): string[] {
  return [
    t('export.customer', { ns: 'appointments', defaultValue: 'Customer' }),
    t('export.phone', { ns: 'appointments', defaultValue: 'Phone' }),
    t('export.appointmentTime', { ns: 'appointments', defaultValue: 'Appointment Time' }),
    t('export.service', { ns: 'appointments', defaultValue: 'Service' }),
    t('export.doctor', { ns: 'appointments', defaultValue: 'Doctor' }),
    t('export.content', { ns: 'appointments', defaultValue: 'Content' }),
    t('export.visitType', { ns: 'appointments', defaultValue: 'Visit Type' }),
    t('export.statusLabel', { ns: 'appointments', defaultValue: 'Status' }),
    t('export.reason', { ns: 'appointments', defaultValue: 'Reason' }),
    '', // column 10 intentionally blank
  ];
}

export function getExcelStatusLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  phase: CalendarPhase
): string {
  const map: Record<CalendarPhase, string> = {
    scheduled: t('export.status.scheduled', { ns: 'appointments', defaultValue: 'Scheduled' }),
    waiting: t('export.status.waiting', { ns: 'appointments', defaultValue: 'Arrived' }),
    'in-treatment': t('export.status.in-treatment', { ns: 'appointments', defaultValue: 'In Treatment' }),
    done: t('export.status.done', { ns: 'appointments', defaultValue: 'Completed' }),
    cancelled: t('export.status.cancelled', { ns: 'appointments', defaultValue: 'Cancelled' }),
  };
  return map[phase];
}

export function getVisitTypeLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  note: string
): string {
  const parsed = parseAppointmentNote(note);
  const typeLower = parsed.type.toLowerCase();
  if (typeLower.includes('tksn') || typeLower.includes('khám mới')) {
    return t('visitType.newExam', { ns: 'appointments', defaultValue: 'New Exam' });
  }
  return t('visitType.followUp', { ns: 'appointments', defaultValue: 'Follow-up' });
}

function formatAppointmentDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day}/${month}/${year} ${time}`;
}

export async function exportAppointmentsXlsx(
  appointments: CalendarAppointment[],
  filename: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): Promise<void> {
  const { saveAs } = await import('file-saver');

  const sorted = [...appointments].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });

  const headers = getExportHeaders(t);

  const data: (string | null)[][] = [headers];

  for (const apt of sorted) {
    const phase = apiStateToPhase(apt.status);
    data.push([
      `${apt.customerCode ? `[${apt.customerCode}] ` : ''}${apt.customerName}`,
      apt.customerPhone || '',
      formatAppointmentDateTime(apt.date, apt.startTime),
      apt.serviceName || '',
      apt.dentist || '',
      apt.notes || '',
      getVisitTypeLabel(t, apt.notes || ''),
      getExcelStatusLabel(t, phase),
      phase === 'cancelled' ? apt.notes || '' : '',
      '',
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Bold header row
  for (let c = 0; c < headers.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (!worksheet[cellRef]) continue;
    worksheet[cellRef].s = {
      font: { bold: true },
    };
  }

  // Auto-fit column widths to the longest cell content per column (+4 padding).
  // Clamped to [16, 60] so empty/short columns still look spacious and long
  // notes don't blow the sheet out horizontally.
  worksheet['!cols'] = headers.map((h, i) => {
    let max = h.length;
    for (let r = 1; r < data.length; r++) {
      const v = data[r][i];
      const len = v ? String(v).length : 0;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 4, 16), 60) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename);
}
