import { Globe, Lock, MapPin, ToggleLeft, ToggleRight, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CustomerSource } from '@/types/settings';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  online: <Globe className="w-4 h-4" />,
  offline: <MapPin className="w-4 h-4" />,
  referral: <UserPlus className="w-4 h-4" />,
  normal: <MapPin className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  online: 'bg-blue-100 text-blue-700',
  offline: 'bg-amber-100 text-amber-700',
  referral: 'bg-green-100 text-green-700',
  normal: 'bg-gray-100 text-gray-700',
};

const FALLBACK_TYPE_COLOR = 'bg-gray-100 text-gray-700';

interface CustomerSourceRowProps {
  source: CustomerSource;
  referenced: boolean;
  editing: boolean;
  draftDescription: string;
  onDraftDescriptionChange: (value: string) => void;
  onEditDescription: () => void;
  onCancelDescription: () => void;
  onCommitDescription: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}

export function CustomerSourceRow({
  source,
  referenced,
  editing,
  draftDescription,
  onDraftDescriptionChange,
  onEditDescription,
  onCancelDescription,
  onCommitDescription,
  onToggleActive,
  onRemove,
}: CustomerSourceRowProps) {
  const { t } = useTranslation('settings');
  const typeColor = TYPE_COLORS[source.type] || FALLBACK_TYPE_COLOR;

  return (
    <div
      data-testid={`customer-source-row-${source.id}`}
      data-source-name={source.name}
      data-referenced={referenced ? 'true' : 'false'}
      className={`bg-white rounded-xl shadow-card p-4 flex items-center gap-4 transition-opacity ${
        !source.isActive ? 'opacity-60' : ''
      }`}
    >
      <div className={`p-2 rounded-lg ${typeColor}`}>
        {TYPE_ICONS[source.type] || <MapPin className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900" data-testid="source-name">{source.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor}`}>
            {source.type}
          </span>
          {referenced && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
              title={t('customerSourcesConfig.labelLockedTitle')}
            >
              <Lock className="w-3 h-3" />
              {t('customerSourcesConfig.labelLocked')}
            </span>
          )}
        </div>
        {editing ? (
          <input
            type="text"
            value={draftDescription}
            onChange={(event) => onDraftDescriptionChange(event.target.value)}
            onBlur={onCommitDescription}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onCommitDescription();
              }
              if (event.key === 'Escape') {
                onCancelDescription();
              }
            }}
            autoFocus
            className="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label={t('customerSourcesConfig.description')}
          />
        ) : (
          <button
            type="button"
            onClick={onEditDescription}
            className="text-xs text-gray-500 mt-0.5 text-left hover:text-gray-700"
            title={t('customerSourcesConfig.editDescription')}
          >
            {source.description || t('customerSourcesConfig.addDescription')}
          </button>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-gray-900">{source.customerCount} / {source.orderCount}</div>
        <div className="text-xs text-gray-500">{t('customerSourcesConfig.customersOrders')}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleActive}
          title={source.isActive ? t('customerSourcesConfig.deactivate') : t('customerSourcesConfig.activate')}
        >
          {source.isActive ? (
            <ToggleRight className="w-6 h-6 text-green-500" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-400" />
          )}
        </button>
        {!referenced && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title={t('customerSourcesConfig.removeSource')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
