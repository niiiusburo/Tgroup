/**
 * Mock data for Customer Profile View
 * @crossref:used-in[CustomerProfile, PhotoGallery, DepositCard, AppointmentHistory, ServiceHistory]
 */

export interface CustomerPhoto {
  readonly id: string;
  readonly url: string;
  readonly label: string;
  readonly date: string;
  readonly type: 'before' | 'after';
  readonly treatmentId: string;
}

export interface CustomerDeposit {
  readonly id: string;
  readonly customerId: string;
  readonly balance: number;
  readonly lastTopUp: string;
  readonly transactions: readonly DepositTransaction[];
}

export interface DepositTransaction {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly type: 'topup' | 'payment';
  readonly description: string;
}

export interface CustomerAppointment {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly doctor: string;
  readonly service: string;
  readonly status: 'completed' | 'cancelled' | 'no-show';
  readonly location: string;
  readonly notes: string;
}

export interface CustomerService {
  readonly id: string;
  readonly date: string;
  readonly service: string;
  readonly doctor: string;
  readonly cost: number;
  readonly status: 'completed' | 'in-progress' | 'planned';
  readonly tooth: string;
  readonly notes: string;
}

export interface CustomerProfileData {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly dateOfBirth: string;
  readonly gender: 'male' | 'female';
  readonly address: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly memberSince: string;
  readonly totalVisits: number;
  readonly totalSpent: number;
  readonly lastVisit: string;
  readonly notes: string;
  readonly tags: readonly string[];
}

export const MOCK_CUSTOMER_PROFILE: CustomerProfileData = {
  id: 'cust-1',
  name: 'Nguyen Van A',
  phone: '0901-111-222',
  email: 'a.nguyen@email.com',
  dateOfBirth: '1990-05-15',
  gender: 'male',
  address: '123 Nguyen Hue, District 1, HCMC',
  locationId: 'loc-1',
  locationName: 'TDental District 1',
  memberSince: '2023-03-10',
  totalVisits: 12,
  totalSpent: 45_600_000,
  lastVisit: '2026-03-28',
  notes: 'Prefers morning appointments. Allergic to penicillin.',
  tags: ['VIP', 'Orthodontics', 'Penicillin Allergy'],
};

export const MOCK_CUSTOMER_PHOTOS: readonly CustomerPhoto[] = [
  { id: 'photo-1', url: '', label: 'Front view - Before', date: '2024-01-15', type: 'before', treatmentId: 'svc-1' },
  { id: 'photo-2', url: '', label: 'Front view - After', date: '2024-06-20', type: 'after', treatmentId: 'svc-1' },
  { id: 'photo-3', url: '', label: 'Left side - Before', date: '2024-01-15', type: 'before', treatmentId: 'svc-1' },
  { id: 'photo-4', url: '', label: 'Left side - After', date: '2024-06-20', type: 'after', treatmentId: 'svc-1' },
  { id: 'photo-5', url: '', label: 'Upper arch - Before', date: '2025-02-10', type: 'before', treatmentId: 'svc-3' },
  { id: 'photo-6', url: '', label: 'Upper arch - After', date: '2025-08-15', type: 'after', treatmentId: 'svc-3' },
  { id: 'photo-7', url: '', label: 'Right side - Before', date: '2025-11-01', type: 'before', treatmentId: 'svc-5' },
  { id: 'photo-8', url: '', label: 'Right side - Progress', date: '2026-02-14', type: 'after', treatmentId: 'svc-5' },
];

