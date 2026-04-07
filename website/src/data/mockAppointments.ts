/**
 * Mock data for Appointments Management
 * @crossref:used-in[Appointments, CheckInFlow, WaitTimer, useAppointments]
 */

import type { AppointmentType } from '@/constants';
import type { AppointmentStatus } from '@/data/mockCalendar';

export type CheckInStatus = 'not-arrived' | 'arrived' | 'waiting' | 'in-treatment' | 'done';

export interface ManagedAppointment {
  readonly id: string;
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
  readonly status: AppointmentStatus;
  readonly checkInStatus: CheckInStatus;
  readonly arrivalTime: string | null;
  readonly treatmentStartTime: string | null;
  readonly completionTime: string | null;
  readonly notes: string;
  readonly convertedToServiceId: string | null;
}

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const todayStr = `${yyyy}-${mm}-${dd}`;

function offsetDate(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CHECK_IN_STATUS_LABELS: Record<CheckInStatus, string> = {
  'not-arrived': 'Not Arrived',
  arrived: 'Arrived',
  waiting: 'Waiting',
  'in-treatment': 'In Treatment',
  done: 'Done',
};

export const CHECK_IN_STATUS_STYLES: Record<CheckInStatus, string> = {
  'not-arrived': 'bg-gray-100 text-gray-600',
  arrived: 'bg-blue-100 text-blue-700',
  waiting: 'bg-amber-100 text-amber-700',
  'in-treatment': 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};

export const CHECK_IN_FLOW_ORDER: readonly CheckInStatus[] = [
  'not-arrived',
  'arrived',
  'waiting',
  'in-treatment',
  'done',
] as const;

export const MOCK_MANAGED_APPOINTMENTS: ManagedAppointment[] = [
  {
    id: 'apt-1', customerId: 'cust-1', customerName: 'Nguyen Van A', customerPhone: '0901-111-222',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-1', locationName: 'District 1 Branch',
    appointmentType: 'cleaning', serviceName: 'Teeth Cleaning',
    date: todayStr, startTime: '08:00', endTime: '08:30',
    status: 'confirmed', checkInStatus: 'in-treatment',
    arrivalTime: '07:45', treatmentStartTime: '08:05', completionTime: null,
    notes: 'Regular 6-month cleaning', convertedToServiceId: null,
  },
  {
    id: 'apt-2', customerId: 'cust-2', customerName: 'Tran Thi B', customerPhone: '0912-222-333',
    doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', locationId: 'loc-1', locationName: 'District 1 Branch',
    appointmentType: 'treatment', serviceName: 'Root Canal',
    date: todayStr, startTime: '09:00', endTime: '10:30',
    status: 'confirmed', checkInStatus: 'waiting',
    arrivalTime: '08:50', treatmentStartTime: null, completionTime: null,
    notes: 'Second visit for root canal therapy', convertedToServiceId: null,
  },
  {
    id: 'apt-3', customerId: 'cust-3', customerName: 'Le Van C', customerPhone: '0903-333-444',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-2', locationName: 'District 7 Branch',
    appointmentType: 'treatment', serviceName: 'Dental Filling',
    date: todayStr, startTime: '10:00', endTime: '10:30',
    status: 'scheduled', checkInStatus: 'arrived',
    arrivalTime: '09:55', treatmentStartTime: null, completionTime: null,
    notes: 'Composite filling, upper molar', convertedToServiceId: null,
  },
  {
    id: 'apt-4', customerId: 'cust-4', customerName: 'Pham Thi D', customerPhone: '0904-444-555',
    doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', locationId: 'loc-1', locationName: 'District 1 Branch',
    appointmentType: 'cosmetic', serviceName: 'Whitening',
    date: todayStr, startTime: '13:00', endTime: '14:00',
    status: 'confirmed', checkInStatus: 'not-arrived',
    arrivalTime: null, treatmentStartTime: null, completionTime: null,
    notes: 'Zoom whitening session', convertedToServiceId: null,
  },
  {
    id: 'apt-5', customerId: 'cust-5', customerName: 'Hoang Van E', customerPhone: '0905-555-666',
    doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', locationId: 'loc-2', locationName: 'District 7 Branch',
    appointmentType: 'orthodontics', serviceName: 'Braces Adjustment',
    date: todayStr, startTime: '14:30', endTime: '15:00',
    status: 'scheduled', checkInStatus: 'not-arrived',
    arrivalTime: null, treatmentStartTime: null, completionTime: null,
    notes: 'Monthly wire adjustment', convertedToServiceId: null,
  },
  {
    id: 'apt-6', customerId: 'cust-6', customerName: 'Vo Thi F', customerPhone: '0906-666-777',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-3', locationName: 'Thu Duc Branch',
    appointmentType: 'cleaning', serviceName: 'Teeth Cleaning',
    date: todayStr, startTime: '16:00', endTime: '16:30',
    status: 'confirmed', checkInStatus: 'not-arrived',
    arrivalTime: null, treatmentStartTime: null, completionTime: null,
    notes: '', convertedToServiceId: null,
  },
  {
    id: 'apt-17', customerId: 'cust-7', customerName: 'Trinh Van S', customerPhone: '0917-777-888',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-1', locationName: 'District 1 Branch',
    appointmentType: 'emergency', serviceName: 'Emergency Toothache',
    date: todayStr, startTime: '11:00', endTime: '11:30',
    status: 'confirmed', checkInStatus: 'done',
    arrivalTime: '10:50', treatmentStartTime: '11:00', completionTime: '11:25',
    notes: 'Walk-in emergency, severe pain', convertedToServiceId: 'svc-101',
  },
  {
    id: 'apt-7', customerId: 'cust-7', customerName: 'Dao Van G', customerPhone: '0907-777-888',
    doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', locationId: 'loc-1', locationName: 'District 1 Branch',
    appointmentType: 'surgery', serviceName: 'Extraction',
    date: offsetDate(1), startTime: '09:00', endTime: '09:30',
    status: 'scheduled', checkInStatus: 'not-arrived',
    arrivalTime: null, treatmentStartTime: null, completionTime: null,
    notes: 'Wisdom tooth extraction', convertedToServiceId: null,
  },
  {
    id: 'apt-8', customerId: 'cust-8', customerName: 'Bui Thi H', customerPhone: '0908-888-999',
    doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', locationId: 'loc-2', locationName: 'District 7 Branch',
    appointmentType: 'consultation', serviceName: 'Consultation',
    date: offsetDate(1), startTime: '10:00', endTime: '10:30',
    status: 'confirmed', checkInStatus: 'not-arrived',
    arrivalTime: null, treatmentStartTime: null, completionTime: null,
    notes: 'New patient initial consultation', convertedToServiceId: null,
  },
  {
    id: 'apt-11', customerId: 'cust-1', customerName: 'Ly Van L', customerPhone: '0911-111-222',
    doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', locationId: 'loc-1', locationName: 'District 1 Branch',
    appointmentType: 'cleaning', serviceName: 'Teeth Cleaning',
    date: offsetDate(-1), startTime: '11:00', endTime: '11:30',
    status: 'completed', checkInStatus: 'done',
    arrivalTime: '10:55', treatmentStartTime: '11:00', completionTime: '11:25',
    notes: '', convertedToServiceId: 'svc-100',
  },
];
