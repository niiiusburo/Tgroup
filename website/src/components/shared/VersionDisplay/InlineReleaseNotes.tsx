import { ChevronRight, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface InlineReleaseNotesProps {
  readonly highlights: string;
  readonly onClick: () => void;
  readonly onClose?: () => void;
  /** Auto-dismiss after this many ms (paused on hover). 0 disables. Default 10s. */
  readonly autoDismissMs?: number;
}

export function InlineReleaseNotes({
  highlights,
  onClick,
  onClose,
  autoDismissMs = 10000,
}: InlineReleaseNotesProps) {
  const [exiting, setExiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);

  const beginExit = () => {
    if (exiting) return;
    setExiting(true);
    // CSS transition is 200ms — fire onClose after it completes so the parent unmounts cleanly.
    window.setTimeout(() => {
      onClose?.();
    }, 220);
  };

  // Auto-dismiss after `autoDismissMs` (paused while hovered).
  useEffect(() => {
    if (!autoDismissMs || !onClose) return;
    const start = () => {
      if (hoveredRef.current || exiting) return;
      timeoutRef.current = setTimeout(beginExit, autoDismissMs);
    };
    start();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs, exiting]);

  const handleMouseEnter = () => {
    hoveredRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  const handleMouseLeave = () => {
    hoveredRef.current = false;
    if (autoDismissMs && onClose && !exiting) {
      timeoutRef.current = setTimeout(beginExit, autoDismissMs);
    }
  };

  return (
    <div
      data-testid="version-release-toast"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 pr-11 text-left text-gray-900 shadow-lg shadow-gray-900/10 transition-all duration-200 ease-out hover:bg-gray-50 ${
        exiting ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <button
        onClick={() => {
          onClick();
          beginExit();
        }}
        className="flex w-full items-start gap-2 text-left"
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">New in this version</span>
          </div>
          <p className="line-clamp-2 text-xs font-medium text-gray-800">{highlights}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
            View all changes <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </button>
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            beginExit();
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
          title="Dismiss"
          aria-label="Dismiss release notes"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
