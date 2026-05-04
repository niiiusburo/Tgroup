/**
 * Relationships Page — Permission matrix and entity relationship map
 * @crossref:route[/relationships]
 * @crossref:used-in[App]
 * @crossref:uses[PermissionMatrix, EntityRelationshipMap]
 */

import { Network, Shield, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useRelationshipsData } from '@/hooks/useRelationshipsData';
import { PermissionMatrix } from '@/components/relationships/PermissionMatrix';
import { EntityRelationshipMap } from '@/components/relationships/EntityRelationshipMap';
import type { RelationshipsTab } from '@/hooks/useRelationshipsData';

const TABS: readonly { readonly id: RelationshipsTab; readonly label: string; readonly icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'permissions', label: 'Permission Matrix', icon: Shield },
  { id: 'entities', label: 'Entity Relationships', icon: GitBranch },
];

export function Relationships() {
  const { t } = useTranslation('common');
  const { hasPermission } = useAuth();
  const canEditPermissions = hasPermission('permissions.edit');
  const {
    activeTab,
    setActiveTab,
    selectedRoleId,
    toggleRole,
    selectedEntityId,
    toggleEntity,
    roles,
    permissionMatrix,
    entityNodes,
    entityRelations,
    selectedEntityRelations,
    isDirty,
    togglePermission,
    savePermissions,
    resetPermissions,
  } = useRelationshipsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('relationships', { ns: 'nav' })}
        subtitle="Role-based access control and entity connections"
        icon={<Network className="w-6 h-6 text-primary" />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="text-xs font-medium text-gray-500 mb-1">{t('relationships:roles')}</div>
          <div className="text-2xl font-bold text-gray-900">{roles.length}</div>
          <div className="flex gap-1.5 mt-2">
            {roles.map((r) => (
              <span
                key={r.id}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: r.color }}
                title={r.name}
              />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="text-xs font-medium text-gray-500 mb-1">{t('relationships:entities')}</div>
          <div className="text-2xl font-bold text-gray-900">{entityNodes.length}</div>
          <div className="text-xs text-gray-400 mt-2">
            {entityNodes.filter((n) => n.type === 'core').length} core ·{' '}
            {entityNodes.filter((n) => n.type === 'support').length} support ·{' '}
            {entityNodes.filter((n) => n.type === 'external').length} external
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="text-xs font-medium text-gray-500 mb-1">{t('relationships:connections')}</div>
          <div className="text-2xl font-bold text-gray-900">{entityRelations.length}</div>
          <div className="text-xs text-gray-400 mt-2">
            Linking entities across modules
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'permissions' && (
        <PermissionMatrix
          roles={roles}
          permissionMatrix={permissionMatrix}
          selectedRoleId={selectedRoleId}
          onToggleRole={toggleRole}
          onTogglePermission={togglePermission}
          isDirty={isDirty}
          canEdit={canEditPermissions}
          onSave={savePermissions}
          onReset={resetPermissions}
        />
      )}

      {activeTab === 'entities' && (
        <EntityRelationshipMap
          entityNodes={entityNodes}
          entityRelations={entityRelations}
          selectedEntityId={selectedEntityId}
          selectedEntityRelations={selectedEntityRelations}
          onToggleEntity={toggleEntity}
        />
      )}
    </div>
  );
}
