import { apiStateToPhase, PHASE_VI_LABELS } from './appointmentStatusMapping';
import { parseAppointmentNote } from './appointmentNotes';
import type { CalendarAppointment } from '@/types/appointment';

export interface ExportRow {
  'Khách hàng': string;
  'Số điện thoại': string;
  'Thờigian hẹn': string;
  'Dịch vụ': string;
  'Bác sĩ': string;
  'Nội dung': string;
  'Loại khám': string;
  'Trạng thái': string;
  'Lý do': string;
  '': string;
}

function deriveVisitType(note: string): string {
  const parsed = parseAppointmentNote(note);
  const typeLower = parsed.type.toLowerCase();
  if (typeLower.includes('tksn') || typeLower.includes('khám mới')) return 'Khám mới';
  return 'Tái khám';
}

function formatAppointmentDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day}/${month}/${year} ${time}`;
}

export async function exportAppointmentsXlsx(
  appointments: CalendarAppointment[],
  filename: string,
): Promise<void> {
  const mod = await import('xlsx');
  const xlsx = (mod as any).default || mod;
  const { saveAs } = await import('file-saver');

  const sorted = [...appointments].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });

  const rows: ExportRow[] = sorted.map((apt) => {
    const phase = apiStateToPhase(apt.status);
    return {
      'Khách hàng': `${apt.customerCode ? `[${apt.customerCode}] ` : ''}${apt.customerName}`,
      'Số điện thoại': apt.customerPhone || '',
      'Thờigian hẹn': formatAppointmentDateTime(apt.date, apt.startTime),
      'Dịch vụ': apt.serviceName || '',
      'Bác sĩ': apt.dentist || '',
      'Nội dung': apt.notes || '',
      'Loại khám': deriveVisitType(apt.notes || ''),
      'Trạng thái': PHASE_VI_LABELS[phase],
      'Lý do': phase === 'cancelled' ? apt.notes || '' : '',
      '': '',
    };
  });

  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename);
}
