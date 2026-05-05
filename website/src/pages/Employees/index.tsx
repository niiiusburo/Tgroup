// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState } from 'react';
import { UserCog, Search, X } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { useLocationFilter } from '@/contexts/LocationContext';
import { TierSelector } from '@/components/employees/TierSelector';
import { RoleMultiSelect } from '@/components/employees/RoleMultiSelect';
import { useState as useStateReact, useEffect as useEffectReact } from 'react';
import { fetchPermissionGroups, type PermissionGroup } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { EmployeeProfile } from '@/components/employees/EmployeeProfile';
import { useTranslation } from 'react-i18next';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiEmployee } from '@/lib/api';
import type { Employee } from '@/data/mockEmployees';

/**
 * Employees Page — staff management with list view and detailed profiles
 * @crossref:route[/employees]
 * @crossref:used-in[App]
 * @crossref:uses[EmployeeTable, EmployeeProfile, TierSelector, useLocationFilter, EmployeeForm]
 */
export function Employees() {
  const { t } = useTranslation('employees');
  const { hasPermission } = useAuth();
  const canEditEmployees = hasPermission('employees.edit');
  const { selectedLocationId } = useLocationFilter();
  const {
    employees,
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
    getLinkedEmployees,
    clearFilters,
    refetch,
    filterCounts,
    isLoading,
  } = useEmployees(selectedLocationId);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<typeof selectedEmployee>(null);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  const hasFilters = searchQuery || tierFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all';

  const { locations: allLocations, isLoading: locationsLoading } = useLocations();
  const locationNameMap = new Map(allLocations.map((l) => [l.id, l.name]));

  const handleAddEmployee = () => {
    if (!canEditEmployees) return;
    setEditingEmployee(null);
    setShowForm(true);
  };

  const [tiers, setTiers] = useStateReact<PermissionGroup[]>([]);
  const [tiersLoading, setTiersLoading] = useStateReact(true);

  useEffectReact(() => {
    setTiersLoading(true);
    fetchPermissionGroups()
      .then(setTiers)
      .catch(() => {})
      .finally(() => setTiersLoading(false));
  }, []);

  const openEmployeeEditor = (employee: Employee) => {
    if (!canEditEmployees) return;
    const formData = {
      id: employee.id,
      name: employee.name,
      phone: employee.phone || undefined,
      email: employee.email || undefined,
      companyid: employee.locationId || undefined,
      locationScopeIds: employee.locationScopeIds ?? [],
      isdoctor: employee.roles.includes('doctor'),
      isassistant: employee.roles.includes('assistant') || employee.roles.includes('doctor-assistant'),
      isreceptionist: employee.roles.includes('receptionist'),
      active: employee.status === 'active',
      jobtitle: (employee as any).hrjobname || (employee as any).jobtitle || null,
      wage: (employee as any).wage ?? null,
      allowance: (employee as any).allowance ?? null,
      startworkdate: employee.hireDate || null,
      tierId: employee.tierId || null,
    };
    setSelectedEmployeeId(employee.id);
    setEditingEmployee(formData as any);
    setShowForm(true);
  };

  const handleEditEmployee = () => {
    if (selectedEmployee) {
      openEmployeeEditor(selectedEmployee);
    }
  };

  const handleEditEmployeeById = (employeeId: string) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (employee) {
      openEmployeeEditor(employee);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleFormSave = async (savedEmployee: ApiEmployee, mode: 'create' | 'edit') => {
    setSearchQuery('');
    setTierFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setSelectedEmployeeId(savedEmployee.id);
    await refetch('');
    setFormFeedback(
      mode === 'create'
        ? t('employeeCreated', { name: savedEmployee.name, defaultValue: `Created ${savedEmployee.name}` })
        : t('employeeUpdated', { name: savedEmployee.name, defaultValue: `Updated ${savedEmployee.name}` }),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={isLoading ? 'Loading staff...' : `${employees.length} staff member${employees.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
        icon={<UserCog className="w-6 h-6 text-primary" />}
        actions={
          canEditEmployees ? (
            <button
              onClick={handleAddEmployee}
              className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              {t('addEmployee')}
            </button>
          ) : undefined
        }
      />

      {formFeedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span>{formFeedback}</span>
          <button
            type="button"
            onClick={() => setFormFeedback(null)}
            className="rounded-lg p-1 text-emerald-700 transition-colors hover:bg-emerald-100"
            aria-label={t('dismissFeedback', 'Dismiss')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
        {/* Search + Location */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Status:</span>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'active', 'on-leave', 'inactive'] as const).map((status) => {
              const isSelected = statusFilter === status;
              const label = status === 'all' ? 'All' : status === 'on-leave' ? 'On Leave' : status.charAt(0).toUpperCase() + status.slice(1);
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? status === 'all' ? 'bg-gray-900 text-white'
                      : status === 'active' ? 'bg-green-100 text-green-700'
                      : status === 'on-leave' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-200 text-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 py-0 text-[10px] leading-4 ${
                      isSelected
                        ? status === 'all' ? 'bg-white/20 text-white' : 'bg-black/10'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {filterCounts.statusCounts[status]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Tier:</span>
          <TierSelector value={tierFilter} onChange={setTierFilter} tiers={tiers} counts={filterCounts.tierCounts} loading={tiersLoading} />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Role:</span>
          <RoleMultiSelect value={roleFilter} onChange={setRoleFilter} counts={filterCounts.roleCounts} />
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Main content: table + profile panel */}
      <div className={`grid gap-6 ${selectedEmployee ? 'lg:grid-cols-5' : ''}`}>
        {/* Employee table */}
        <div className={selectedEmployee ? 'lg:col-span-3' : ''}>
          <EmployeeTable
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelect={setSelectedEmployeeId}
            locationNameMap={locationNameMap}
            loading={isLoading}
            locationsLoading={locationsLoading}
            onEdit={canEditEmployees ? handleEditEmployeeById : undefined}
          />
        </div>

        {/* Profile panel */}
        {selectedEmployee && (
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-4">
              <EmployeeProfile
                employee={selectedEmployee}
                linkedEmployees={getLinkedEmployees(selectedEmployee)}
                onClose={() => setSelectedEmployeeId(null)}
                onSelectLinked={setSelectedEmployeeId}
                onEdit={canEditEmployees ? handleEditEmployee : undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit form modal */}
      {showForm && canEditEmployees && (
        <EmployeeForm
          employee={editingEmployee as any}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}
