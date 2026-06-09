/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[all NK3 forms and tracked buttons]
 * @crossref:uses[website/src/lib/actionTracker.ts, product-map/domains/feedback-cms.yaml]
 *
 * ActionErrorToast — ephemeral banner shown when a tracked action fails.
 * Gives the user immediate feedback and an option to report the issue manually.
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ActionErrorToastProps {
  readonly message?: string;
  readonly action?: string;
  readonly onReport?: () => void;
  readonly autoDismissMs?: number;
}

export function ActionErrorToast({
  message,
  action,
  onReport,
  autoDismissMs = 10000,
}: ActionErrorToastProps) {
  const { t } = useTranslation('feedback');
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = setTimeout(dismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-[100] max-w-sm w-full rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg shadow-red-900/10 animate-in slide-in-from-bottom-2"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-100 shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900">
            {t('actionError.title', 'Something went wrong')}
          </p>
          <p className="text-sm text-red-700 mt-1">
            {message || t('actionError.defaultMessage', 'The action could not be completed.')}
          </p>
          {action && (
            <p className="text-xs text-red-500 mt-1">
              {t('actionError.actionLabel', 'Action: {{action}}', { action })}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {onReport && (
              <button
                type="button"
                onClick={() => {
                  onReport();
                  dismiss();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {t('actionError.reportButton', 'Report issue')}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              {t('actionError.dismissButton', 'Dismiss')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors shrink-0"
          aria-label={t('actionError.dismissAria', 'Dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
