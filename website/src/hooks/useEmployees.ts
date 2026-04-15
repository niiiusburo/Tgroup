import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { fetchEmployees, type ApiEmployee } from '@/lib/api';
import {
  type Employee,
  type EmployeeTier,
  type EmployeeRole,
  type EmployeeStatus,
} from '@/data/mockEmployees';

/**
 * Map API employee status to Employee status
 */
function mapApiStatus(active: boolean): EmployeeStatus {
  return active ? 'active' : 'inactive';
}

/**
 * Derive tier from hrjobname
 */
function deriveTier(hrjobname: string | null): EmployeeTier {
  if (!hrjobname) return 'mid';
  const lower = hrjobname.toLowerCase();

  if (lower.includes('trưởng') || lower.includes('director')) return 'director';
  if (lower.includes('phó') || lower.includes('lead')) return 'lead';
  if (lower.includes('senior') || lower.includes('chính')) return 'senior';

  return 'mid';
}

/**
 * Derive roles from API employee flags and hrjobname
 */
function deriveRoles(
  isdoctor: boolean,
  isassistant: boolean,
  isreceptionist: boolean,
  jobtitle: string | null
): readonly EmployeeRole[] {
  // Single-role: return exactly one role based on DB flags + jobtitle
  if (isdoctor) return ['doctor'];
  if (isreceptionist) return ['receptionist'];
  if (isassistant) {
    if (jobtitle && jobtitle.toLowerCase().includes('trợ lý')) {
      return ['doctor-assistant'];
    }
    return ['assistant'];
  }

  // No role flags set — classify by jobtitle
  if (jobtitle) {
    const lower = jobtitle.toLowerCase();
    if (lower.includes('quản lý') || lower.includes('manager')) return ['general-manager'];
    if (lower.includes('marketing')) return ['marketing'];
    if (lower.includes('sale')) return ['sales-staff'];
    if (lower.includes('cskh') || lower.includes('customer service') || lower.includes('hỗ trợ')) return ['customer-service'];
    if (lower.includes('quản trị') || lower.includes('admin')) return ['general-manager'];
  }

  return ['assistant'];
}

/**
 * Map API employee to domain Employee
 */
function mapApiEmployeeToEmployee(apiEmployee: ApiEmployee): Employee {
  return {
    id: apiEmployee.id,
    name: apiEmployee.name,
    avatar: apiEmployee.avatar || '',
    tier: deriveTier(apiEmployee.hrjobname),
    roles: deriveRoles(
      apiEmployee.isdoctor,
      apiEmployee.isassistant,
      apiEmployee.isreceptionist,
      apiEmployee.jobtitle ?? null
    ),
    status: mapApiStatus(apiEmployee.active),
    locationId: apiEmployee.companyid || '',
    locationName: apiEmployee.companyname || '',
    locationScopeIds: apiEmployee.locationScopeIds ?? [],
    phone: apiEmployee.phone || '',
    email: apiEmployee.email || '',
    schedule: [],
    linkedEmployeeIds: [],
    hireDate: apiEmployee.startworkdate
      ? apiEmployee.startworkdate.split('T')[0]
      : apiEmployee.datecreated
      ? apiEmployee.datecreated.split('T')[0]
      : '',
  };
}

/**
 * Extended Employee type with API fields
 */
interface EmployeeWithApiFields extends Employee {
  readonly ref?: string | null;
  readonly companyname?: string | null;
  readonly hrjobname?: string | null;
  readonly jobtitle?: string | null;
  readonly wage?: string | null;
  readonly allowance?: string | null;
  readonly locationScopeIds?: readonly string[];
}

/**
 * Hook for employee data and operations (using real API)
 * @crossref:used-in[Employees, Appointments, Calendar, Customers]
 */
