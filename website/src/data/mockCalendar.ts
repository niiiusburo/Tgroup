/**
 * Mock data for Calendar views
 * @crossref:used-in[Calendar, DayView, WeekView, MonthView, TimeSlot, AppointmentCard, AppointmentDetailsModal]
 */

import type { AppointmentType } from '@/constants';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';

export interface CalendarAppointment {
  readonly id: string;
  readonly customerName: string;
  readonly customerPhone: string;
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
  { id: 'apt-1', customerName: 'Nguyen Van A', customerPhone: '0901-111-222', serviceName: 'Teeth Cleaning', appointmentType: 'cleaning', dentist: 'Dr. Tran', dentistId: 'emp-1', date: todayStr, startTime: '08:00', endTime: '08:30', status: 'confirmed', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Regular 6-month cleaning', color: null },
  { id: 'apt-2', customerName: 'Tran Thi B', customerPhone: '0902-222-333', serviceName: 'Root Canal', appointmentType: 'treatment', dentist: 'Dr. Le', dentistId: 'emp-2', date: todayStr, startTime: '09:00', endTime: '10:30', status: 'scheduled', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Second visit for root canal therapy', color: null },
  { id: 'apt-3', customerName: 'Le Van C', customerPhone: '0903-333-444', serviceName: 'Dental Filling', appointmentType: 'treatment', dentist: 'Dr. Tran', dentistId: 'emp-1', date: todayStr, startTime: '10:00', endTime: '10:30', status: 'in-progress', locationId: 'loc-2', locationName: 'Branch 2 - District 7', notes: 'Composite filling, upper molar', color: null },
  { id: 'apt-4', customerName: 'Pham Thi D', customerPhone: '0904-444-555', serviceName: 'Whitening', appointmentType: 'cosmetic', dentist: 'Dr. Nguyen', dentistId: 'emp-8', date: todayStr, startTime: '13:00', endTime: '14:00', status: 'confirmed', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Zoom whitening session', color: null },
  { id: 'apt-5', customerName: 'Hoang Van E', customerPhone: '0905-555-666', serviceName: 'Braces Adjustment', appointmentType: 'orthodontics', dentist: 'Dr. Le', dentistId: 'emp-2', date: todayStr, startTime: '14:30', endTime: '15:00', status: 'scheduled', locationId: 'loc-2', locationName: 'Branch 2 - District 7', notes: 'Monthly wire adjustment', color: null },
  { id: 'apt-6', customerName: 'Vo Thi F', customerPhone: '0906-666-777', serviceName: 'Teeth Cleaning', appointmentType: 'cleaning', dentist: 'Dr. Tran', dentistId: 'emp-1', date: todayStr, startTime: '16:00', endTime: '16:30', status: 'confirmed', locationId: 'loc-3', locationName: 'Branch 3 - Binh Thanh', notes: '', color: null },
  { id: 'apt-7', customerName: 'Dao Van G', customerPhone: '0907-777-888', serviceName: 'Extraction', appointmentType: 'surgery', dentist: 'Dr. Nguyen', dentistId: 'emp-8', date: offsetDate(1), startTime: '09:00', endTime: '09:30', status: 'scheduled', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Wisdom tooth extraction', color: null },
  { id: 'apt-8', customerName: 'Bui Thi H', customerPhone: '0908-888-999', serviceName: 'Consultation', appointmentType: 'consultation', dentist: 'Dr. Le', dentistId: 'emp-2', date: offsetDate(1), startTime: '10:00', endTime: '10:30', status: 'confirmed', locationId: 'loc-2', locationName: 'Branch 2 - District 7', notes: 'New patient initial consultation', color: null },
  { id: 'apt-9', customerName: 'Ngo Van I', customerPhone: '0909-999-000', serviceName: 'Crown Fitting', appointmentType: 'treatment', dentist: 'Dr. Tran', dentistId: 'emp-1', date: offsetDate(2), startTime: '08:30', endTime: '09:30', status: 'scheduled', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Porcelain crown final fitting', color: null },
  { id: 'apt-10', customerName: 'Dang Thi K', customerPhone: '0910-000-111', serviceName: 'Dental Implant', appointmentType: 'surgery', dentist: 'Dr. Nguyen', dentistId: 'emp-8', date: offsetDate(2), startTime: '14:00', endTime: '16:00', status: 'confirmed', locationId: 'loc-3', locationName: 'Branch 3 - Binh Thanh', notes: 'Implant placement, lower jaw', color: null },
  { id: 'apt-11', customerName: 'Ly Van L', customerPhone: '0911-111-222', serviceName: 'Teeth Cleaning', appointmentType: 'cleaning', dentist: 'Dr. Le', dentistId: 'emp-2', date: offsetDate(-1), startTime: '11:00', endTime: '11:30', status: 'completed', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: '', color: null },
  { id: 'apt-12', customerName: 'Truong Thi M', customerPhone: '0912-222-333', serviceName: 'Filling', appointmentType: 'treatment', dentist: 'Dr. Tran', dentistId: 'emp-1', date: offsetDate(-1), startTime: '15:00', endTime: '15:30', status: 'completed', locationId: 'loc-2', locationName: 'Branch 2 - District 7', notes: '', color: null },
  { id: 'apt-13', customerName: 'Mai Van N', customerPhone: '0913-333-444', serviceName: 'Braces Check', appointmentType: 'orthodontics', dentist: 'Dr. Le', dentistId: 'emp-2', date: offsetDate(3), startTime: '09:30', endTime: '10:00', status: 'scheduled', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Quarterly progress check', color: null },
  { id: 'apt-14', customerName: 'Cao Thi P', customerPhone: '0914-444-555', serviceName: 'Whitening', appointmentType: 'cosmetic', dentist: 'Dr. Nguyen', dentistId: 'emp-8', date: offsetDate(4), startTime: '13:00', endTime: '14:00', status: 'confirmed', locationId: 'loc-2', locationName: 'Branch 2 - District 7', notes: 'Touch-up session', color: null },
  { id: 'apt-15', customerName: 'Duong Van Q', customerPhone: '0915-555-666', serviceName: 'Extraction', appointmentType: 'surgery', dentist: 'Dr. Tran', dentistId: 'emp-1', date: offsetDate(5), startTime: '08:00', endTime: '08:30', status: 'scheduled', locationId: 'loc-3', locationName: 'Branch 3 - Binh Thanh', notes: 'Simple extraction', color: null },
  { id: 'apt-16', customerName: 'Ha Thi R', customerPhone: '0916-666-777', serviceName: 'Root Canal', appointmentType: 'treatment', dentist: 'Dr. Le', dentistId: 'emp-2', date: offsetDate(-2), startTime: '10:00', endTime: '11:30', status: 'cancelled', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Patient requested cancellation', color: null },
  { id: 'apt-17', customerName: 'Trinh Van S', customerPhone: '0917-777-888', serviceName: 'Emergency Toothache', appointmentType: 'emergency', dentist: 'Dr. Tran', dentistId: 'emp-1', date: todayStr, startTime: '11:00', endTime: '11:30', status: 'confirmed', locationId: 'loc-1', locationName: 'Branch 1 - District 1', notes: 'Walk-in emergency, severe pain', color: null },
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

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
