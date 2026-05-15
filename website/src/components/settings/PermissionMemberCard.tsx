/**
 * PermissionMemberCard — single member row with location scope and overrides
 *
 * Extracted from PermissionGroupConfig to keep module size under 500 lines.
 */

import { useState } from 'react';
import { MapPin, Globe, Shield, X, Check, Plus, ChevronDown } from 'lucide-react';
import type { GroupMember } from '@/hooks/useGroupMembers';
import type { Permission } from '@/data/mockPermissionGroups';
import type { LocationBranch } from '@/hooks/useLocations';

interface Props {
  readonly member: GroupMember;
  readonly groupColor: string;
  readonly groupPermissions: readonly string[];
  readonly allPermissions: readonly Permission[];
  readonly allLocations: readonly LocationBranch[];
  readonly membersMutating: boolean;
  readonly onRemove: (employeeId: string) => void;
  readonly onToggleLocation: (employeeId: string, locationId: string) => void;
  readonly onSetAllLocations: (employeeId: string, all: boolean) => void;
  readonly onToggleOverrideGrant: (employeeId: string, permissionId: string) => void;
  readonly onToggleOverrideRevoke: (employeeId: string, permissionId: string) => void;
}

export function PermissionMemberCard({
  member,
  groupColor,
  groupPermissions,
  allPermissions,
  allLocations,
  membersMutating,
  onRemove,
  onToggleLocation,
  onSetAllLocations,
  onToggleOverrideGrant,
  onToggleOverrideRevoke,
}: Props) {
  const isAllLocations = member.locScope === 'all';
  const [showGrantPicker, setShowGrantPicker] = useState(false);

  const grantedExtras = allPermissions.filter(
    (p) => !groupPermissions.includes(p.id) && member.overrides.grant.includes(p.id)
  );
  const grantablePermissions = allPermissions.filter(
    (p) => !groupPermissions.includes(p.id) && !member.overrides.grant.includes(p.id)
  );

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: groupColor }}
          >
            {member.employeeName?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{member.employeeName}</div>
            <div className="text-xs text-gray-500">{member.employeeEmail}</div>
          </div>
        </div>
        <button
          onClick={() => onRemove(member.employeeId)}
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
            onChange={(e) => onSetAllLocations(member.employeeId, e.target.checked)}
            disabled={membersMutating}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          <Globe className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors" />
          <span className={`text-xs font-medium ${isAllLocations ? 'text-primary' : 'text-gray-600'}`}>
            All Locations
          </span>
        </label>

        {!isAllLocations && allLocations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 ml-6">
            {allLocations.map((loc) => {
              const checked = member.locations.some((l) => l.id === loc.id);
              return (
                <label
                  key={loc.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLocation(member.employeeId, loc.id)}
                    disabled={membersMutating}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary"
                  />
                  <span className={`text-xs font-medium truncate ${checked ? 'text-gray-900' : 'text-gray-500'}`}>
                    {loc.name}
                  </span>
                </label>
              );
            })}
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

      {/* Overrides */}
      <div className="ml-12 mt-3 pt-3 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          Permission Overrides:
        </div>

        {/* Revoke overrides */}
        {groupPermissions.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] text-gray-500">Block group permissions:</div>
            <div className="flex flex-wrap gap-1.5">
              {groupPermissions.map((permId) => {
                const perm = allPermissions.find((p) => p.id === permId);
                const isRevoked = member.overrides.revoke.includes(permId);
                return (
                  <button
                    key={permId}
                    onClick={() => onToggleOverrideRevoke(member.employeeId, permId)}
                    disabled={membersMutating}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-all ${
                      isRevoked
                        ? 'bg-red-50 border-red-200 text-red-600 line-through'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    } disabled:opacity-50`}
                    title={perm?.description ?? permId}
                  >
                    {isRevoked && <X className="w-2.5 h-2.5" />}
                    {perm?.action ?? permId}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grant overrides */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">Extra permissions:</div>
            {grantablePermissions.length > 0 && (
              <button
                onClick={() => setShowGrantPicker((s) => !s)}
                disabled={membersMutating}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                Add
                <ChevronDown className={`w-3 h-3 transition-transform ${showGrantPicker ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {showGrantPicker && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200">
              {grantablePermissions.map((perm) => (
                <button
                  key={perm.id}
                  onClick={() => {
                    onToggleOverrideGrant(member.employeeId, perm.id);
                    setShowGrantPicker(false);
                  }}
                  disabled={membersMutating}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                  title={perm.description}
                >
                  {perm.action}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {grantedExtras.map((perm) => (
              <button
                key={perm.id}
                onClick={() => onToggleOverrideGrant(member.employeeId, perm.id)}
                disabled={membersMutating}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 hover:border-emerald-300 transition-all disabled:opacity-50"
              >
                <Check className="w-2.5 h-2.5" />
                {perm.action}
              </button>
            ))}
            {grantedExtras.length === 0 && !showGrantPicker && (
              <span className="text-[11px] text-gray-400 italic">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