export function useEmployees(selectedLocationId?: string) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<EmployeeTier | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');

  const [allEmployees, setAllEmployees] = useState<EmployeeWithApiFields[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  /**
   * Fetch employees from API with debounced search
   */
  const fetchAndSetEmployees = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchEmployees({
        offset: 0,
        limit: 500,
        search,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
        active: 'all',
      });

      const employeesWithApiFields: EmployeeWithApiFields[] = response.items.map((apiEmp) => {
        const employee = mapApiEmployeeToEmployee(apiEmp);
        return {
          ...employee,
          ref: apiEmp.ref,
          companyname: apiEmp.companyname,
          hrjobname: apiEmp.hrjobname,
          jobtitle: apiEmp.jobtitle,
          wage: apiEmp.wage,
          allowance: apiEmp.allowance,
          locationScopeIds: apiEmp.locationScopeIds ?? [],
        };
      });

      setAllEmployees(employeesWithApiFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchAndSetEmployees();
  }, [fetchAndSetEmployees]);

  /**
   * Debounced search
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchAndSetEmployees(searchQuery || undefined);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchAndSetEmployees]);

  /**
   * Filter counts derived from allEmployees (reflects search + location context)
   */
  const filterCounts = useMemo(() => {
    const statusCounts: Record<EmployeeStatus | 'all', number> = {
      all: allEmployees.length,
      active: 0,
      'on-leave': 0,
      inactive: 0,
    };
    const tierCounts: Record<EmployeeTier | 'all', number> = {
      all: allEmployees.length,
      junior: 0,
      mid: 0,
      senior: 0,
      lead: 0,
      director: 0,
    };
    const roleCounts: Record<EmployeeRole | 'all', number> = {
      all: allEmployees.length,
      'general-manager': 0,
      'branch-manager': 0,
      doctor: 0,
      'doctor-assistant': 0,
      assistant: 0,
      receptionist: 0,
      'sales-staff': 0,
      'customer-service': 0,
      marketing: 0,
    };

    for (const emp of allEmployees) {
      if (emp.status === 'active') statusCounts.active++;
      else if (emp.status === 'on-leave') statusCounts['on-leave']++;
      else if (emp.status === 'inactive') statusCounts.inactive++;

      tierCounts[emp.tier]++;

      for (const role of emp.roles) {
        roleCounts[role]++;
      }
    }

    return { statusCounts, tierCounts, roleCounts };
  }, [allEmployees]);

  /**
   * Filter employees based on client-side filters
   */
  const employees = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (tierFilter !== 'all' && emp.tier !== tierFilter) return false;
      if (roleFilter !== 'all' && !emp.roles.includes(roleFilter)) return false;
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      return true;
    });
  }, [allEmployees, tierFilter, roleFilter, statusFilter]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return allEmployees.find((e) => e.id === selectedEmployeeId) ?? null;
  }, [selectedEmployeeId, allEmployees]);

  const getEmployeeById = useCallback(
    (id: string): Employee | null => {
      return allEmployees.find((e) => e.id === id) ?? null;
    },
    [allEmployees]
  );

  const getEmployeesByLocation = useCallback(
    (locationId: string): readonly Employee[] => {
      return allEmployees.filter((e) => e.locationId === locationId);
    },
    [allEmployees]
  );

  const getEmployeesByRole = useCallback(
    (role: EmployeeRole): readonly Employee[] => {
      return allEmployees.filter((e) => e.roles.includes(role));
    },
    [allEmployees]
  );

  const getLinkedEmployees = useCallback(
    (employee: Employee): readonly Employee[] => {
      return employee.linkedEmployeeIds
        .map((id) => allEmployees.find((e) => e.id === id))
        .filter((e): e is Employee => e !== undefined);
    },
    [allEmployees]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTierFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
  }, []);

  const refetch = useCallback(() => {
    fetchAndSetEmployees(searchQuery || undefined);
  }, [searchQuery, fetchAndSetEmployees]);

  return {
    employees,
    allEmployees,
    selectedEmployee,
    selectedEmployeeId,
    setSelectedEmployeeId,
    searchQuery,
    setSearchQuery,
    tierFilter,
    setTierFilter,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    getEmployeeById,
    getEmployeesByLocation,
    getEmployeesByRole,
    getLinkedEmployees,
    clearFilters,
    refetch,
    isLoading,
    error,
    filterCounts,
  } as const;
}

export type { Employee, EmployeeTier, EmployeeRole, EmployeeStatus };
