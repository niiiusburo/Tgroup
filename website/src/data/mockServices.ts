/**
 * Mock data for Service Records
 * @crossref:used-in[Services, useServices, ServiceForm, MultiVisitTracker, ServiceHistoryList]
 */

import type { AppointmentType } from '@/constants';

export type ServiceStatus = 'active' | 'completed' | 'cancelled' | 'planned';
export type VisitStatus = 'completed' | 'scheduled' | 'missed' | 'cancelled';

export interface ServiceCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly category: AppointmentType;
  readonly description: string;
  readonly defaultPrice: number;
  readonly estimatedDuration: number;
  readonly totalVisits: number;
}

export interface ServiceVisit {
  readonly id: string;
  readonly serviceRecordId: string;
  readonly visitNumber: number;
  readonly date: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly status: VisitStatus;
  readonly notes: string;
  readonly toothNumbers: readonly string[];
}

export interface ServiceRecord {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly catalogItemId: string;
  readonly serviceName: string;
  readonly category: AppointmentType;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly status: ServiceStatus;
  readonly totalVisits: number;
  readonly completedVisits: number;
  readonly totalCost: number;
  readonly paidAmount: number;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly notes: string;
  readonly toothNumbers: readonly string[];
  readonly visits: readonly ServiceVisit[];
  readonly createdAt: string;
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

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  planned: 'Planned',
};

export const SERVICE_STATUS_STYLES: Record<ServiceStatus, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  planned: 'bg-gray-100 text-gray-600',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  completed: 'Completed',
  scheduled: 'Scheduled',
  missed: 'Missed',
  cancelled: 'Cancelled',
};

export const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  missed: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const MOCK_SERVICE_CATALOG: readonly ServiceCatalogItem[] = [
  { id: 'cat-1', name: 'Teeth Cleaning', category: 'cleaning', description: 'Professional dental cleaning and polish', defaultPrice: 1_500_000, estimatedDuration: 30, totalVisits: 1 },
  { id: 'cat-2', name: 'Teeth Whitening', category: 'cosmetic', description: 'In-office whitening treatment (3 sessions)', defaultPrice: 6_000_000, estimatedDuration: 60, totalVisits: 3 },
  { id: 'cat-3', name: 'Root Canal Treatment', category: 'treatment', description: 'Endodontic root canal therapy', defaultPrice: 4_500_000, estimatedDuration: 90, totalVisits: 2 },
  { id: 'cat-4', name: 'Dental Filling', category: 'treatment', description: 'Composite resin filling restoration', defaultPrice: 1_200_000, estimatedDuration: 45, totalVisits: 1 },
  { id: 'cat-5', name: 'Braces - Metal', category: 'orthodontics', description: 'Traditional metal braces full treatment', defaultPrice: 25_000_000, estimatedDuration: 30, totalVisits: 18 },
  { id: 'cat-6', name: 'Braces - Ceramic', category: 'orthodontics', description: 'Ceramic braces full treatment', defaultPrice: 35_000_000, estimatedDuration: 30, totalVisits: 18 },
  { id: 'cat-7', name: 'Wisdom Tooth Extraction', category: 'surgery', description: 'Surgical removal of wisdom tooth', defaultPrice: 3_000_000, estimatedDuration: 60, totalVisits: 2 },
  { id: 'cat-8', name: 'Dental Implant', category: 'surgery', description: 'Single tooth implant with crown', defaultPrice: 18_000_000, estimatedDuration: 60, totalVisits: 5 },
  { id: 'cat-9', name: 'Porcelain Veneer', category: 'cosmetic', description: 'Custom porcelain veneer per tooth', defaultPrice: 8_000_000, estimatedDuration: 60, totalVisits: 3 },
  { id: 'cat-10', name: 'General Consultation', category: 'consultation', description: 'Initial examination and treatment plan', defaultPrice: 500_000, estimatedDuration: 30, totalVisits: 1 },
  { id: 'cat-11', name: 'Emergency Toothache', category: 'emergency', description: 'Emergency pain relief and diagnosis', defaultPrice: 800_000, estimatedDuration: 30, totalVisits: 1 },
  { id: 'cat-12', name: 'Dental Crown', category: 'treatment', description: 'Full ceramic crown restoration', defaultPrice: 5_500_000, estimatedDuration: 60, totalVisits: 2 },
];

