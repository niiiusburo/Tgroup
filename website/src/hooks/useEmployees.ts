import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { fetchEmployees, type ApiEmployee } from '@/lib/api';
import {
  type Employee,
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
    tierId: apiEmployee.tierId || '',
    tierName: apiEmployee.tierName || 'No Tier',
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
  const [tierFilter, setTierFilter] = useState<string>('all');
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
   * Filter counts derived from allEmployees (cross-filtered so counts reflect other active filters)
   */
  const filterCounts = useMemo(() => {
    // Status counts: apply tier + role filters
    const statusCounts: Record<EmployeeStatus | 'all', number> = {
      all: 0,
      active: 0,
      'on-leave': 0,
      inactive: 0,
    };

    // Tier counts: apply status + role filters
    const tierCounts: Record<string, number> = {
      all: 0,
    };

    // Role counts: apply status + tier filters
    const roleCounts: Record<EmployeeRole | 'all', number> = {
      all: 0,
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
      const matchesTier = tierFilter === 'all' || emp.tierId === tierFilter;
      const matchesRole = roleFilter === 'all' || emp.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

      // Status counts need tier + role match
      if (matchesTier && matchesRole) {
        statusCounts.all++;
        if (emp.status === 'active') statusCounts.active++;
        else if (emp.status === 'on-leave') statusCounts['on-leave']++;
        else if (emp.status === 'inactive') statusCounts.inactive++;
      }

      // Tier counts need status + role match
      if (matchesStatus && matchesRole) {
        tierCounts.all++;
        if (emp.tierId) {
          tierCounts[emp.tierId] = (tierCounts[emp.tierId] || 0) + 1;
        }
      }

      // Role counts need status + tier match
      if (matchesStatus && matchesTier) {
        roleCounts.all++;
        for (const role of emp.roles) {
          roleCounts[role]++;
        }
      }
    }

    return { statusCounts, tierCounts, roleCounts };
  }, [allEmployees, tierFilter, roleFilter, statusFilter]);

  /**
   * Filter employees based on client-side filters
   */
  const employees = useMemo(() => {
    const filtered = allEmployees.filter((emp) => {
      if (tierFilter !== 'all' && emp.tierId !== tierFilter) return false;
      if (roleFilter !== 'all' && !emp.roles.includes(roleFilter)) return false;
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      return true;
    });
    // Default sort: active first (A-Z), then on-leave (A-Z), then inactive (A-Z)
    const statusPriority: Record<EmployeeStatus, number> = {
      active: 0,
      'on-leave': 1,
      inactive: 2,
    };
    return filtered.sort((a, b) => {
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
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

export type { Employee, EmployeeRole, EmployeeStatus };
