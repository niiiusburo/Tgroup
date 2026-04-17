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

  // Column widths matching the original TG Dental file
  worksheet['!cols'] = [
    { wch: 62 }, // Khách hàng
    { wch: 14 }, // Số điện thoại
    { wch: 16 }, // Thời gian hẹn
    { wch: 34 }, // Dịch vụ
    { wch: 21 }, // Bác sĩ
    { wch: 64 }, // Nội dung
    { wch: 11 }, // Loại khám
    { wch: 11 }, // Trạng thái
    { wch: 31 }, // Lý do
    { wch: 9 },  // (blank)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename);
}