export const MOCK_SERVICE_RECORDS: ServiceRecord[] = [
  {
    id: 'svc-r1', customerId: 'cust-1', customerName: 'Nguyen Van A', customerPhone: '0901-111-222',
    catalogItemId: 'cat-5', serviceName: 'Braces - Metal', category: 'orthodontics',
    doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', locationId: 'loc-1', locationName: 'District 1 Branch',
    status: 'active', totalVisits: 18, completedVisits: 12,
    totalCost: 25_000_000, paidAmount: 20_000_000,
    startDate: '2025-06-01', expectedEndDate: '2026-12-01',
    notes: 'Monthly wire adjustment. Progress on track.',
    toothNumbers: ['Full arch'],
    visits: (Array.from({ length: 12 }, (_, i): ServiceVisit => ({
      id: `v-r1-${i + 1}`, serviceRecordId: 'svc-r1', visitNumber: i + 1,
      date: offsetDate(-30 * (12 - i)), doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa',
      status: 'completed', notes: `Visit ${i + 1}: Wire adjustment`, toothNumbers: ['Full arch'],
    })) as ServiceVisit[]).concat([
      { id: 'v-r1-13', serviceRecordId: 'svc-r1', visitNumber: 13, date: offsetDate(7), doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', status: 'scheduled', notes: 'Next adjustment', toothNumbers: ['Full arch'] },
    ]),
    createdAt: '2025-06-01',
  },
  {
    id: 'svc-r2', customerId: 'cust-2', customerName: 'Tran Thi B', customerPhone: '0912-222-333',
    catalogItemId: 'cat-3', serviceName: 'Root Canal Treatment', category: 'treatment',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-1', locationName: 'District 1 Branch',
    status: 'active', totalVisits: 2, completedVisits: 1,
    totalCost: 4_500_000, paidAmount: 2_500_000,
    startDate: offsetDate(-7), expectedEndDate: offsetDate(14),
    notes: 'Second visit scheduled for permanent filling.',
    toothNumbers: ['#36'],
    visits: [
      { id: 'v-r2-1', serviceRecordId: 'svc-r2', visitNumber: 1, date: offsetDate(-7), doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', status: 'completed', notes: 'Pulp removal and temporary filling placed', toothNumbers: ['#36'] },
      { id: 'v-r2-2', serviceRecordId: 'svc-r2', visitNumber: 2, date: offsetDate(7), doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', status: 'scheduled', notes: 'Permanent filling and crown', toothNumbers: ['#36'] },
    ],
    createdAt: offsetDate(-7),
  },
  {
    id: 'svc-r3', customerId: 'cust-3', customerName: 'Le Van C', customerPhone: '0903-333-444',
    catalogItemId: 'cat-2', serviceName: 'Teeth Whitening', category: 'cosmetic',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-2', locationName: 'District 7 Branch',
    status: 'completed', totalVisits: 3, completedVisits: 3,
    totalCost: 6_000_000, paidAmount: 6_000_000,
    startDate: offsetDate(-60), expectedEndDate: offsetDate(-14),
    notes: 'All 3 sessions completed. Patient satisfied with results.',
    toothNumbers: ['Full arch'],
    visits: [
      { id: 'v-r3-1', serviceRecordId: 'svc-r3', visitNumber: 1, date: offsetDate(-60), doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', status: 'completed', notes: 'Session 1: Initial whitening', toothNumbers: ['Full arch'] },
      { id: 'v-r3-2', serviceRecordId: 'svc-r3', visitNumber: 2, date: offsetDate(-35), doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', status: 'completed', notes: 'Session 2: Follow-up whitening', toothNumbers: ['Full arch'] },
      { id: 'v-r3-3', serviceRecordId: 'svc-r3', visitNumber: 3, date: offsetDate(-14), doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', status: 'completed', notes: 'Session 3: Final whitening', toothNumbers: ['Full arch'] },
    ],
    createdAt: offsetDate(-60),
  },
  {
    id: 'svc-r4', customerId: 'cust-4', customerName: 'Pham Thi D', customerPhone: '0904-444-555',
    catalogItemId: 'cat-8', serviceName: 'Dental Implant', category: 'surgery',
    doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', locationId: 'loc-1', locationName: 'District 1 Branch',
    status: 'active', totalVisits: 5, completedVisits: 2,
    totalCost: 18_000_000, paidAmount: 10_000_000,
    startDate: offsetDate(-45), expectedEndDate: offsetDate(90),
    notes: 'Implant placed, osseointegration in progress.',
    toothNumbers: ['#46'],
    visits: [
      { id: 'v-r4-1', serviceRecordId: 'svc-r4', visitNumber: 1, date: offsetDate(-45), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'completed', notes: 'Consultation and X-ray', toothNumbers: ['#46'] },
      { id: 'v-r4-2', serviceRecordId: 'svc-r4', visitNumber: 2, date: offsetDate(-30), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'completed', notes: 'Implant post placement', toothNumbers: ['#46'] },
      { id: 'v-r4-3', serviceRecordId: 'svc-r4', visitNumber: 3, date: offsetDate(30), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'scheduled', notes: 'Check osseointegration', toothNumbers: ['#46'] },
      { id: 'v-r4-4', serviceRecordId: 'svc-r4', visitNumber: 4, date: offsetDate(60), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'scheduled', notes: 'Abutment placement', toothNumbers: ['#46'] },
      { id: 'v-r4-5', serviceRecordId: 'svc-r4', visitNumber: 5, date: offsetDate(90), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'scheduled', notes: 'Crown fitting', toothNumbers: ['#46'] },
    ],
    createdAt: offsetDate(-45),
  },
  {
    id: 'svc-r5', customerId: 'cust-5', customerName: 'Hoang Van E', customerPhone: '0905-555-666',
    catalogItemId: 'cat-9', serviceName: 'Porcelain Veneer', category: 'cosmetic',
    doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', locationId: 'loc-2', locationName: 'District 7 Branch',
    status: 'planned', totalVisits: 3, completedVisits: 0,
    totalCost: 16_000_000, paidAmount: 5_000_000,
    startDate: offsetDate(10), expectedEndDate: offsetDate(45),
    notes: 'Two teeth veneers, deposit paid.',
    toothNumbers: ['#11', '#21'],
    visits: [
      { id: 'v-r5-1', serviceRecordId: 'svc-r5', visitNumber: 1, date: offsetDate(10), doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', status: 'scheduled', notes: 'Preparation and impressions', toothNumbers: ['#11', '#21'] },
      { id: 'v-r5-2', serviceRecordId: 'svc-r5', visitNumber: 2, date: offsetDate(25), doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', status: 'scheduled', notes: 'Temporary veneers and fit check', toothNumbers: ['#11', '#21'] },
      { id: 'v-r5-3', serviceRecordId: 'svc-r5', visitNumber: 3, date: offsetDate(45), doctorId: 'emp-2', doctorName: 'Dr. Le Thi Hoa', status: 'scheduled', notes: 'Permanent veneer bonding', toothNumbers: ['#11', '#21'] },
    ],
    createdAt: todayStr,
  },
  {
    id: 'svc-r6', customerId: 'cust-6', customerName: 'Vo Thi F', customerPhone: '0906-666-777',
    catalogItemId: 'cat-1', serviceName: 'Teeth Cleaning', category: 'cleaning',
    doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', locationId: 'loc-3', locationName: 'Thu Duc Branch',
    status: 'completed', totalVisits: 1, completedVisits: 1,
    totalCost: 1_500_000, paidAmount: 1_500_000,
    startDate: offsetDate(-3), expectedEndDate: offsetDate(-3),
    notes: 'Regular cleaning, no issues.',
    toothNumbers: ['Full mouth'],
    visits: [
      { id: 'v-r6-1', serviceRecordId: 'svc-r6', visitNumber: 1, date: offsetDate(-3), doctorId: 'emp-1', doctorName: 'Dr. Tran Minh Duc', status: 'completed', notes: 'Standard cleaning and polish', toothNumbers: ['Full mouth'] },
    ],
    createdAt: offsetDate(-3),
  },
  {
    id: 'svc-r7', customerId: 'cust-7', customerName: 'Dao Van G', customerPhone: '0907-777-888',
    catalogItemId: 'cat-7', serviceName: 'Wisdom Tooth Extraction', category: 'surgery',
    doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', locationId: 'loc-1', locationName: 'District 1 Branch',
    status: 'active', totalVisits: 2, completedVisits: 1,
    totalCost: 3_000_000, paidAmount: 3_000_000,
    startDate: offsetDate(-5), expectedEndDate: offsetDate(10),
    notes: 'Extraction done, follow-up for suture removal.',
    toothNumbers: ['#48'],
    visits: [
      { id: 'v-r7-1', serviceRecordId: 'svc-r7', visitNumber: 1, date: offsetDate(-5), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'completed', notes: 'Wisdom tooth extraction under local anesthesia', toothNumbers: ['#48'] },
      { id: 'v-r7-2', serviceRecordId: 'svc-r7', visitNumber: 2, date: offsetDate(10), doctorId: 'emp-8', doctorName: 'Dr. Nguyen Thanh Son', status: 'scheduled', notes: 'Suture removal and healing check', toothNumbers: ['#48'] },
    ],
    createdAt: offsetDate(-5),
  },
];
