/**
 * Mock data for Calendar views
 * @crossref:used-in[Calendar, DayView, WeekView, MonthView, TimeSlot]
 */

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';

export interface CalendarAppointment {
  readonly id: string;
  readonly customerName: string;
  readonly serviceName: string;
  readonly dentist: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: AppointmentStatus;
  readonly locationId: string;
}

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const todayStr = `${yyyy}-${mm}-${dd}`;

function offsetDate(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const MOCK_APPOINTMENTS: readonly CalendarAppointment[] = [
  { id: 'apt-1', customerName: 'Nguyen Van A', serviceName: 'Teeth Cleaning', dentist: 'Dr. Tran', date: todayStr, startTime: '08:00', endTime: '08:30', status: 'confirmed', locationId: 'loc-1' },
  { id: 'apt-2', customerName: 'Tran Thi B', serviceName: 'Root Canal', dentist: 'Dr. Le', date: todayStr, startTime: '09:00', endTime: '10:30', status: 'scheduled', locationId: 'loc-1' },
  { id: 'apt-3', customerName: 'Le Van C', serviceName: 'Dental Filling', dentist: 'Dr. Tran', date: todayStr, startTime: '10:00', endTime: '10:30', status: 'in-progress', locationId: 'loc-2' },
  { id: 'apt-4', customerName: 'Pham Thi D', serviceName: 'Whitening', dentist: 'Dr. Nguyen', date: todayStr, startTime: '13:00', endTime: '14:00', status: 'confirmed', locationId: 'loc-1' },
  { id: 'apt-5', customerName: 'Hoang Van E', serviceName: 'Braces Adjustment', dentist: 'Dr. Le', date: todayStr, startTime: '14:30', endTime: '15:00', status: 'scheduled', locationId: 'loc-2' },
  { id: 'apt-6', customerName: 'Vo Thi F', serviceName: 'Teeth Cleaning', dentist: 'Dr. Tran', date: todayStr, startTime: '16:00', endTime: '16:30', status: 'confirmed', locationId: 'loc-3' },
  { id: 'apt-7', customerName: 'Dao Van G', serviceName: 'Extraction', dentist: 'Dr. Nguyen', date: offsetDate(1), startTime: '09:00', endTime: '09:30', status: 'scheduled', locationId: 'loc-1' },
  { id: 'apt-8', customerName: 'Bui Thi H', serviceName: 'Consultation', dentist: 'Dr. Le', date: offsetDate(1), startTime: '10:00', endTime: '10:30', status: 'confirmed', locationId: 'loc-2' },
  { id: 'apt-9', customerName: 'Ngo Van I', serviceName: 'Crown Fitting', dentist: 'Dr. Tran', date: offsetDate(2), startTime: '08:30', endTime: '09:30', status: 'scheduled', locationId: 'loc-1' },
  { id: 'apt-10', customerName: 'Dang Thi K', serviceName: 'Dental Implant', dentist: 'Dr. Nguyen', date: offsetDate(2), startTime: '14:00', endTime: '16:00', status: 'confirmed', locationId: 'loc-3' },
  { id: 'apt-11', customerName: 'Ly Van L', serviceName: 'Teeth Cleaning', dentist: 'Dr. Le', date: offsetDate(-1), startTime: '11:00', endTime: '11:30', status: 'completed', locationId: 'loc-1' },
  { id: 'apt-12', customerName: 'Truong Thi M', serviceName: 'Filling', dentist: 'Dr. Tran', date: offsetDate(-1), startTime: '15:00', endTime: '15:30', status: 'completed', locationId: 'loc-2' },
  { id: 'apt-13', customerName: 'Mai Van N', serviceName: 'Braces Check', dentist: 'Dr. Le', date: offsetDate(3), startTime: '09:30', endTime: '10:00', status: 'scheduled', locationId: 'loc-1' },
  { id: 'apt-14', customerName: 'Cao Thi P', serviceName: 'Whitening', dentist: 'Dr. Nguyen', date: offsetDate(4), startTime: '13:00', endTime: '14:00', status: 'confirmed', locationId: 'loc-2' },
  { id: 'apt-15', customerName: 'Duong Van Q', serviceName: 'Extraction', dentist: 'Dr. Tran', date: offsetDate(5), startTime: '08:00', endTime: '08:30', status: 'scheduled', locationId: 'loc-3' },
  { id: 'apt-16', customerName: 'Ha Thi R', serviceName: 'Root Canal', dentist: 'Dr. Le', date: offsetDate(-2), startTime: '10:00', endTime: '11:30', status: 'cancelled', locationId: 'loc-1' },
] as const;

export const STATUS_BADGE_STYLES: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  'in-progress': 'bg-purple-100 text-purple-700',
  completed: 'bg-sky-100 text-sky-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-green-500',
  'in-progress': 'bg-purple-500',
  completed: 'bg-sky-500',
  cancelled: 'bg-red-500',
};
