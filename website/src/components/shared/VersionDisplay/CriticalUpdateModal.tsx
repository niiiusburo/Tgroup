import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CriticalUpdateModalProps {
  readonly currentVersion: string;
  readonly latestVersion: string;
  readonly countdownRemaining: number;
  readonly onUpdateNow: () => void;
}

export function CriticalUpdateModal({
  currentVersion,
  latestVersion,
  countdownRemaining,
  onUpdateNow,
}: CriticalUpdateModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-center">
        <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Critical Update Required</h2>
        <p className="text-sm text-gray-600 mb-4">
          A critical update is required to keep the app secure and stable.
          <br />
          <span className="font-medium text-gray-800">
            v{currentVersion} → v{latestVersion}
          </span>
        </p>
        <div className="text-3xl font-mono font-bold text-red-600 mb-6">
          {countdownRemaining}s
        </div>
        <button
          onClick={onUpdateNow}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Update Now
        </button>
        <p className="text-xs text-gray-400 mt-3">
          The page will automatically reload when the countdown reaches zero.
        </p>
      </div>
    </div>
  );
}
