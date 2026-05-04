import { useEffect, useRef, useState } from 'react';
import { fetchEmployees } from '@/lib/api';
import type { ApiEmployee } from '@/lib/api';
import type { CustomerFormData } from '@/data/mockCustomerForm';

type SetCustomerField = <K extends keyof CustomerFormData>(
  field: K,
  value: CustomerFormData[K],
) => void;

interface UseEmployeeAssignmentFieldsArgs {
  readonly employees: ApiEmployee[];
  readonly formData: CustomerFormData;
  readonly set: SetCustomerField;
}

const employeeSearchHaystack = (employee: ApiEmployee) =>
  [
    employee.jobtitle,
    employee.hrjobname,
    employee.name,
  ].filter(Boolean).join(' ').toLowerCase();

const isSalesStaffOption = (employee: ApiEmployee) =>
  employeeSearchHaystack(employee).includes('sale');

const isActiveEmployeeOption = (employee: ApiEmployee) => employee.active;

const filterActiveOptions = (
  employees: readonly ApiEmployee[],
  predicate: (employee: ApiEmployee) => boolean,
) => employees.filter((employee) => isActiveEmployeeOption(employee) && predicate(employee));

const isCskhStaffOption = (employee: ApiEmployee) => {
  const haystack = employeeSearchHaystack(employee);
  return haystack.includes('cskh') ||
    haystack.includes('customer service') ||
    haystack.includes('ho tro') ||
    haystack.includes('hỗ trợ');
};

export function useEmployeeAssignmentFields({
  employees,
  formData,
  set,
}: UseEmployeeAssignmentFieldsArgs) {
  const [salesQuery, setSalesQuery] = useState('');
  const [salesResults, setSalesResults] = useState<ApiEmployee[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const salesTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const salesContainerRef = useRef<HTMLDivElement>(null);

  const [cskhQuery, setCskhQuery] = useState('');
  const [cskhResults, setCskhResults] = useState<ApiEmployee[]>([]);
  const [cskhLoading, setCskhLoading] = useState(false);
  const [cskhOpen, setCskhOpen] = useState(false);
  const cskhTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const cskhContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formData.salestaffid) {
      const emp = employees.find((e) => e.id === formData.salestaffid);
      if (emp) setSalesQuery(emp.name);
    } else {
      setSalesQuery('');
    }
  }, [formData.salestaffid, employees]);

  useEffect(() => {
    if (salesTimeoutRef.current) clearTimeout(salesTimeoutRef.current);
    const trimmed = salesQuery.trim();
    if (!trimmed) {
      setSalesResults(filterActiveOptions(employees, isSalesStaffOption));
      setSalesLoading(false);
      return;
    }
    setSalesLoading(true);
    salesTimeoutRef.current = setTimeout(() => {
      fetchEmployees({ search: trimmed, limit: 100, active: 'true' })
        .then((res) => setSalesResults(filterActiveOptions(res.items, isSalesStaffOption)))
        .catch(() => setSalesResults([]))
        .finally(() => setSalesLoading(false));
    }, 300);
    return () => { if (salesTimeoutRef.current) clearTimeout(salesTimeoutRef.current); };
  }, [salesQuery, employees]);

  useEffect(() => {
    if (formData.cskhid) {
      const emp = employees.find((e) => e.id === formData.cskhid);
      if (emp) setCskhQuery(emp.name);
    } else {
      setCskhQuery('');
    }
  }, [formData.cskhid, employees]);

  useEffect(() => {
    if (cskhTimeoutRef.current) clearTimeout(cskhTimeoutRef.current);
    const trimmed = cskhQuery.trim();
    if (!trimmed) {
      setCskhResults(filterActiveOptions(employees, isCskhStaffOption));
      setCskhLoading(false);
      return;
    }
    setCskhLoading(true);
    cskhTimeoutRef.current = setTimeout(() => {
      fetchEmployees({ search: trimmed, limit: 100, active: 'true' })
        .then((res) => setCskhResults(filterActiveOptions(res.items, isCskhStaffOption)))
        .catch(() => setCskhResults([]))
        .finally(() => setCskhLoading(false));
    }, 300);
    return () => { if (cskhTimeoutRef.current) clearTimeout(cskhTimeoutRef.current); };
  }, [cskhQuery, employees]);

  const handleSalesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalesQuery(e.target.value);
    set('salestaffid', '');
    setSalesOpen(true);
  };

  const handleSelectSales = (emp: ApiEmployee) => {
    setSalesQuery(emp.name);
    set('salestaffid', emp.id);
    setSalesOpen(false);
  };

  const handleClearSales = () => {
    setSalesQuery('');
    set('salestaffid', '');
    setSalesResults([]);
  };

  const handleCskhInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCskhQuery(e.target.value);
    set('cskhid', '');
    setCskhOpen(true);
  };

  const handleSelectCskh = (emp: ApiEmployee) => {
    setCskhQuery(emp.name);
    set('cskhid', emp.id);
    setCskhOpen(false);
  };

  const handleClearCskh = () => {
    setCskhQuery('');
    set('cskhid', '');
    setCskhResults([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (salesContainerRef.current && !salesContainerRef.current.contains(e.target as Node)) setSalesOpen(false);
      if (cskhContainerRef.current && !cskhContainerRef.current.contains(e.target as Node)) setCskhOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    salesQuery,
    setSalesQuery,
    salesResults,
    salesLoading,
    salesOpen,
    setSalesOpen,
    salesContainerRef,
    handleSalesInputChange,
    handleSelectSales,
    handleClearSales,
    cskhQuery,
    setCskhQuery,
    cskhResults,
    cskhLoading,
    cskhOpen,
    setCskhOpen,
    cskhContainerRef,
    handleCskhInputChange,
    handleSelectCskh,
    handleClearCskh,
  };
}
