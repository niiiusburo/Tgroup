/**
 * Employee-related type definitions
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

// Employee role helper functions
export function inferRoleFromFlags(
  isDoctor: boolean,
  isAssistant: boolean,
  isReceptionist: boolean,
): EmployeeRole {
  if (isDoctor) return 'doctor';
  if (isReceptionist) return 'receptionist';
  if (isAssistant) return 'assistant';
  return 'customer-service';
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
  'sale-online': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
  'customer-service': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
  'marketing': { isDoctor: false, isAssistant: false, isReceptionist: false, isdoctor: false, isassistant: false, isreceptionist: false },
};

export const ALL_TIERS: readonly EmployeeTier[] = ['junior', 'mid', 'senior', 'lead', 'director'];
export const ALL_ROLES: readonly EmployeeRole[] = [
  'general-manager',
  'branch-manager',
  'doctor',
  'doctor-assistant',
  'assistant',
  'receptionist',
  'sale-online',
  'customer-service',
  'marketing',
];
