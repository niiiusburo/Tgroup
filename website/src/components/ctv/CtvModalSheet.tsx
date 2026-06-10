/**
 * @crossref:domain[ctv]
 * @crossref:used-in[CTV bottom-sheet modal shell: website/src/components/ctv/CtvRecruitModal.tsx, website/src/components/ctv/CtvReferModal.tsx]
 * @crossref:uses[website/src/lib/utils.ts, product-map/domains/ctv.yaml]
 */
import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CtvModalSheetProps {
  readonly title: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
}

export function CtvModalSheet({
  title,
  closeLabel,
  onClose,
  children,
  className,
  bodyClassName,
}: CtvModalSheetProps) {
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          'flex max-h-[calc(100dvh-0.75rem)] min-h-0 w-full max-w-[430px] flex-col overflow-hidden',
          'rounded-t-3xl bg-white shadow-2xl sm:max-h-[min(90dvh,720px)] sm:rounded-3xl',
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
          <h2 id={titleId} className="min-w-0 text-lg font-bold leading-snug text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4', bodyClassName)}
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
