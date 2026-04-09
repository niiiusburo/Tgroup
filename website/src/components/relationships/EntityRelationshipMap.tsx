/**
 * EntityRelationshipMap — Visual diagram of entity connections
 * @crossref:used-in[Relationships]
 * @crossref:uses[mockPermissions]
 */

import {
  Users, CalendarCheck, UserCog, Stethoscope,
  CreditCard, MapPin, Percent, BarChart3, Bell,
  ArrowRight,
} from 'lucide-react';
import type { EntityNode, EntityRelation } from '@/constants/entityGraph';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Users,
  CalendarCheck,
  UserCog,
  Stethoscope,
  CreditCard,
  MapPin,
  Percent,
  BarChart3,
  Bell,
};

const TYPE_LABELS: Record<EntityNode['type'], { label: string; bg: string }> = {
  core: { label: 'Core', bg: 'bg-blue-100 text-blue-700' },
  support: { label: 'Support', bg: 'bg-purple-100 text-purple-700' },
  external: { label: 'External', bg: 'bg-gray-100 text-gray-600' },
};

const RELATION_BADGES: Record<EntityRelation['type'], string> = {
  'one-to-many': '1:N',
  'many-to-many': 'N:N',
  'one-to-one': '1:1',
};

interface EntityRelationshipMapProps {
  readonly entityNodes: readonly EntityNode[];
  readonly entityRelations: readonly EntityRelation[];
  readonly selectedEntityId: string | null;
  readonly selectedEntityRelations: readonly EntityRelation[];
  readonly onToggleEntity: (entityId: string) => void;
}

export function EntityRelationshipMap({
  entityNodes,
  entityRelations,
  selectedEntityId,
  selectedEntityRelations,
  onToggleEntity,
}: EntityRelationshipMapProps) {
  const displayRelations = selectedEntityId
    ? selectedEntityRelations
    : entityRelations;

  const highlightedIds = selectedEntityId
    ? new Set([
        selectedEntityId,
        ...selectedEntityRelations.map((r) => r.from),
        ...selectedEntityRelations.map((r) => r.to),
      ])
    : null;

  const grouped = {
    core: entityNodes.filter((n) => n.type === 'core'),
    support: entityNodes.filter((n) => n.type === 'support'),
    external: entityNodes.filter((n) => n.type === 'external'),
  };

  return (
    <div className="space-y-4">
      {/* Entity type groups */}
      {(['core', 'support', 'external'] as const).map((type) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_LABELS[type].bg}`}>
              {TYPE_LABELS[type].label}
            </span>
            <span className="text-xs text-gray-400">
              {grouped[type].length} entities
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[type].map((node) => {
              const Icon = ICON_MAP[node.icon];
              const isSelected = selectedEntityId === node.id;
              const isHighlighted = highlightedIds === null || highlightedIds.has(node.id);
              const connectionCount = entityRelations.filter(
                (r) => r.from === node.id || r.to === node.id,
              ).length;

              return (
                <button
                  key={node.id}
                  onClick={() => onToggleEntity(node.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : isHighlighted
                      ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      : 'border-gray-100 bg-gray-50 opacity-40'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${node.color}15` }}
                  >
                    {Icon && <Icon className="w-5 h-5" style={{ color: node.color }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {node.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Relationship list */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">
            {selectedEntityId ? 'Related Connections' : 'All Connections'}
          </h3>
          <span className="text-xs text-gray-400">
            {displayRelations.length} relationship{displayRelations.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {displayRelations.map((rel, idx) => {
            const fromNode = entityNodes.find((n) => n.id === rel.from);
            const toNode = entityNodes.find((n) => n.id === rel.to);
            if (!fromNode || !toNode) return null;

            const FromIcon = ICON_MAP[fromNode.icon];
            const ToIcon = ICON_MAP[toNode.icon];

            return (
              <div
                key={`${rel.from}-${rel.to}-${idx}`}
                className="p-3 flex items-center gap-3 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${fromNode.color}15` }}
                  >
                    {FromIcon && (
                      <FromIcon className="w-3.5 h-3.5" style={{ color: fromNode.color }} />
                    )}
                  </div>
                  <span className="font-medium text-gray-700 truncate">
                    {fromNode.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400 italic">{rel.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-500">
                    {RELATION_BADGES[rel.type]}
                  </span>
                </div>

                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                  <span className="font-medium text-gray-700 truncate">
                    {toNode.name}
                  </span>
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${toNode.color}15` }}
                  >
                    {ToIcon && (
                      <ToIcon className="w-3.5 h-3.5" style={{ color: toNode.color }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
