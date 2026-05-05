/**
 * FormHeader — Orange gradient header for TG Clinic modal forms.
 *
 * Provides the canonical header pattern:
 * - Orange gradient background with subtle pattern overlay
 * - Icon in white/20 rounded container
 * - Title + subtitle
 * - X close button
 *
 * @crossref:used-in[FormShell, AddCustomerForm, ServiceForm, AppointmentForm]
 */

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  isEdit?: boolean;
  className?: string;
}

export function FormHeader({
  title,
  subtitle,
  icon,
  onClose,
  isEdit,
  className,
}: FormHeaderProps) {
  // isEdit is accepted for API consistency but not used by the header layout
  void isEdit;
  return (
    <div
      className={cn(
        'relative px-4 py-4 bg-primary flex-shrink-0 sm:px-6 sm:py-5',
        className
      )}
    >
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=")`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="shrink-0 p-2 bg-white/20 rounded-xl">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-orange-100 sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 shrink-0 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
