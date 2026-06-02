import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FeedbackLoginHintProps {
  readonly onDismiss: () => void;
}

export function FeedbackLoginHint({ onDismiss }: FeedbackLoginHintProps) {
  const { t } = useTranslation('feedback');

  return (
    <div
      role="status"
      className="absolute right-0 top-full mt-2 z-40 w-64 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <span
        aria-hidden="true"
        className="absolute -top-1.5 right-4 w-3 h-3 bg-white ring-1 ring-gray-200 rotate-45"
      />
      <div className="relative flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {t('loginHintTitle')}
          </p>
          <p className="mt-1 text-xs text-gray-600 leading-snug">
            {t('loginHintBody')}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('loginHintDismiss')}
          className="-mr-1 -mt-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
