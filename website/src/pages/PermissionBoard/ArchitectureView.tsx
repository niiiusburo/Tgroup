import { useState } from 'react';
import type { PermissionGroup, EmployeePermission } from '@/lib/api';
import { GroupCard } from './GroupCard';
import { EmployeeCard } from './EmployeeCard';

interface EditState {
  groupId: string;
  locScope: string;
  locationIds: string[];
  grantInput: string;
  revokeInput: string;
  grant: string[];
  revoke: string[];
}


interface ArchitectureViewProps {
  groups: PermissionGroup[];
  employees: EmployeePermission[];
  locations: { id: string; name: string }[];
  selectedGroupId: string | null;
  selectedEmployeeId: string | null;
  onSelectGroup: (id: string | null) => void;
  onSelectEmployee: (id: string | null) => void;
  getEffective: (emp: EmployeePermission) => string[];
  updateEmployee: (
    employeeId: string,
    data: { groupId: string; locScope: string; locationIds: string[]; overrides: { grant: string[]; revoke: string[] } }
  ) => Promise<EmployeePermission>;
}

export function ArchitectureView({
  groups, employees, locations,
  selectedGroupId, selectedEmployeeId,
  onSelectGroup, onSelectEmployee,
  getEffective, updateEmployee,
}: ArchitectureViewProps) {
  const activeGroup = groups.find(g => g.id === selectedGroupId);
  const activeEmp = employees.find(e => e.employeeId === selectedEmployeeId);
  const activeEmpGroup = activeEmp ? groups.find(g => g.id === activeEmp.groupId) : undefined;

  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = () => {
    if (!activeEmp) return;
    setEditState({
      groupId: activeEmp.groupId,
      locScope: activeEmp.locScope,
      locationIds: activeEmp.locations.map(l => l.id),
      grantInput: '',
      revokeInput: '',
      grant: [...activeEmp.overrides.grant],
      revoke: [...activeEmp.overrides.revoke],
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditState(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editState || !activeEmp) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateEmployee(activeEmp.employeeId, {
        groupId: editState.groupId,
        locScope: editState.locScope,
        locationIds: editState.locationIds,
        overrides: { grant: editState.grant, revoke: editState.revoke },
      });
      setEditState(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleLocation = (locId: string) => {
    if (!editState) return;
    const has = editState.locationIds.includes(locId);
    setEditState({
      ...editState,
      locationIds: has ? editState.locationIds.filter(id => id !== locId) : [...editState.locationIds, locId],
    });
  };

  const addGrant = () => {
    if (!editState || !editState.grantInput.trim()) return;
    const perm = editState.grantInput.trim();
    if (!editState.grant.includes(perm)) {
      setEditState({ ...editState, grant: [...editState.grant, perm], grantInput: '' });
    } else {
      setEditState({ ...editState, grantInput: '' });
    }
  };

  const addRevoke = () => {
    if (!editState || !editState.revokeInput.trim()) return;
    const perm = editState.revokeInput.trim();
    if (!editState.revoke.includes(perm)) {
      setEditState({ ...editState, revoke: [...editState.revoke, perm], revokeInput: '' });
    } else {
      setEditState({ ...editState, revokeInput: '' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Column 1: Permission Groups */}
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Tiers (WHAT)
        </div>
        <div className="flex flex-col gap-2">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              memberCount={employees.filter(e => e.groupId === g.id).length}
              isSelected={selectedGroupId === g.id}
              onClick={() => { onSelectGroup(selectedGroupId === g.id ? null : g.id); onSelectEmployee(null); setEditState(null); }}
            />
          ))}
          {groups.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">No tiers</div>
          )}
        </div>
      </div>

      {/* Column 2: Employees */}
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Employees (WHO)
        </div>
        <div className="flex flex-col gap-1.5">
          {employees.map(emp => {
            const group = groups.find(g => g.id === emp.groupId);
            const effective = getEffective(emp);
            const isDimmed = selectedGroupId !== null && emp.groupId !== selectedGroupId;
            return (
              <EmployeeCard
                key={emp.employeeId}
                emp={emp}
                group={group}
                effectiveCount={effective.length}
                isSelected={selectedEmployeeId === emp.employeeId}
                isDimmed={isDimmed}
                onClick={() => {
                  const isActive = selectedEmployeeId === emp.employeeId;
                  onSelectEmployee(isActive ? null : emp.employeeId);
                  onSelectGroup(null);
                  setEditState(null);
                }}
              />
            );
          })}
          {employees.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">No employees found</div>
          )}
        </div>
      </div>

      {/* Column 3: Locations + Detail panel */}
      <div className="lg:order-last">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Locations (WHERE)
        </div>

        {/* Location grid */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1.5">
            {locations.map(loc => {
              let highlight = false;
              if (activeEmp) {
                highlight = activeEmp.locScope === 'all' || activeEmp.locations.some(l => l.id === loc.id);
              } else if (activeGroup) {
                const members = employees.filter(e => e.groupId === activeGroup.id);
                highlight = members.some(m => m.locScope === 'all' || m.locations.some(l => l.id === loc.id));
              }
              return (
                <div
                  key={loc.id}
                  className="px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    border: highlight ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    background: highlight ? '#eff6ff' : '#f8fafc',
                    color: highlight ? '#1d4ed8' : '#475569',
                  }}
                >
                  {loc.name}
                </div>
              );
            })}
            {locations.length === 0 && (
              <div className="col-span-2 text-xs text-gray-400 text-center py-4">No locations</div>
            )}
          </div>
        </div>

        {/* Detail / Edit panel */}
        {(activeEmp || activeGroup) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            {/* Employee detail */}
            {activeEmp && activeEmpGroup && !editState && (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{activeEmp.employeeName}</h3>
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block"
                      style={{ background: `${activeEmpGroup.color}18`, color: activeEmpGroup.color }}
                    >
                      {activeEmpGroup.name}
                    </span>
                  </div>
                  <button
                    onClick={startEdit}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Base permissions</span>
                    <span className="font-semibold">{activeEmpGroup.permissions.length}</span>
                  </div>
                  {activeEmp.overrides.grant.length > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>+ Granted</span>
                      <span className="font-semibold">{activeEmp.overrides.grant.join(', ')}</span>
                    </div>
                  )}
                  {activeEmp.overrides.revoke.length > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>- Revoked</span>
                      <span className="font-semibold">{activeEmp.overrides.revoke.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-400">Effective total</span>
                    <span className="font-bold text-gray-900">{getEffective(activeEmp).length}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-1.5">
                    <span className="text-gray-400 block mb-1">Location access</span>
                    <span className={activeEmp.locScope === 'all' ? 'text-blue-700 font-medium' : 'text-gray-600'}>
                      {activeEmp.locScope === 'all'
                        ? 'All Locations'
                        : activeEmp.locations.map(l => l.name).join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Edit mode */}
            {activeEmp && editState && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Edit: {activeEmp.employeeName}</h3>

                {/* Group selector */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Permission Group</label>
                  <select
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={editState.groupId}
                    onChange={e => setEditState({ ...editState, groupId: e.target.value })}
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Location scope */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Location Scope</label>
                  <div className="flex gap-2 mb-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="locScope"
                        value="all"
                        checked={editState.locScope === 'all'}
                        onChange={() => setEditState({ ...editState, locScope: 'all', locationIds: [] })}
                      />
                      All Locations
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="locScope"
                        value="specific"
                        checked={editState.locScope !== 'all'}
                        onChange={() => setEditState({ ...editState, locScope: 'specific' })}
                      />
                      Specific
                    </label>
                  </div>
                  {editState.locScope !== 'all' && (
                    <div className="grid grid-cols-1 gap-1 max-h-28 overflow-y-auto">
                      {locations.map(loc => (
                        <label key={loc.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={editState.locationIds.includes(loc.id)}
                            onChange={() => toggleLocation(loc.id)}
                          />
                          {loc.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overrides */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Grant Extra</label>
                  <div className="flex gap-1 mb-1">
                    <input
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-300"
                      placeholder="e.g. reports.view"
                      value={editState.grantInput}
                      onChange={e => setEditState({ ...editState, grantInput: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && addGrant()}
                    />
                    <button onClick={addGrant} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">+</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {editState.grant.map(p => (
                      <span key={p} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {p}
                        <button onClick={() => setEditState({ ...editState, grant: editState.grant.filter(x => x !== p) })} className="text-green-500 hover:text-green-800">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Revoke</label>
                  <div className="flex gap-1 mb-1">
                    <input
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-300"
                      placeholder="e.g. payment.refund"
                      value={editState.revokeInput}
                      onChange={e => setEditState({ ...editState, revokeInput: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && addRevoke()}
                    />
                    <button onClick={addRevoke} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">+</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {editState.revoke.map(p => (
                      <span key={p} className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {p}
                        <button onClick={() => setEditState({ ...editState, revoke: editState.revoke.filter(x => x !== p) })} className="text-red-400 hover:text-red-700">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {saveError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{saveError}</div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tier detail */}
            {activeGroup && !activeEmp && (
              <>
                <h3 className="text-sm font-bold mb-1" style={{ color: activeGroup.color }}>{activeGroup.name}</h3>
                {activeGroup.description && (
                  <p className="text-xs text-gray-500 mb-3">{activeGroup.description}</p>
                )}
                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Permissions</span>
                    <span className="font-bold text-gray-900">{activeGroup.permissions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Modules covered</span>
                    <span className="font-semibold">{new Set(activeGroup.permissions.map(p => p.split('.')[0])).size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Employees in tier</span>
                    <span className="font-bold text-gray-900">{employees.filter(e => e.groupId === activeGroup.id).length}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
