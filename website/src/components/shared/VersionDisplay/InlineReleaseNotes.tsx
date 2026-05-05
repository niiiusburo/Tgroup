import { ChevronRight, Sparkles, X } from 'lucide-react';

interface InlineReleaseNotesProps {
  readonly highlights: string;
  readonly onClick: () => void;
  readonly onClose?: () => void;
}

export function InlineReleaseNotes({ highlights, onClick, onClose }: InlineReleaseNotesProps) {
  return (
    <div
      data-testid="version-release-toast"
      className="group relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 pr-11 text-left text-gray-900 shadow-lg shadow-gray-900/10 transition-colors hover:bg-gray-50"
    >
      <button
        onClick={onClick}
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
            onClose();
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
