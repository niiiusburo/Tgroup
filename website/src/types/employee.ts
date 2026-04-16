/**
 * Employee-related type definitions
 * @crossref:used-in[Employees, EmployeeProfile, ScheduleCalendar, LinkedEmployees]
 */

export type EmployeeTier = 'super-admin' | 'admin' | 'editor' | 'receptionist' | 'assistant';

export type EmployeeRole =
  | 'general-manager'
  | 'branch-manager'
  | 'doctor'
  | 'doctor-assistant'
  | 'assistant'
  | 'receptionist'
  | 'sales-staff'
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
  readonly tierId: string;
  readonly tierName: string;
  readonly roles: readonly EmployeeRole[];
  readonly status: EmployeeStatus;
  readonly locationId: string;
  readonly locationName: string;
  readonly locationScopeIds?: readonly string[];
  readonly phone: string;
  readonly email: string;
  readonly schedule: readonly ScheduleBlock[];
  readonly linkedEmployeeIds: readonly string[];
  readonly hireDate: string;
}

// Employee role helper functions
export function inferRoleFromFlags(
  isDoctor: boolean,
  isAssistant: boolean,
  isReceptionist: boolean,
  jobtitle?: string | null,
): EmployeeRole {
  if (isDoctor) return 'doctor';
  if (isReceptionist) return 'receptionist';
  if (isAssistant) {
    if (jobtitle && jobtitle.toLowerCase().includes('trợ lý')) return 'doctor-assistant';
    return 'assistant';
  }
  // No role flags — classify by jobtitle
  if (jobtitle) {
    const lower = jobtitle.toLowerCase();
    if (lower.includes('quản lý') || lower.includes('manager') || lower.includes('quản trị') || lower.includes('admin')) return 'general-manager';
    if (lower.includes('marketing')) return 'marketing';
    if (lower.includes('sale')) return 'sales-staff';
    if (lower.includes('cskh') || lower.includes('customer service') || lower.includes('hỗ trợ')) return 'customer-service';
  }
  return 'assistant';
}

export const ROLE_TO_DB_FLAGS: Record<EmployeeRole, { 
  // camelCase (for internal use)
  isDoctor: boolean; 
  isAssistant: boolean; 
  isReceptionist: boolean; 
  // snake_case (for API calls)
  isdoctor: boolean;
  isassistant: boolean;
  isreceptionist: boolean;
}> = {
  'general-manager': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
  'branch-manager': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
  'doctor': { isDoctor: true, isAssistant: false, isReceptionist: false, isdoctor: true, isassistant: false, isreceptionist: false },
  'doctor-assistant': { isDoctor: false, isAssistant: true, isReceptionist: false, isdoctor: false, isassistant: true, isreceptionist: false },
  'assistant': { isDoctor: false, isAssistant: true, isReceptionist: false, isdoctor: false, isassistant: true, isreceptionist: false },
  'receptionist': { isDoctor: false, isAssistant: false, isReceptionist: true, isdoctor: false, isassistant: false, isreceptionist: true },
  'sales-staff': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
  'customer-service': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
  'marketing': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
};

export const ALL_TIERS: readonly EmployeeTier[] = ['super-admin', 'admin', 'editor', 'receptionist', 'assistant'];
export const ALL_ROLES: readonly EmployeeRole[] = [
  'general-manager',
  'branch-manager',
  'doctor',
  'doctor-assistant',
  'assistant',
  'receptionist',
  'sales-staff',
  'customer-service',
  'marketing',
];
