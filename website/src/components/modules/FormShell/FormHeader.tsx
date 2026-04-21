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
  className,
}: FormHeaderProps) {
  return (
    <div
      className={cn(
        'relative px-6 py-5 bg-primary flex-shrink-0',
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

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 bg-white/20 rounded-xl">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="text-sm text-orange-100 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