export const MOCK_CUSTOMER_DEPOSIT: CustomerDeposit = {
  id: 'dep-1',
  customerId: 'cust-1',
  balance: 8_500_000,
  lastTopUp: '2026-03-01',
  transactions: [
    { id: 'tx-1', date: '2026-03-01', amount: 10_000_000, type: 'topup', description: 'Deposit top-up' },
    { id: 'tx-2', date: '2026-03-15', amount: -1_500_000, type: 'payment', description: 'Cleaning & checkup' },
    { id: 'tx-3', date: '2026-02-01', amount: 5_000_000, type: 'topup', description: 'Deposit top-up' },
    { id: 'tx-4', date: '2026-02-10', amount: -3_200_000, type: 'payment', description: 'Teeth whitening session' },
    { id: 'tx-5', date: '2026-01-15', amount: -1_800_000, type: 'payment', description: 'Orthodontic adjustment' },
  ],
};

export const MOCK_APPOINTMENT_HISTORY: readonly CustomerAppointment[] = [
  { id: 'apt-1', date: '2026-03-28', time: '09:00', doctor: 'Dr. Tran Minh', service: 'Cleaning & Checkup', status: 'completed', location: 'TDental District 1', notes: 'Regular cleaning, no issues found' },
  { id: 'apt-2', date: '2026-03-15', time: '10:30', doctor: 'Dr. Le Hoang', service: 'Orthodontic Adjustment', status: 'completed', location: 'TDental District 1', notes: 'Wire tightened, next visit in 4 weeks' },
  { id: 'apt-3', date: '2026-02-28', time: '14:00', doctor: 'Dr. Tran Minh', service: 'Teeth Whitening', status: 'completed', location: 'TDental District 1', notes: 'Session 2 of 3' },
  { id: 'apt-4', date: '2026-02-14', time: '09:30', doctor: 'Dr. Le Hoang', service: 'Orthodontic Adjustment', status: 'completed', location: 'TDental District 1', notes: 'Progress on track' },
  { id: 'apt-5', date: '2026-01-20', time: '11:00', doctor: 'Dr. Tran Minh', service: 'Consultation', status: 'cancelled', location: 'TDental District 1', notes: 'Patient cancelled due to schedule conflict' },
  { id: 'apt-6', date: '2025-12-15', time: '08:30', doctor: 'Dr. Nguyen Phuoc', service: 'Root Canal', status: 'completed', location: 'TDental District 1', notes: 'Tooth #36, completed successfully' },
  { id: 'apt-7', date: '2025-11-28', time: '15:00', doctor: 'Dr. Tran Minh', service: 'Cleaning & Checkup', status: 'no-show', location: 'TDental District 1', notes: 'No show, rescheduled' },
];

export const MOCK_SERVICE_HISTORY: readonly CustomerService[] = [
  { id: 'svc-1', date: '2024-01-15', service: 'Orthodontics - Braces', doctor: 'Dr. Le Hoang', cost: 25_000_000, status: 'completed', tooth: 'Full arch', notes: 'Metal braces, 18-month treatment completed' },
  { id: 'svc-2', date: '2025-12-15', service: 'Root Canal Treatment', doctor: 'Dr. Nguyen Phuoc', cost: 4_500_000, status: 'completed', tooth: '#36', notes: 'Single visit, ceramic crown placed' },
  { id: 'svc-3', date: '2025-02-10', service: 'Teeth Whitening', doctor: 'Dr. Tran Minh', cost: 6_000_000, status: 'completed', tooth: 'Full arch', notes: '3-session whitening package' },
  { id: 'svc-4', date: '2026-03-28', service: 'Cleaning & Checkup', doctor: 'Dr. Tran Minh', cost: 1_500_000, status: 'completed', tooth: 'Full mouth', notes: 'Regular 6-month cleaning' },
  { id: 'svc-5', date: '2025-11-01', service: 'Veneer - Porcelain', doctor: 'Dr. Le Hoang', cost: 8_000_000, status: 'in-progress', tooth: '#11, #21', notes: 'Temporary veneers placed, waiting for permanent' },
  { id: 'svc-6', date: '2026-04-15', service: 'Implant Consultation', doctor: 'Dr. Nguyen Phuoc', cost: 0, status: 'planned', tooth: '#46', notes: 'Evaluation for implant candidacy' },
];
