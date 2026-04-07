import { useState, useMemo, useCallback } from 'react';
import {
  MOCK_EMPLOYEES,
  type Employee,
  type EmployeeTier,
  type EmployeeRole,
  type EmployeeStatus,
} from '@/data/mockEmployees';

/**
 * Hook for employee data and operations
 * @crossref:used-in[Employees, Appointments, Calendar, Customers]
 */
export function useEmployees() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<EmployeeTier | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');

  const employees = useMemo(() => {
    return MOCK_EMPLOYEES.filter((emp) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!emp.name.toLowerCase().includes(q) && !emp.email.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (tierFilter !== 'all' && emp.tier !== tierFilter) return false;
      if (roleFilter !== 'all' && !emp.roles.includes(roleFilter)) return false;
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      return true;
    });
  }, [searchQuery, tierFilter, roleFilter, statusFilter]);

  const allEmployees = MOCK_EMPLOYEES;

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return MOCK_EMPLOYEES.find((e) => e.id === selectedEmployeeId) ?? null;
  }, [selectedEmployeeId]);

  const getEmployeeById = useCallback((id: string): Employee | null => {
    return MOCK_EMPLOYEES.find((e) => e.id === id) ?? null;
  }, []);

  const getEmployeesByLocation = useCallback((locationId: string): readonly Employee[] => {
    return MOCK_EMPLOYEES.filter((e) => e.locationId === locationId);
  }, []);

  const getEmployeesByRole = useCallback((role: EmployeeRole): readonly Employee[] => {
    return MOCK_EMPLOYEES.filter((e) => e.roles.includes(role));
  }, []);

  const getLinkedEmployees = useCallback((employee: Employee): readonly Employee[] => {
    return employee.linkedEmployeeIds
      .map((id) => MOCK_EMPLOYEES.find((e) => e.id === id))
      .filter((e): e is Employee => e !== undefined);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTierFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
  }, []);

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
  } as const;
}

export type { Employee, EmployeeTier, EmployeeRole, EmployeeStatus };
