/**
 * PermissionMatrix — Role-based access control grid
 * @crossref:used-in[Relationships]
 * @crossref:uses[mockPermissions]
 */

import { Shield, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Role, Permission } from '@/types/permissions';

interface PermissionMatrixProps {
  readonly roles: readonly Role[];
  readonly permissionMatrix: readonly {
    readonly module: string;
    readonly permissions: readonly Permission[];
    readonly roleAccess: readonly {
      readonly roleId: string;
      readonly roleName: string;
      readonly permissions: readonly {
        readonly id: string;
        readonly action: string;
        readonly granted: boolean;
      }[];
    }[];
  }[];
  readonly selectedRoleId: string | null;
  readonly onToggleRole: (roleId: string) => void;
  readonly onTogglePermission: (roleId: string, permissionId: string, currentGranted: boolean) => void;
  readonly isDirty: boolean;
  readonly onSave: () => void;
  readonly onReset: () => void;
}

export function PermissionMatrix({
  roles,
  permissionMatrix,
  selectedRoleId,
  onToggleRole,
  onTogglePermission,
  isDirty,
  onSave,
  onReset,
}: PermissionMatrixProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const filteredMatrix = selectedRoleId
    ? permissionMatrix.map((row) => ({
        ...row,
        roleAccess: row.roleAccess.filter((ra) => ra.roleId === selectedRoleId),
      }))
    : permissionMatrix;

  const displayRoles = selectedRoleId
    ? roles.filter((r) => r.id === selectedRoleId)
    : roles;

  return (
    <div className="space-y-4">
      {/* Role filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Shield className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">Filter by role:</span>
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => onToggleRole(role.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedRoleId === role.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={
              selectedRoleId === role.id
                ? { backgroundColor: role.color }
                : undefined
            }
          >
            {role.name}
          </button>
        ))}
        {selectedRoleId && (
          <button
            onClick={() => onToggleRole(selectedRoleId)}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Click on any permission cell to toggle access
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            disabled={!isDirty}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={!isDirty}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Matrix table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600 min-w-[180px]">
                  Module / Action
                </th>
                {displayRoles.map((role) => (
                  <th
                    key={role.id}
                    className="p-3 font-medium text-center min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="text-gray-700 text-xs">{role.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((row) => {
                const isExpanded = expandedModules.has(row.module);
                const totalGranted = row.roleAccess.reduce(
                  (sum, ra) => sum + ra.permissions.filter((p) => p.granted).length,
                  0,
                );
                const totalPossible = row.roleAccess.reduce(
                  (sum, ra) => sum + ra.permissions.length,
                  0,
                );

                return (
                  <ModuleRow
                    key={row.module}
                    module={row.module}
                    isExpanded={isExpanded}
                    onToggle={() => toggleModule(row.module)}
                    roleAccess={row.roleAccess}
                    totalGranted={totalGranted}
                    totalPossible={totalPossible}
                    onTogglePermission={onTogglePermission}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </span>
          Granted
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
            <X className="w-3 h-3 text-gray-300" />
          </span>
          Denied
        </div>
      </div>
    </div>
  );
}

interface ModuleRowProps {
  readonly module: string;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly roleAccess: readonly {
    readonly roleId: string;
    readonly roleName: string;
    readonly permissions: readonly {
      readonly id: string;
      readonly action: string;
      readonly granted: boolean;
    }[];
  }[];
  readonly totalGranted: number;
  readonly totalPossible: number;
  readonly onTogglePermission: (roleId: string, permissionId: string, currentGranted: boolean) => void;
}

function ModuleRow({
  module,
  isExpanded,
  onToggle,
  roleAccess,
  totalGranted,
  totalPossible,
  onTogglePermission,
}: ModuleRowProps) {
  const Chevron = isExpanded ? ChevronUp : ChevronDown;

  return (
    <>
      {/* Module header row */}
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Chevron className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{module}</span>
            <span className="text-xs text-gray-400">
              {totalGranted}/{totalPossible}
            </span>
          </div>
        </td>
        {roleAccess.map((ra) => {
          const grantedCount = ra.permissions.filter((p) => p.granted).length;
          const total = ra.permissions.length;
          const allGranted = grantedCount === total;
          const noneGranted = grantedCount === 0;

          return (
            <td key={ra.roleId} className="p-3 text-center">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                  allGranted
                    ? 'bg-green-100 text-green-700'
                    : noneGranted
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {grantedCount}
              </span>
            </td>
          );
        })}
      </tr>

      {/* Expanded permission rows */}
      {isExpanded &&
        roleAccess[0]?.permissions.map((perm, idx) => (
          <tr
            key={perm.id}
            className="border-b border-gray-50 bg-gray-50/50"
          >
            <td className="p-3 pl-10 text-gray-600">{perm.action}</td>
            {roleAccess.map((ra) => {
              const granted = ra.permissions[idx]?.granted ?? false;
              return (
                <td key={ra.roleId} className="p-3 text-center">
                  <button
                    onClick={() => onTogglePermission(ra.roleId, perm.id, granted)}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded transition-all hover:scale-110 ${
                      granted
                        ? 'bg-green-100 hover:bg-green-200'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title={granted ? 'Click to deny' : 'Click to grant'}
                  >
                    {granted ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}
