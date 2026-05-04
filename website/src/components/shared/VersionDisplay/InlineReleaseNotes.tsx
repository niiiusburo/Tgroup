import { ChevronRight, Sparkles, X } from 'lucide-react';

interface InlineReleaseNotesProps {
  readonly highlights: string;
  readonly onClick: () => void;
  readonly onClose?: () => void;
}

export function InlineReleaseNotes({ highlights, onClick, onClose }: InlineReleaseNotesProps) {
  return (
    <div className="group relative flex w-full items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 pr-12 text-left text-orange-900 shadow-lg transition-colors hover:bg-orange-100">
      <button
        onClick={onClick}
        className="flex w-full items-start gap-2 text-left"
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">New in this version</span>
          </div>
          <p className="line-clamp-2 text-xs font-medium text-orange-950">{highlights}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange-700 group-hover:underline">
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
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white/80"
          title="Dismiss"
          aria-label="Dismiss release notes"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
