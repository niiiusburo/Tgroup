/**
 * PermissionBoard - Permission system architecture visualization and management
 * @crossref:used-in[App]
 * @crossref:uses[usePermissionBoard, PermissionGroup, EmployeePermission]
 */
import { useState } from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import { usePermissionBoard } from '@/hooks/usePermissionBoard';
import type { PermissionGroup, EmployeePermission } from '@/lib/api';

// ─── Module definitions ───────────────────────────────────────────

const MODULES = [
  { name: 'Overview', actions: ['View'] },
  { name: 'Calendar', actions: ['View', 'Edit'] },
  { name: 'Customers', actions: ['View', 'Add', 'Edit', 'Delete'] },
  { name: 'Appointments', actions: ['View', 'Add', 'Edit'] },
  { name: 'Services', actions: ['View', 'Add', 'Edit'] },
  { name: 'Payment', actions: ['View', 'Add', 'Edit', 'Refund'] },
  { name: 'Employees', actions: ['View', 'Add', 'Edit'] },
  { name: 'Locations', actions: ['View', 'Add', 'Edit'] },
  { name: 'Reports', actions: ['View', 'Export'] },
  { name: 'Commission', actions: ['View', 'Edit'] },
  { name: 'Settings', actions: ['View', 'Edit'] },
  { name: 'Notifications', actions: ['View', 'Edit'] },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function getRoleLabel(emp: EmployeePermission): string {
  return emp.groupName || 'Unassigned';
}

// ─── Edit panel state ─────────────────────────────────────────────

interface EditState {
  groupId: string;
  locScope: string;
  locationIds: string[];
  grantInput: string;
  revokeInput: string;
  grant: string[];
  revoke: string[];
}

// ─── Sub-components ───────────────────────────────────────────────

interface GroupCardProps {
  group: PermissionGroup;
  memberCount: number;
  isSelected: boolean;
  onClick: () => void;
}

function GroupCard({ group, memberCount, isSelected, onClick }: GroupCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-px ${
        isSelected
          ? 'border-2 shadow-md'
          : 'border-2 border-gray-200 bg-white shadow-sm'
      }`}
      style={isSelected ? { borderColor: group.color, background: `${group.color}08`, boxShadow: `0 4px 12px ${group.color}20` } : {}}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 self-stretch rounded-full flex-shrink-0"
          style={{ background: group.color, minHeight: 36 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{group.name}</span>
            {group.isSystem && (
              <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">System</span>
            )}
          </div>
          {group.description && (
            <div className="text-xs text-gray-400 mt-0.5 truncate">{group.description}</div>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${group.color}18`, color: group.color }}
            >
              {group.permissions.length} permissions
            </span>
            <span className="text-[11px] text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

