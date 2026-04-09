/**
 * Mock data for Employee management
 * @crossref:used-in[Employees, EmployeeProfile, ScheduleCalendar, LinkedEmployees]
 */

export type EmployeeTier = 'junior' | 'mid' | 'senior' | 'lead' | 'director';

export type EmployeeRole =
  | 'general-manager'
  | 'branch-manager'
  | 'doctor'
  | 'doctor-assistant'
  | 'assistant'
  | 'receptionist'
  | 'sale-online'
  | 'customer-service'
  | 'marketing';

export type EmployeeStatus = 'active' | 'on-leave' | 'inactive';

export interface ScheduleBlock {
  readonly day: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
  readonly tier: EmployeeTier;
  readonly roles: readonly EmployeeRole[];
  readonly status: EmployeeStatus;
  readonly locationId: string;
  readonly locationName: string;
  readonly phone: string;
  readonly email: string;
  readonly schedule: readonly ScheduleBlock[];
  readonly linkedEmployeeIds: readonly string[];
  readonly hireDate: string;
}

export const TIER_LABELS: Record<EmployeeTier, string> = {
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
};

export const TIER_STYLES: Record<EmployeeTier, string> = {
  junior: 'bg-gray-100 text-gray-700',
  mid: 'bg-blue-100 text-blue-700',
  senior: 'bg-purple-100 text-purple-700',
  lead: 'bg-amber-100 text-amber-700',
  director: 'bg-rose-100 text-rose-700',
};

// Map role to DB boolean flags
export const ROLE_TO_DB_FLAGS: Record<EmployeeRole, { isdoctor: boolean; isassistant: boolean; isreceptionist: boolean }> = {
  'general-manager': { isdoctor: false, isassistant: false, isreceptionist: false },
  'branch-manager': { isdoctor: false, isassistant: false, isreceptionist: false },
  'doctor': { isdoctor: true, isassistant: false, isreceptionist: false },
  'doctor-assistant': { isdoctor: false, isassistant: true, isreceptionist: false },
  'assistant': { isdoctor: false, isassistant: true, isreceptionist: false },
  'receptionist': { isdoctor: false, isassistant: false, isreceptionist: true },
  'sale-online': { isdoctor: false, isassistant: false, isreceptionist: true },
  'customer-service': { isdoctor: false, isassistant: false, isreceptionist: true },
  'marketing': { isdoctor: false, isassistant: false, isreceptionist: false },
};

// Map DB flags back to primary role
export function inferRoleFromFlags(isdoctor: boolean, isassistant: boolean, isreceptionist: boolean): EmployeeRole {
  if (isdoctor) return 'doctor';
  if (isassistant) return 'assistant';
  if (isreceptionist) return 'receptionist';
  return 'general-manager';
}

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  'general-manager': 'Quản lý tổng',
  'branch-manager': 'Quản lý cơ sở',
  'doctor': 'Bác sĩ',
  'doctor-assistant': 'Trợ lý Bác sĩ',
  'assistant': 'Phụ tá',
  'receptionist': 'Lễ tân',
  'sale-online': 'Sale online',
  'customer-service': 'CSKH',
  'marketing': 'Marketing',
};

export const ROLE_STYLES: Record<EmployeeRole, string> = {
  'general-manager': 'bg-purple-100 text-purple-700',
  'branch-manager': 'bg-indigo-100 text-indigo-700',
  'doctor': 'bg-sky-100 text-sky-700',
  'doctor-assistant': 'bg-teal-100 text-teal-700',
  'assistant': 'bg-green-100 text-green-700',
  'receptionist': 'bg-orange-100 text-orange-700',
  'sale-online': 'bg-blue-100 text-blue-700',
  'customer-service': 'bg-pink-100 text-pink-700',
  'marketing': 'bg-amber-100 text-amber-700',
};

export const STATUS_BADGE_STYLES: Record<EmployeeStatus, string> = {
  active: 'bg-green-100 text-green-700',
  'on-leave': 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
};

export const ALL_TIERS: readonly EmployeeTier[] = [
  'junior', 'mid', 'senior', 'lead', 'director',
] as const;

export const ALL_ROLES: readonly EmployeeRole[] = [
  'general-manager', 'branch-manager', 'doctor', 'doctor-assistant',
  'assistant', 'receptionist', 'sale-online', 'customer-service', 'marketing',
] as const;

