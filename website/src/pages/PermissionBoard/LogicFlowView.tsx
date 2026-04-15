import type { PermissionGroup, EmployeePermission } from '@/lib/api';
import { getInitials } from './constants';

interface LogicFlowViewProps {
  groups: PermissionGroup[];
  employees: EmployeePermission[];
  getEffective: (emp: EmployeePermission) => string[];
}

export function LogicFlowView({ groups, employees, getEffective }: LogicFlowViewProps) {
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
          <strong>1.</strong> Create a new Tier with the right module access<br />
          <strong>2.</strong> Assign employees to that tier + pick their locations<br />
          <strong>3.</strong> Override individual permissions if needed<br />
          No code changes needed — it's all configuration.
        </div>
      </div>
    </div>
  );
}
