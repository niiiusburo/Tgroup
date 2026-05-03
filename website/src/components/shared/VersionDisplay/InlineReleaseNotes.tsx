import { ChevronRight, Sparkles, X } from 'lucide-react';

interface InlineReleaseNotesProps {
  readonly highlights: string;
  readonly onClick: () => void;
  readonly onClose?: () => void;
}

export function InlineReleaseNotes({ highlights, onClick, onClose }: InlineReleaseNotesProps) {
  return (
    <div className="group relative flex items-start gap-2 text-[11px] text-gray-500 hover:text-amber-600 transition-colors p-2 pr-8 rounded-lg hover:bg-amber-50 w-full text-left">
      <button
        onClick={onClick}
        className="flex items-start gap-2 w-full text-left"
      >
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">New in this version</span>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{highlights}</p>
          <span className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-1 group-hover:underline">
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
          className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-amber-100 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
