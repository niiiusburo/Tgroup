/**
 * ApiErrorPanel — API error display for TG Clinic modal forms.
 *
 * Shows structured API error information:
 * - Error message with icon
 * - Field-level error details
 * - Technical details (expandable)
 * - Hint text when available
 *
 * @crossref:used-in[FormShell, AddCustomerForm]
 */

import { useState } from 'react';
import { X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

export interface ApiErrorDetail {
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly field?: string;
  readonly detail?: string;
  readonly hint?: string;
  readonly raw?: unknown;
}

export interface ApiErrorPanelProps {
  detail: ApiErrorDetail;
  onDismiss: () => void;
  className?: string;
}

export function ApiErrorPanel({ detail, onDismiss, className }: ApiErrorPanelProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className={`mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm flex-shrink-0 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-700">{detail.message}</p>

            {detail.detail && (
              <p className="text-red-600 mt-1 break-words">{detail.detail}</p>
            )}

            {detail.field && (
              <p className="text-red-500 mt-1">
                <code className="bg-red-100 px-1 rounded">{detail.field}</code>
              </p>
            )}

            {detail.hint && (
              <p className="text-orange-600 mt-1">{detail.hint}</p>
            )}

            {/* Technical Details Toggle */}
            {(detail.status || detail.code || Boolean(detail.raw)) && (
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="flex items-center gap-1 mt-2 text-xs text-red-400 hover:text-red-600"
              >
                {showRaw ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Technical Details
              </button>
            )}

            {showRaw && (
              <pre className="mt-1 p-2 bg-red-100/50 rounded text-xs text-red-700 overflow-x-auto max-h-32 overflow-y-auto">
                {detail.status && <span>Status: {detail.status}<br /></span>}
                {detail.code && <span>Code: {detail.code}<br /></span>}
                {JSON.stringify(detail.raw as object, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 flex-shrink-0"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
