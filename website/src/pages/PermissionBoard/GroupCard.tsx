import type { PermissionGroup } from '@/lib/api';

export interface GroupCardProps {
  group: PermissionGroup;
  memberCount: number;
  isSelected: boolean;
  onClick: () => void;
}

export function GroupCard({ group, memberCount, isSelected, onClick }: GroupCardProps) {
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
