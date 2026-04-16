import type { PermissionGroup } from '@/lib/api';
import { MODULES, PERMISSION_DESCRIPTIONS } from './constants';

interface MatrixViewProps {
  groups: PermissionGroup[];
  onToggle: (groupId: string, permission: string) => void;
}

export function MatrixView({ groups, onToggle }: MatrixViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[600px]">
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
              const permId = `${mod.name.toLowerCase().replace(/\s+/g, '_')}.${action.toLowerCase().replace(/\s+/g, '_')}`;
              const isLastAction = ai === mod.actions.length - 1;
              return (
                <tr
                  key={permId}
                  className={isLastAction ? 'border-b-2 border-gray-200' : 'border-b border-gray-50'}
                  style={{ background: ai % 2 === 0 ? '#fff' : '#fafafa' }}
                >
                  <td className="px-4 py-2 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-1.5">
                      {ai === 0 ? (
                        <>
                          <span className="font-semibold text-gray-900">{mod.name}</span>
                          <span className="ml-2 text-gray-300 text-[11px]">{action}</span>
                        </>
                      ) : (
                        <span className="ml-4 text-gray-400">{action}</span>
                      )}
                      {PERMISSION_DESCRIPTIONS[permId] && (
                        <span className="relative group/tooltip ml-1 cursor-help" data-testid={`perm-info-${permId}`}>
                          <svg className="w-3.5 h-3.5 text-gray-300 hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                          </svg>
                          <span
                            data-testid={`perm-tooltip-${permId}`}
                            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-opacity z-50 shadow-lg"
                          >
                            {PERMISSION_DESCRIPTIONS[permId]}
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                  {groups.map(g => {
                    const has = g.permissions.includes(permId);
                    return (
                      <td key={g.id} className="text-center px-2 py-2">
                        <button
                          type="button"
                          disabled={g.isSystem}
                          onClick={() => !g.isSystem && onToggle(g.id, permId)}
                          className={`inline-flex w-6 h-6 rounded items-center justify-center text-xs font-bold transition-all ${
                            g.isSystem
                              ? 'cursor-not-allowed opacity-80'
                              : 'cursor-pointer hover:scale-110 hover:shadow-sm'
                          }`}
                          style={has ? { background: `${g.color}18`, color: g.color } : { background: '#f8fafc', color: '#e2e8f0' }}
                          title={
                            g.isSystem
                              ? `${g.name} is locked (system group) — ${has ? 'has' : 'missing'} ${permId}`
                              : has
                                ? `Remove ${permId} from ${g.name}`
                                : `Grant ${permId} to ${g.name}`
                          }
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
