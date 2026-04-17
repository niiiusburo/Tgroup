import * as XLSX from 'xlsx-js-style';
import { apiStateToPhase, type CalendarPhase } from './appointmentStatusMapping';
import { parseAppointmentNote } from './appointmentNotes';
import type { CalendarAppointment } from '@/types/appointment';

const EXCEL_STATUS_LABELS: Record<CalendarPhase, string> = {
  scheduled: 'Đang hẹn',
  waiting: 'Đã đến',
  'in-treatment': 'Đang khám',
  done: 'Hoàn thành',
  cancelled: 'Hủy hẹn',
};

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
  const { saveAs } = await import('file-saver');

  const sorted = [...appointments].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });

  const headers = [
    'Khách hàng',
    'Số điện thoại',
    'Thời gian hẹn',
    'Dịch vụ',
    'Bác sĩ',
    'Nội dung',
    'Loại khám',
    'Trạng thái',
    'Lý do',
    '', // column 10 intentionally blank
  ];

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
      deriveVisitType(apt.notes || ''),
      EXCEL_STATUS_LABELS[phase],
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

  // Auto-fit column widths to the longest cell content per column (+2 padding).
  // Clamped to [10, 60] so short labels stay readable and long notes don't
  // blow the sheet out horizontally.
  worksheet['!cols'] = headers.map((h, i) => {
    let max = h.length;
    for (let r = 1; r < data.length; r++) {
      const v = data[r][i];
      const len = v ? String(v).length : 0;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 10), 60) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename);
}
