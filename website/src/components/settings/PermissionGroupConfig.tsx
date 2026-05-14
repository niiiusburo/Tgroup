/**
 * Permission Group Configuration — manage permission groups with location scoping
 *
 * Layout:
 *   Top: Group cards (click to select/expand)
 *   Middle: Permission matrix for selected group (toggle checkboxes by module)
 *   Bottom: Employee assignments panel — shows who's in the group + their location scope
 *
 * @crossref:used-in[Settings]
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, ChevronRight, Check, X, Plus, MapPin,
  Users, Globe, Trash2, Loader2, AlertCircle,
} from 'lucide-react';
import { usePermissionGroups } from '@/hooks/usePermissionGroups';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useEmployees } from '@/hooks/useEmployees';

const GROUP_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#0EA5E9', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export function PermissionGroupConfig() {
  const { t } = useTranslation('settings');
  const {
    groups,
    permissionsByModule,
    isLoading: groupsLoading,
    isMutating: groupsMutating,
    error: groupsError,
    selectedGroup,
    selectedGroupId,
    setSelectedGroupId,
    toggleGroupPermission,
    toggleModulePermissions,
    createGroup,
    deleteGroup,
    clearError,
  } = usePermissionGroups();

  const {
    members,
    isLoading: membersLoading,
    isMutating: membersMutating,
    error: membersError,
    assignEmployee,
    removeEmployee,
    setAllLocations,
  } = useGroupMembers(selectedGroupId);

  const { employees } = useEmployees();

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[4]);
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const anyError = groupsError || membersError;
  const anyLoading = groupsLoading || groupsMutating;

  // Employees not yet assigned to ANY group
  const unassignedEmployees = employees.filter(
    (emp) => !groups.some((g) => g.id === emp.tierId) && !members.some((m) => m.employeeId === emp.id),
  );

  async function handleAddGroup() {
    if (!newGroupName.trim()) return;
    try {
      const g = await createGroup(newGroupName.trim(), newGroupColor, newGroupDesc.trim());
      setNewGroupName('');
      setNewGroupDesc('');
      setShowAddGroup(false);
      setSelectedGroupId(g.id);
    } catch {
      // Error already set in hook
    }
  }

  async function handleAddEmployeeToGroup(employeeId: string) {
    try {
      await assignEmployee(employeeId, 'all');
      setShowAddEmployee(false);
    } catch {
      // Error already set in hook
    }
  }

  async function handleTogglePermission(groupId: string, permissionId: string) {
    try {
      await toggleGroupPermission(groupId, permissionId);
    } catch {
      // Rollback handled in hook
    }
  }

  async function handleToggleModule(module: string, perms: { id: string }[]) {
    if (!selectedGroup) return;
    const allEnabled = perms.every((p) => selectedGroup.permissions.includes(p.id));
    try {
      await toggleModulePermissions(selectedGroup.id, module, !allEnabled);
    } catch {
      // Rollback handled in hook
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm(t('permissionGroup.confirmDelete', 'Are you sure you want to delete this group? Members will be unassigned.'))) return;
    try {
      await deleteGroup(groupId);
    } catch {
      // Error handled in hook
    }
  }

  async function handleRemoveEmployee(employeeId: string) {
    try {
      await removeEmployee(employeeId);
    } catch {
      // Error handled in hook
    }
  }

  async function handleSetAllLocations(employeeId: string, all: boolean) {
    try {
      await setAllLocations(employeeId, all);
    } catch {
      // Rollback handled in hook
    }
  }

  if (groupsLoading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-gray-500">{t('loading', 'Loading...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {anyError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{anyError}</span>
          <button onClick={clearError} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Group Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Permission Groups
          </h3>
          <button
            onClick={() => setShowAddGroup(true)}
            disabled={anyLoading}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Group
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
              disabled={anyLoading}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedGroupId === group.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              } disabled:opacity-60`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${group.color}15` }}
                  >
                    <Shield className="w-5 h-5" style={{ color: group.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{group.name}</div>
                    <div className="text-xs text-gray-500 truncate">{group.description}</div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform shrink-0 mt-1 ${
                  selectedGroupId === group.id ? 'rotate-90' : ''
                }`} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${group.color}15`, color: group.color }}
                >
                  {group.permissions.length} permissions
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {members.length} members
                </span>
                {group.isSystem && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">System</span>
                )}
              </div>
            </button>
          ))}

          {/* Add group inline form */}
          {showAddGroup && (
            <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
              <input
                type="text"
                placeholder={t('permissionGroup.groupName', 'Group name')}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
              <input
                type="text"
                placeholder={t('permissionGroup.description', 'Description')}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex gap-1.5">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewGroupColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      newGroupColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim() || anyLoading}
                  className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {anyLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create
                </button>
                <button
                  onClick={() => setShowAddGroup(false)}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Matrix */}
      {selectedGroup && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${selectedGroup.color}15` }}
              >
                <Shield className="w-4 h-4" style={{ color: selectedGroup.color }} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedGroup.name} — Permissions</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toggle module access for everyone in this group
                </p>
              </div>
            </div>
            {!selectedGroup.isSystem && (
              <button
                onClick={() => handleDeleteGroup(selectedGroup.id)}
                disabled={anyLoading}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {Object.entries(permissionsByModule).map(([module, perms]) => {
              const allEnabled = perms.every((p) => selectedGroup.permissions.includes(p.id));
              const someEnabled = perms.some((p) => selectedGroup.permissions.includes(p.id));

              return (
                <div key={module} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleModule(module, perms)}
                        disabled={anyLoading}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          allEnabled
                            ? 'bg-primary border-primary text-white'
                            : someEnabled
                            ? 'bg-primary/20 border-primary/50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {allEnabled && <Check className="w-3 h-3" />}
                        {someEnabled && !allEnabled && <div className="w-2 h-0.5 bg-primary rounded" />}
                      </button>
                      <span className="text-sm font-semibold text-gray-800">{module}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {perms.filter((p) => selectedGroup.permissions.includes(p.id)).length}/{perms.length}
                    </span>
                  </div>
                  <div className="ml-7 flex flex-wrap gap-2">
                    {perms.map((perm) => {
                      const enabled = selectedGroup.permissions.includes(perm.id);
                      return (
                        <button
                          key={perm.id}
                          onClick={() => handleTogglePermission(selectedGroup.id, perm.id)}
                          disabled={anyLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            enabled
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300'
                          } disabled:opacity-50`}
                          title={perm.description}
                        >
                          {enabled && <Check className="w-3 h-3" />}
                          {anyLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          {perm.action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Assignments */}
      {selectedGroup && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: selectedGroup.color }} />
                Members — {selectedGroup.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign employees and set which locations they can access
              </p>
            </div>
            <button
              onClick={() => setShowAddEmployee(true)}
              disabled={membersMutating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          {showAddEmployee && (
            <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/50">
              <p className="text-xs font-medium text-gray-600 mb-2">Select employee to add:</p>
              <div className="flex flex-wrap gap-2">
                {unassignedEmployees.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">All employees are assigned to a group</p>
                ) : (
                  unassignedEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => handleAddEmployeeToGroup(emp.id)}
                      disabled={membersMutating}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
                        {emp.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {emp.name}
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowAddEmployee(false)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {membersLoading && members.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                <p className="text-sm text-gray-400 mt-2">Loading members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No employees assigned to this group yet
              </div>
            ) : (
              members.map((member) => {
                const employee = employees.find((e) => e.id === member.employeeId);
                const isAllLocations = member.locScope === 'all';

                return (
                  <div key={member.employeeId} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: selectedGroup.color }}
                        >
                          {employee?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.employeeName}</div>
                          <div className="text-xs text-gray-500">
                            {member.employeeEmail}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveEmployee(member.employeeId)}
                        disabled={membersMutating}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove from group"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Location scope */}
                    <div className="ml-12 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        Location Access:
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isAllLocations}
                          onChange={(e) => handleSetAllLocations(member.employeeId, e.target.checked)}
                          disabled={membersMutating}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                        />
                        <Globe className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors" />
                        <span className={`text-xs font-medium ${isAllLocations ? 'text-primary' : 'text-gray-600'}`}>
                          All Locations
                        </span>
                      </label>

                      {!isAllLocations && member.locations.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 ml-6">
                          {member.locations.map((loc) => (
                            <label
                              key={loc.id}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked
                                disabled
                                className="w-3.5 h-3.5 rounded border-gray-300 text-primary"
                              />
                              <span className="text-xs font-medium text-gray-900 truncate">{loc.name}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-gray-400 ml-6">
                        {isAllLocations
                          ? 'Access to all locations'
                          : member.locations.length > 0
                          ? `${member.locations.length} location(s) selected`
                          : 'Primary location only'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
