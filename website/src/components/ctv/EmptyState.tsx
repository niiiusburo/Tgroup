import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

interface EmptyStateProps {
  onAction?: () => void;
}

export function EmptyState({ onAction }: EmptyStateProps) {
  const { t } = useTranslation('ctv');

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-100 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Users className="w-8 h-8 text-gray-400" />
      </div>
      <div className="text-sm font-semibold text-gray-900 mb-1">{t('tracking.noClientsYet')}</div>
      <div className="text-xs text-gray-500 mb-4">{t('tracking.noClientsHint')}</div>
      {onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition active:scale-[0.98]"
        >
          {t('tracking.noClientsAction')}
        </button>
      )}
    </div>
  );
}