interface EmployeeCardProps {
  emp: EmployeePermission;
  group: PermissionGroup | undefined;
  effectiveCount: number;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

function EmployeeCard({ emp, group, effectiveCount, isSelected, isDimmed, onClick }: EmployeeCardProps) {
  const initials = getInitials(emp.employeeName);
  const locLabel = emp.locScope === 'all'
    ? 'All Locations'
    : emp.locations.map(l => l.name).join(', ') || 'No locations';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-px border-2"
      style={{
        opacity: isDimmed ? 0.35 : 1,
        borderColor: isSelected ? '#3b82f6' : group ? group.color + '40' : '#e5e7eb',
        background: isSelected ? '#eff6ff' : '#fff',
        boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.15)' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
          style={{ background: group?.color || '#94a3b8' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] text-gray-900 truncate">{emp.employeeName}</div>
          <div className="text-[11px] text-gray-400">{getRoleLabel(emp)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {group && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: `${group.color}18`, color: group.color }}
          >
            {group.name}
          </span>
        )}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${emp.locScope === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {locLabel}
        </span>
        {effectiveCount !== (group?.permissions.length ?? 0) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
            {effectiveCount} effective
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Architecture view ────────────────────────────────────────────

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

function ArchitectureView({
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
    <div className="grid grid-cols-3 gap-5 items-start">
      {/* Column 1: Permission Groups */}
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Permission Groups (WHAT)
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
            <div className="text-sm text-gray-400 text-center py-8">No permission groups</div>
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
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Locations (WHERE)
        </div>

        {/* Location grid */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-1.5">
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

            {/* Group detail */}
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
                    <span className="text-gray-400">Employees assigned</span>
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

// ─── Matrix view ──────────────────────────────────────────────────

interface MatrixViewProps {
  groups: PermissionGroup[];
  onToggle: (groupId: string, permission: string) => void;
}

function MatrixView({ groups, onToggle }: MatrixViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 border-b-2 border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[160px]">
              Module / Action
            </th>
            {groups.map(g => (
              <th key={g.id} className="text-center px-3 py-3 border-b-2 border-gray-200 min-w-[90px]">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
                  style={{ background: `${g.color}18`, color: g.color }}
                >
                  {g.name}
                  {g.isSystem && <span className="ml-1 text-[9px] opacity-60">🔒</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map(mod =>
            mod.actions.map((action, ai) => {
              const permId = `${mod.name.toLowerCase()}.${action.toLowerCase()}`;
              const isLastAction = ai === mod.actions.length - 1;
              return (
                <tr
                  key={permId}
                  className={isLastAction ? 'border-b-2 border-gray-200' : 'border-b border-gray-50'}
                  style={{ background: ai % 2 === 0 ? '#fff' : '#fafafa' }}
                >
                  <td className="px-4 py-2 sticky left-0 bg-inherit z-10">
                    {ai === 0 ? (
                      <span className="font-semibold text-gray-900">{mod.name}</span>
                    ) : (
                      <span className="ml-4 text-gray-400">{action}</span>
                    )}
                    {ai === 0 && <span className="ml-2 text-gray-300 text-[11px]">{action}</span>}
                  </td>
                  {groups.map(g => {
                    const has = g.permissions.includes(permId);
                    const isSystem = g.isSystem;
                    return (
                      <td key={g.id} className="text-center px-2 py-2">
                        <button
                          type="button"
                          onClick={() => !isSystem && onToggle(g.id, permId)}
                          className={`inline-flex w-6 h-6 rounded items-center justify-center text-xs font-bold transition-all ${
                            isSystem ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-110 hover:shadow-sm'
                          }`}
                          style={has ? { background: `${g.color}18`, color: g.color } : { background: '#f8fafc', color: '#e2e8f0' }}
                          title={isSystem ? 'System group — cannot modify' : has ? `Remove ${permId} from ${g.name}` : `Grant ${permId} to ${g.name}`}
                        >
                          {has ? '✓' : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Logic flow view ──────────────────────────────────────────────

interface LogicFlowViewProps {
  groups: PermissionGroup[];
  employees: EmployeePermission[];
  getEffective: (emp: EmployeePermission) => string[];
}

function LogicFlowView({ groups, employees, getEffective }: LogicFlowViewProps) {
  const exampleEmployees = employees.filter(e => e.overrides.grant.length > 0 || e.overrides.revoke.length > 0 || e.locScope !== 'all').slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* Step cards */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-5">How Permissions Are Resolved</h3>
        <div className="flex items-start gap-3 flex-wrap">
          {[
            {
              step: 'STEP 1',
              title: 'Permission Group',
              desc: 'Employee is assigned to a group (e.g., "Dentist"). This sets the base permissions.',
              bg: '#eff6ff', border: '#bfdbfe', titleColor: '#1e40af', stepColor: '#3b82f6',
            },
            {
              step: 'STEP 2',
              title: 'Location Scope',
              desc: 'Choose "All Locations" or pick specific branches. This limits where permissions apply.',
              bg: '#f0fdf4', border: '#bbf7d0', titleColor: '#15803d', stepColor: '#16a34a',
            },
            {
              step: 'STEP 3 (Optional)',
              title: 'Individual Overrides',
              desc: '+Grant extra permissions or -Revoke specific ones for edge cases.',
              bg: '#fefce8', border: '#fde68a', titleColor: '#a16207', stepColor: '#ca8a04',
            },
            {
              step: 'RESULT',
              title: 'Effective Access',
              desc: '= Group permissions + Grants - Revokes, scoped to assigned locations only.',
              bg: '#faf5ff', border: '#d8b4fe', titleColor: '#6d28d9', stepColor: '#7c3aed',
            },
          ].map((item, i) => (
            <div key={item.step} className="flex items-center gap-3">
              <div
                className="p-4 rounded-xl min-w-[170px] max-w-[200px]"
                style={{ background: item.bg, border: `2px solid ${item.border}` }}
              >
                <div className="text-[11px] font-bold mb-1" style={{ color: item.stepColor }}>{item.step}</div>
                <div className="text-sm font-semibold mb-1.5" style={{ color: item.titleColor }}>{item.title}</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</div>
              </div>
              {i < 3 && <span className="text-2xl text-gray-300 flex-shrink-0">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Formula box */}
      <div className="bg-gray-900 rounded-xl p-5 text-gray-200">
        <div className="text-[11px] font-semibold text-gray-500 mb-3 uppercase tracking-wide">Formula</div>
        <div className="font-mono text-[13px] leading-loose">
          <span className="text-blue-300">effective_permissions</span>
          <span className="text-gray-500"> = </span>
          <span className="text-green-300">group.permissions</span>
          <span className="text-gray-500"> + </span>
          <span className="text-yellow-300">overrides.grant</span>
          <span className="text-gray-500"> - </span>
          <span className="text-red-300">overrides.revoke</span>
          <br />
          <span className="text-blue-300">accessible_locations</span>
          <span className="text-gray-500"> = </span>
          <span className="text-green-300">scope === "all"</span>
          <span className="text-gray-500"> ? </span>
          <span className="text-yellow-300">ALL_LOCATIONS</span>
          <span className="text-gray-500"> : </span>
          <span className="text-purple-300">scope.locationIds</span>
          <br />
          <span className="text-blue-300">can_access(module, location)</span>
          <span className="text-gray-500"> = </span>
          <span className="text-green-300">effective_permissions.has(module)</span>
          <span className="text-gray-500"> &amp;&amp; </span>
          <span className="text-yellow-300">accessible_locations.has(location)</span>
        </div>
      </div>

      {/* Live examples */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Live Examples</h3>
        {exampleEmployees.length === 0 ? (
          <p className="text-sm text-gray-400">No employees with overrides or location restrictions found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {exampleEmployees.map(emp => {
              const group = groups.find(g => g.id === emp.groupId);
              const effective = getEffective(emp);
              return (
                <div key={emp.employeeId} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ background: group?.color || '#94a3b8' }}
                    >
                      {getInitials(emp.employeeName)}
                    </div>
                    <span className="font-semibold text-[13px] text-gray-900">{emp.employeeName}</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-9 leading-relaxed">
                    {group && (
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mr-1"
                        style={{ background: `${group.color}18`, color: group.color }}
                      >
                        {group.name}
                      </span>
                    )}
                    {' → '}
                    <strong>{group?.permissions.length ?? 0}</strong> base
                    {emp.overrides.grant.length > 0 && (
                      <span className="text-green-600"> + {emp.overrides.grant.length} granted</span>
                    )}
                    {emp.overrides.revoke.length > 0 && (
                      <span className="text-red-500"> - {emp.overrides.revoke.length} revoked</span>
                    )}
                    {' = '}
                    <strong>{effective.length}</strong> effective
                    {' · '}
                    <span className={emp.locScope === 'all' ? 'text-blue-600' : 'text-gray-600'}>
                      {emp.locScope === 'all'
                        ? 'All locations'
                        : emp.locations.map(l => l.name).join(', ') || 'No locations'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tip box */}
      <div className="bg-green-50 rounded-xl border-2 border-green-200 p-5">
        <h3 className="text-sm font-bold text-green-800 mb-2">Adding New Employee Types</h3>
        <div className="text-[13px] text-gray-600 leading-relaxed">
          Want to add a "Consultant" or "Intern" type? Just:<br />
          <strong>1.</strong> Create a new Permission Group with the right module access<br />
          <strong>2.</strong> Assign employees to it + pick their locations<br />
          <strong>3.</strong> Override individual permissions if needed<br />
          No code changes needed — it's all configuration.
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function PermissionBoard() {
  const { groups, employees, locations, loading, error, updateEmployee, toggleGroupPermission, getEffective, refetch } = usePermissionBoard();

  const [view, setView] = useState<'architecture' | 'matrix' | 'flow'>('architecture');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading permissions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-md text-center">
          {error}
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Permission System Architecture</h2>
          </div>
          <p className="text-sm text-gray-500">Click on groups or employees to explore the permission logic</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {([
          { id: 'architecture', label: 'Architecture' },
          { id: 'matrix', label: 'Permission Matrix' },
          { id: 'flow', label: 'Logic Flow' },
        ] as const).map(v => (
          <button
            key={v.id}
            onClick={() => { setView(v.id); setSelectedGroupId(null); setSelectedEmployeeId(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
              view === v.id
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {view === 'architecture' && (
        <ArchitectureView
          groups={groups}
          employees={employees}
          locations={locations}
          selectedGroupId={selectedGroupId}
          selectedEmployeeId={selectedEmployeeId}
          onSelectGroup={setSelectedGroupId}
          onSelectEmployee={setSelectedEmployeeId}
          getEffective={getEffective}
          updateEmployee={updateEmployee}
        />
      )}
      {view === 'matrix' && <MatrixView groups={groups} onToggle={toggleGroupPermission} />}
      {view === 'flow' && <LogicFlowView groups={groups} employees={employees} getEffective={getEffective} />}
    </div>
  );
}
