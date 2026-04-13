import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ReportErrorProps {
  error: string;
  onRetry?: () => void;
}

export function ReportError({ error, onRetry }: ReportErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to load report</h3>
        <p className="text-sm text-gray-500 max-w-xs">{error || 'An unexpected error occurred'}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-all duration-150"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
