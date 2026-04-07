/**
 * Role Configuration — define roles and permissions
 * @crossref:used-in[Settings, Employees, Relationships]
 * @crossref:uses[useRoleConfig]
 */

import { Shield, ChevronRight, Check } from 'lucide-react';
import { useRoleConfig } from '@/hooks/useSettings';

export function RoleConfig() {
  const {
    roles,
    selectedRole,
    selectedRoleId,
    setSelectedRoleId,
    permissionsByModule,
    togglePermission,
  } = useRoleConfig();

  return (
    <div className="space-y-6">
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedRoleId === role.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${role.color}15` }}
                >
                  <Shield className="w-5 h-5" style={{ color: role.color }} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{role.name}</div>
                  <div className="text-xs text-gray-500">{role.description}</div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                selectedRoleId === role.id ? 'rotate-90' : ''
              }`} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${role.color}15`, color: role.color }}
              >
                {role.permissions.length} permissions
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Permission matrix */}
      {selectedRole && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: selectedRole.color }} />
              <h3 className="font-semibold text-gray-900">
                {selectedRole.name} — Permissions
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Toggle permissions for this role. Changes take effect immediately.
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module} className="px-4 py-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {module}
                </div>
                <div className="flex flex-wrap gap-2">
                  {perms.map((perm) => {
                    const hasPermission = selectedRole.permissions.includes(perm.id);
                    const isAdmin = selectedRole.id === 'admin';
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => {
                          if (!isAdmin) togglePermission(selectedRole.id, perm.id);
                        }}
                        disabled={isAdmin}
                        title={perm.description}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          hasPermission
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } ${isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {hasPermission && <Check className="w-3 h-3" />}
                        {perm.action}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedRole.id === 'admin' && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
              <p className="text-xs text-amber-700">
                Admin role has all permissions by default and cannot be modified.
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedRole && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-400">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a role above to view and manage its permissions.</p>
        </div>
      )}
    </div>
  );
}