export const MOCK_EMPLOYEES: readonly Employee[] = [
  {
    id: 'emp-1',
    name: 'Dr. Tran Minh Duc',
    avatar: 'TD',
    tier: 'senior',
    roles: ['doctor'],
    status: 'active',
    locationId: 'loc-1',
    locationName: 'District 1',
    phone: '0901-234-567',
    email: 'duc.tran@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '08:00', endTime: '17:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '12:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '17:00' },
      { day: 'Friday', startTime: '08:00', endTime: '17:00' },
    ],
    linkedEmployeeIds: ['emp-3', 'emp-5'],
    hireDate: '2019-03-15',
  },
  {
    id: 'emp-2',
    name: 'Dr. Le Thi Hoa',
    avatar: 'LH',
    tier: 'lead',
    roles: ['doctor'],
    status: 'active',
    locationId: 'loc-2',
    locationName: 'District 7',
    phone: '0912-345-678',
    email: 'hoa.le@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '18:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '09:00', endTime: '18:00' },
      { day: 'Friday', startTime: '09:00', endTime: '18:00' },
      { day: 'Saturday', startTime: '08:00', endTime: '12:00' },
    ],
    linkedEmployeeIds: ['emp-4', 'emp-6'],
    hireDate: '2018-07-01',
  },
  {
    id: 'emp-3',
    name: 'Nguyen Van Binh',
    avatar: 'NB',
    tier: 'mid',
    roles: ['assistant'],
    status: 'active',
    locationId: 'loc-1',
    locationName: 'District 1',
    phone: '0923-456-789',
    email: 'binh.nguyen@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '08:00', endTime: '16:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '16:00' },
      { day: 'Friday', startTime: '08:00', endTime: '16:00' },
    ],
    linkedEmployeeIds: ['emp-1'],
    hireDate: '2021-01-10',
  },
  {
    id: 'emp-4',
    name: 'Pham Thi Mai',
    avatar: 'PM',
    tier: 'junior',
    roles: ['assistant'],
    status: 'active',
    locationId: 'loc-2',
    locationName: 'District 7',
    phone: '0934-567-890',
    email: 'mai.pham@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '08:00', endTime: '17:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '17:00' },
      { day: 'Friday', startTime: '08:00', endTime: '17:00' },
      { day: 'Saturday', startTime: '08:00', endTime: '12:00' },
    ],
    linkedEmployeeIds: ['emp-2'],
    hireDate: '2023-06-15',
  },
  {
    id: 'emp-5',
    name: 'Hoang Anh Tuan',
    avatar: 'HT',
    tier: 'mid',
    roles: ['assistant', 'receptionist'],
    status: 'on-leave',
    locationId: 'loc-1',
    locationName: 'District 1',
    phone: '0945-678-901',
    email: 'tuan.hoang@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '07:30', endTime: '16:30' },
      { day: 'Tuesday', startTime: '07:30', endTime: '16:30' },
      { day: 'Wednesday', startTime: '07:30', endTime: '16:30' },
      { day: 'Thursday', startTime: '07:30', endTime: '16:30' },
      { day: 'Friday', startTime: '07:30', endTime: '16:30' },
    ],
    linkedEmployeeIds: ['emp-1'],
    hireDate: '2022-02-20',
  },
  {
    id: 'emp-6',
    name: 'Vo Thi Lan',
    avatar: 'VL',
    tier: 'senior',
    roles: ['branch-manager', 'receptionist'],
    status: 'active',
    locationId: 'loc-3',
    locationName: 'Thu Duc',
    phone: '0956-789-012',
    email: 'lan.vo@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '08:00', endTime: '17:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '17:00' },
      { day: 'Friday', startTime: '08:00', endTime: '17:00' },
    ],
    linkedEmployeeIds: ['emp-2'],
    hireDate: '2020-11-01',
  },
  {
    id: 'emp-7',
    name: 'Dao Quoc Hung',
    avatar: 'DH',
    tier: 'junior',
    roles: ['marketing'],
    status: 'active',
    locationId: 'loc-1',
    locationName: 'District 1',
    phone: '0967-890-123',
    email: 'hung.dao@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '18:00' },
      { day: 'Tuesday', startTime: '09:00', endTime: '18:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '09:00', endTime: '18:00' },
    ],
    linkedEmployeeIds: ['emp-1', 'emp-2'],
    hireDate: '2024-01-08',
  },
  {
    id: 'emp-8',
    name: 'Dr. Nguyen Thanh Son',
    avatar: 'NS',
    tier: 'director',
    roles: ['doctor', 'general-manager'],
    status: 'active',
    locationId: 'loc-1',
    locationName: 'District 1',
    phone: '0978-901-234',
    email: 'son.nguyen@tdental.vn',
    schedule: [
      { day: 'Monday', startTime: '08:00', endTime: '17:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '17:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '12:00' },
      { day: 'Friday', startTime: '08:00', endTime: '17:00' },
    ],
    linkedEmployeeIds: ['emp-1', 'emp-2', 'emp-6'],
    hireDate: '2015-05-01',
  },
] as const;
