/**
 * PermissionBoard - Permission system architecture visualization and management
 * @crossref:used-in[App]
 * @crossref:uses[usePermissionBoard, PermissionGroup as Tier, EmployeePermission]
 */

import { useState } from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import { usePermissionBoard } from '@/hooks/usePermissionBoard';
import { ArchitectureView } from './ArchitectureView';
import { MatrixView } from './MatrixView';
import { LogicFlowView } from './LogicFlowView';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export function PermissionBoard() {
  const { t } = useTranslation('permissions');
  const { hasPermission } = useAuth();
  const canEditPermissions = hasPermission('permissions.edit');
  const { groups, employees, locations, loading, error, updateEmployee, toggleGroupPermission, getEffective, refetch } = usePermissionBoard();

  const [view, setView] = useState<'architecture' | 'matrix' | 'flow'>('architecture');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('loadingPermissions')}</span>
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
          {t('retry')}
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
            <h2 className="text-base font-semibold text-gray-900">{t('systemArchitecture')}</h2>
          </div>
          <p className="text-sm text-gray-500">{t('clickToExplore')}</p>
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
          canEdit={canEditPermissions}
        />
      )}
      {view === 'matrix' && <MatrixView groups={groups} onToggle={toggleGroupPermission} canEdit={canEditPermissions} />}
      {view === 'flow' && <LogicFlowView groups={groups} employees={employees} getEffective={getEffective} />}
    </div>
  );
}
