import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoadingStateVariant = 'page' | 'section' | 'inline';

interface LoadingStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly variant?: LoadingStateVariant;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<LoadingStateVariant, string> = {
  page: 'min-h-[60vh]',
  section: 'min-h-[220px] rounded-xl bg-white p-8 shadow-card',
  inline: 'py-8',
};

export function LoadingState({
  title = 'Loading data...',
  description,
  variant = 'section',
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center text-center text-gray-500',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <Loader2 className="mb-3 h-7 w-7 animate-spin text-primary" />
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
    </div>
  );
}
