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
  hrjobname: string | null
): readonly EmployeeRole[] {
  const roles: EmployeeRole[] = [];

  if (isdoctor) roles.push('doctor');
  if (isassistant) roles.push('assistant');
  if (isreceptionist) roles.push('receptionist');

  if (hrjobname) {
    const lower = hrjobname.toLowerCase();
    if ((lower.includes('quản lý') || lower.includes('manager')) && !roles.includes('general-manager')) {
      roles.push('general-manager');
    }
  }

  return roles.length > 0 ? roles : ['assistant'];
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
      apiEmployee.hrjobname
    ),
    status: mapApiStatus(apiEmployee.active),
    locationId: apiEmployee.companyid || '',
    locationName: apiEmployee.companyname || '',
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
  readonly wage?: string | null;
  readonly allowance?: string | null;
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
      });

      const employeesWithApiFields: EmployeeWithApiFields[] = response.items.map((apiEmp) => {
        const employee = mapApiEmployeeToEmployee(apiEmp);
        return {
          ...employee,
          ref: apiEmp.ref,
          companyname: apiEmp.companyname,
          hrjobname: apiEmp.hrjobname,
          wage: apiEmp.wage,
          allowance: apiEmp.allowance,
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
  } as const;
}

export type { Employee, EmployeeTier, EmployeeRole, EmployeeStatus };
