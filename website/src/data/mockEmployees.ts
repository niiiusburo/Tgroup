/**
 * Employee types re-exported from /types/
 * @crossref:used-in[Employees, EmployeeProfile, ScheduleCalendar]
 */

import type { Employee, EmployeeTier, EmployeeRole, EmployeeStatus, ScheduleBlock } from '@/types/employee';
import { TIER_LABELS, TIER_STYLES, ROLE_LABELS, ROLE_STYLES, STATUS_STYLE_MAP } from '@/constants/statusStyles';
import { ROLE_TO_DB_FLAGS, inferRoleFromFlags, ALL_TIERS, ALL_ROLES } from '@/types/employee';

export type { Employee, EmployeeTier, EmployeeRole, EmployeeStatus, ScheduleBlock };
export { TIER_LABELS, TIER_STYLES, ROLE_LABELS, ROLE_STYLES, STATUS_STYLE_MAP };
export { ROLE_TO_DB_FLAGS, inferRoleFromFlags, ALL_TIERS, ALL_ROLES };
