import { UserCog, Search, X } from 'lucide-react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { TierSelector } from '@/components/employees/TierSelector';
import { RoleMultiSelect } from '@/components/employees/RoleMultiSelect';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { EmployeeProfile } from '@/components/employees/EmployeeProfile';

/**
 * Employees Page — staff management with roles, tiers, and schedules
 * @crossref:route[/employees]
 * @crossref:used-in[App]
 */
export function Employees() {
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
  } = useEmployeesData();

  const hasFilters = searchQuery || tierFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500">
              {employees.length} staff member{employees.length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtered)' : ''}
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Add Employee
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Status:</span>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'active', 'on-leave', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? status === 'all' ? 'bg-gray-900 text-white'
                    : status === 'active' ? 'bg-green-100 text-green-700'
                    : status === 'on-leave' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-200 text-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status === 'on-leave' ? 'On Leave' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Tier:</span>
          <TierSelector value={tierFilter} onChange={setTierFilter} />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Role:</span>
          <RoleMultiSelect value={roleFilter} onChange={setRoleFilter} />
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

      {/* Main content: grid + profile panel */}
      <div className={`grid gap-6 ${selectedEmployee ? 'lg:grid-cols-5' : ''}`}>
        {/* Employee cards grid */}
        <div className={selectedEmployee ? 'lg:col-span-3' : ''}>
          {employees.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <UserCog className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No employees match your filters</p>
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-primary hover:text-primary-dark transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  isSelected={emp.id === selectedEmployeeId}
                  onSelect={setSelectedEmployeeId}
                />
              ))}
            </div>
          )}
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
