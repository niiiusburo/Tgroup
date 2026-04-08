/**
 * VersionDisplay - Shows app version and update status
 * @crossref:used-in[Layout, Footer]
 * @crossref:uses[useVersionCheck]
 * 
 * Features:
 * - Shows current version + git commit in footer
 * - Click to check for updates
 * - Shows update notification when new version available
 */

import { useState } from 'react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { 
  RefreshCw, 
  Check, 
  AlertCircle, 
  X, 
  Info,
  GitCommit,
  Clock,
  Tag,
  Download
} from 'lucide-react';

interface VersionDisplayProps {
  /** Position variant */
  variant?: 'footer' | 'sidebar' | 'floating';
  /** Show detailed info on hover */
  showDetails?: boolean;
}

export function VersionDisplay({ 
  variant = 'footer',
  showDetails = true 
}: VersionDisplayProps) {
  const {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    isChecking,
    error,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
  } = useVersionCheck({
    pollInterval: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });

  const [showTooltip, setShowTooltip] = useState(false);

  if (!currentVersion) {
    return null;
  }

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Handle update click - uses hook's applyUpdate which clears all caches properly
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleUpdate = async () => {
    setIsUpdating(true);
    console.log('[Version] Applying update...');
    await applyUpdate();
    // Page will reload, so we never get here
  };

  // Floating variant shows as a card in bottom right
  if (variant === 'floating') {
    return (
      <div className="flex flex-col items-end gap-2">
        {/* Update Available Card */}
        {isUpdateAvailable && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 max-w-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Update Available</h4>
                <p className="text-xs text-white/90 mt-1">
                  New version {latestVersion?.version} is ready. Click to refresh.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isUpdating ? 'Updating...' : 'Update Now'}
                  </button>
                  <button
                    onClick={dismissUpdate}
                    className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={dismissUpdate}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Version Badge */}
        <div 
          className="relative"
          onMouseEnter={() => showDetails && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            onClick={checkForUpdates}
            disabled={isChecking}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs
              transition-all duration-200 shadow-lg
              ${isUpdateAvailable 
                ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }
            `}
            title="Click to check for updates"
          >
            {isChecking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : error ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            ) : isUpdateAvailable ? (
              <Download className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Check className="w-3.5 h-3.5 text-green-500" />
            )}
            
            <span className="font-mono font-medium">
              v{currentVersion.version}
            </span>
            
            {currentVersion.gitCommit !== 'unknown' && (
              <span className="text-gray-400">
                ({currentVersion.gitCommit.slice(0, 7)})
              </span>
            )}
          </button>

          {/* Tooltip */}
          {showTooltip && showDetails && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span>Version: <span className="font-mono font-semibold">{currentVersion.version}</span></span>
                  </div>
                  
                  {currentVersion.gitCommit !== 'unknown' && (
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-3 h-3 text-gray-400" />
                      <span>Commit: <span className="font-mono">{currentVersion.gitCommit.slice(0, 7)}</span></span>
                    </div>
                  )}
                  
                  {currentVersion.gitBranch !== 'unknown' && (
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-3 h-3 text-gray-400 rotate-90" />
                      <span>Branch: <span className="font-semibold">{currentVersion.gitBranch}</span></span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>Built: {formatDate(currentVersion.buildTime)}</span>
                  </div>
                  
                  <div className="pt-1.5 mt-1.5 border-t border-gray-700">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Click to check for updates
                    </span>
                  </div>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full right-4 -mt-1">
                <div className="w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact footer/sidebar display (original behavior)
  const baseClasses = `
    flex items-center gap-2 text-xs 
    transition-colors cursor-pointer
    ${variant === 'footer' ? 'justify-center' : ''}
    ${isUpdateAvailable ? 'text-amber-400 hover:text-amber-300' : 'text-gray-400 hover:text-gray-300'}
  `;

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => showDetails && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Update available inline notification */}
      {isUpdateAvailable && (
        <div className="mb-2 p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-amber-400 font-medium">Update Available</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissUpdate();
              }}
              className="p-0.5 hover:bg-amber-500/30 rounded transition-colors"
            >
              <X className="w-3 h-3 text-amber-400" />
            </button>
          </div>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 bg-amber-500 text-white text-[10px] font-semibold rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {isUpdating ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {isUpdating ? 'Updating...' : 'Update Now'}
          </button>
        </div>
      )}

      <button
        onClick={checkForUpdates}
        disabled={isChecking}
        className={baseClasses}
        title="Click to check for updates"
      >
        {isChecking ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : error ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        ) : isUpdateAvailable ? (
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Check className="w-3.5 h-3.5 text-green-400" />
        )}
        
        <span className="font-mono">
          v{currentVersion.version}
        </span>
        
        {currentVersion.gitCommit !== 'unknown' && (
          <span className="text-gray-500">
            ({currentVersion.gitCommit.slice(0, 7)})
          </span>
        )}
      </button>

      {/* Tooltip with detailed info */}
      {showTooltip && showDetails && !isUpdateAvailable && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3 text-gray-400" />
                <span>Version: <span className="font-mono font-semibold">{currentVersion.version}</span></span>
              </div>
              
              {currentVersion.gitCommit !== 'unknown' && (
                <div className="flex items-center gap-2">
                  <GitCommit className="w-3 h-3 text-gray-400" />
                  <span>Commit: <span className="font-mono">{currentVersion.gitCommit.slice(0, 7)}</span></span>
                </div>
              )}
              
              {currentVersion.gitBranch !== 'unknown' && (
                <div className="flex items-center gap-2">
                  <GitCommit className="w-3 h-3 text-gray-400 rotate-90" />
                  <span>Branch: <span className="font-semibold">{currentVersion.gitBranch}</span></span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Built: {formatDate(currentVersion.buildTime)}</span>
              </div>
              
              <div className="pt-1.5 mt-1.5 border-t border-gray-700">
                <span className="text-gray-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Click to check for updates
                </span>
              </div>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionDisplay;
