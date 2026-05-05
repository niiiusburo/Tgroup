/**
 * VersionDisplay - Shows app version and update status
 * @crossref:used-in[Layout, Footer]
 * @crossref:uses[useVersionCheck]
 *
 * Features:
 * - Shows current version + git commit in footer
 * - Click to check for updates
 * - Shows update notification when new version available
 * - Inline release notes indicator (*)
 * - Hover/click to view full release notes
 * - Critical update modal with countdown auto-reload
 * - Regular updates snoozeable for 24h
 */

import { useState, useEffect, useRef } from 'react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import {
  RefreshCw,
  Check,
  AlertCircle,
  X,
  GitCommit,
  Clock,
  Tag,
  Download,
  FileText,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { CriticalUpdateModal } from './VersionDisplay/CriticalUpdateModal';
import { InlineReleaseNotes } from './VersionDisplay/InlineReleaseNotes';
import { ReleaseNotesModal } from './VersionDisplay/ReleaseNotesModal';
import type { ChangelogEntry } from './VersionDisplay/types';
import { formatDate } from './VersionDisplay/versionDisplayUtils';

// ─── Main Component ───────────────────────────────────────────────

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
  // All state hooks must be called first, before any early returns
  const [showTooltip, setShowTooltip] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [currentHighlights, setCurrentHighlights] = useState<string>('');
  const [dismissedHighlights, setDismissedHighlights] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tgclinic_dismissed_highlights') || '';
    }
    return '';
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    updateSeverity,
    countdownRemaining,
    isChecking,
    error,
    checkForUpdates,
    applyUpdate,
    snoozeUpdate,
  } = useVersionCheck({
    pollInterval: 5 * 60 * 1000,
    enabled: !import.meta.env.DEV,
  });

  // Fetch current version highlights on mount
  useEffect(() => {
    if (!currentVersion) return;

    // Reset dismissal if version changed
    const storedDismissed = localStorage.getItem('tgclinic_dismissed_highlights');
    if (storedDismissed && storedDismissed !== currentVersion.version) {
      localStorage.removeItem('tgclinic_dismissed_highlights');
      setDismissedHighlights('');
    }

    fetch('/CHANGELOG.json?v=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ChangelogEntry[]) => {
        const currentEntry = data.find(e => e.version === currentVersion.version);
        if (currentEntry) {
          setCurrentHighlights(currentEntry.highlights);
        }
      })
      .catch(() => setCurrentHighlights(''));
  }, [currentVersion]);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  // Handle update click
  const handleUpdate = async () => {
    setIsUpdating(true);
    await applyUpdate();
  };

  const handleReleaseNotesClick = () => {
    setShowReleaseNotes(true);
    setShowTooltip(false);
  };

  const handleDismissHighlights = () => {
    if (currentVersion) {
      localStorage.setItem('tgclinic_dismissed_highlights', currentVersion.version);
      setDismissedHighlights(currentVersion.version);
    }
  };

  // Early return AFTER all hooks
  if (!currentVersion) {
    return null;
  }

  // Floating variant shows as a card in bottom right
  if (variant === 'floating') {
    return (
      <div className="flex flex-col items-end gap-2">
        {/* Critical Update Modal */}
        {isUpdateAvailable && updateSeverity === 'critical' && latestVersion && countdownRemaining !== null && (
          <CriticalUpdateModal
            currentVersion={currentVersion.version}
            latestVersion={latestVersion.version}
            countdownRemaining={countdownRemaining}
            onUpdateNow={handleUpdate}
          />
        )}

        {/* Regular Update Available Card */}
        {isUpdateAvailable && updateSeverity !== 'critical' && (
          <div className="bg-primary text-white rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 max-w-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Update Available</h4>
                <p className="text-xs text-white/90 mt-1">
                  New version {latestVersion?.version} is ready.
                </p>
                {currentHighlights && (
                  <p className="text-xs text-white/80 mt-1 line-clamp-2 italic">
                    "{currentHighlights}"
                  </p>
                )}
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
                    onClick={handleReleaseNotesClick}
                    className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    Notes
                  </button>
                  <button
                    onClick={snoozeUpdate}
                    className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/80 transition-colors"
                  >
                    Snooze 24h
                  </button>
                </div>
              </div>
              <button
                onClick={snoozeUpdate}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Version Badge + Inline Release Notes */}
        <div className="flex flex-col items-end gap-1">
          {/* Inline Release Notes Preview */}
          {currentHighlights && !isUpdateAvailable && dismissedHighlights !== currentVersion?.version && (
            <InlineReleaseNotes
              highlights={currentHighlights}
              onClick={handleReleaseNotesClick}
              onClose={handleDismissHighlights}
            />
          )}

          {/* Version Badge with Persistent Tooltip */}
          <div className="relative" ref={tooltipRef}>
            <button
              ref={buttonRef}
              data-testid="version-badge"
              onClick={() => setShowTooltip(!showTooltip)}
              disabled={isChecking}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                transition-all duration-200 shadow-lg
                ${isUpdateAvailable && updateSeverity === 'critical'
                  ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 animate-pulse'
                  : isUpdateAvailable
                  ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
                ${showTooltip ? 'ring-2 ring-primary/20' : ''}
              `}
              title="Click to view version details"
            >
              {isChecking ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : error ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ) : isUpdateAvailable && updateSeverity === 'critical' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
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

            {/* Persistent Tooltip */}
            {showTooltip && showDetails && (
              <div
                className="absolute bottom-full right-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <div className="bg-gray-900 text-white text-xs rounded-xl shadow-xl min-w-[280px] overflow-hidden">
                  {/* Header with version */}
                  <div className="px-4 py-3 bg-primary">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4 text-white/80" />
                      <span className="font-mono font-bold text-white">v{currentVersion.version}</span>
                    </div>
                    {currentVersion.gitBranch !== 'unknown' && (
                      <div className="text-xs text-white/70 font-mono">{currentVersion.gitBranch}</div>
                    )}
                  </div>

                  {/* What's New Preview */}
                  {currentHighlights && (
                    <div className="px-4 py-3 border-b border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">What&apos;s New</span>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">{currentHighlights}</p>
                      <button
                        onClick={handleReleaseNotesClick}
                        className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        View full release notes
                      </button>
                    </div>
                  )}

                  {/* Version Details */}
                  <div className="px-4 py-3 space-y-2">
                    {currentVersion.gitCommit !== 'unknown' && (
                      <div className="flex items-center gap-2">
                        <GitCommit className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">Commit:</span>
                        <span className="font-mono text-gray-300">{currentVersion.gitCommit.slice(0, 7)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-400">Built:</span>
                      <span className="text-gray-300">{formatDate(currentVersion.buildTime)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click badge to close</span>
                    <button
                      onClick={() => { checkForUpdates(); }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Check Updates
                    </button>
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

        {/* Release Notes Modal */}
        <ReleaseNotesModal
          isOpen={showReleaseNotes}
          onClose={() => setShowReleaseNotes(false)}
          currentVersion={currentVersion.version}
        />
      </div>
    );
  }

  // Compact footer/sidebar display (original behavior)
  const baseClasses = `
    flex items-center gap-2 text-xs
    transition-colors cursor-pointer
    ${variant === 'footer' ? 'justify-center' : ''}
    ${isUpdateAvailable && updateSeverity === 'critical'
      ? 'text-red-400 hover:text-red-300 animate-pulse'
      : isUpdateAvailable
      ? 'text-amber-400 hover:text-amber-300'
      : 'text-gray-400 hover:text-gray-300'
    }
  `;

  return (
    <div className="relative w-full">
      {/* Critical update inline notification */}
      {isUpdateAvailable && updateSeverity === 'critical' && (
        <div className="mb-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-red-300 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Critical Update
            </span>
          </div>
          <p className="text-[10px] text-red-200/80 mt-1">
            Reloading in {countdownRemaining ?? 10}s
          </p>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500 text-white text-[10px] font-semibold rounded hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isUpdating ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Update Now
          </button>
        </div>
      )}

      {/* Update available inline notification (regular) */}
      {isUpdateAvailable && updateSeverity !== 'critical' && (
        <div className="mb-2 p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-amber-400 font-medium">Update Available</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                snoozeUpdate();
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
          <button
            onClick={snoozeUpdate}
            className="mt-1 w-full text-[10px] text-amber-300/80 hover:text-amber-200 transition-colors"
          >
            Snooze 24h
          </button>
        </div>
      )}

      {/* Inline release notes for sidebar/footer */}
      {currentHighlights && !isUpdateAvailable && variant === 'sidebar' && dismissedHighlights !== currentVersion?.version && (
        <div className="group relative mb-2 pr-5">
          <button
            onClick={handleReleaseNotesClick}
            className="w-full flex items-start gap-1.5 text-[10px] text-gray-400 hover:text-amber-400 transition-colors text-left"
          >
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{currentHighlights}</span>
          </button>
          {/* X button to close */}
          <button
            onClick={handleDismissHighlights}
            className="absolute -top-1 -right-1 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <button
        onClick={() => { checkForUpdates(); }}
        disabled={isChecking}
        className={baseClasses}
        title="Click to check for updates"
      >
        {isChecking ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : error ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        ) : isUpdateAvailable && updateSeverity === 'critical' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
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

      {/* Release Notes Modal for sidebar/footer */}
      <ReleaseNotesModal
        isOpen={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
        currentVersion={currentVersion.version}
      />
    </div>
  );
}

export default VersionDisplay;
