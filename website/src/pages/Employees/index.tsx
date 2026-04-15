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
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { EmployeeProfile } from '@/components/employees/EmployeeProfile';
import { useTranslation } from 'react-i18next';
import { EmployeeForm } from '@/components/employees/EmployeeForm';

/**
 * Employees Page — staff management with list view and detailed profiles
 * @crossref:route[/employees]
 * @crossref:used-in[App]
 * @crossref:uses[EmployeeTable, EmployeeProfile, TierSelector, useLocationFilter, EmployeeForm]
 */
export function Employees() {
  const { t } = useTranslation('employees');
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
  } = useEmployees(selectedLocationId);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<typeof selectedEmployee>(null);

  const hasFilters = searchQuery || tierFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all';

  const { locations: allLocations } = useLocations();
  const locationNameMap = new Map(allLocations.map((l) => [l.id, l.name]));

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const [tiers, setTiers] = useStateReact<PermissionGroup[]>([]);

  useEffectReact(() => {
    fetchPermissionGroups().then(setTiers).catch(() => {});
  }, []);

  const handleEditEmployee = () => {
    if (selectedEmployee) {
      // Map domain Employee type to EmployeeForm's expected shape
      const formData = {
        id: selectedEmployee.id,
        name: selectedEmployee.name,
        phone: selectedEmployee.phone || undefined,
        email: selectedEmployee.email || undefined,
        companyid: selectedEmployee.locationId || undefined,
        locationScopeIds: selectedEmployee.locationScopeIds ?? [],
        isdoctor: selectedEmployee.roles.includes('doctor'),
        isassistant: selectedEmployee.roles.includes('assistant') || selectedEmployee.roles.includes('doctor-assistant'),
        isreceptionist: selectedEmployee.roles.includes('receptionist'),
        active: selectedEmployee.status === 'active',
        jobtitle: (selectedEmployee as any).hrjobname || (selectedEmployee as any).jobtitle || null,
        wage: (selectedEmployee as any).wage ?? null,
        allowance: (selectedEmployee as any).allowance ?? null,
        startworkdate: selectedEmployee.hireDate || null,
        tierId: selectedEmployee.tierId || null,
      };
      setEditingEmployee(formData as any);
      setShowForm(true);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleFormSave = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">
              {employees.length} staff member{employees.length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtered)' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddEmployee}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {t('addEmployee')}
        </button>
      </div>

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
          <TierSelector value={tierFilter} onChange={setTierFilter} tiers={tiers} counts={filterCounts.tierCounts} />
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
                onEdit={handleEditEmployee}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <EmployeeForm
          employee={editingEmployee as any}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}
