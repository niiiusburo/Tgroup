/**
 * Modal — Primitive UI component
 * Standardized modal shell with consistent animation, backdrop, and layout.
 * @crossref:used-in[all modals across the app]
 */
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop — solid, no glassmorphism */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden',
          'flex flex-col',
          'animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  onClose,
  className,
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'relative px-6 py-5 bg-primary flex-shrink-0',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 bg-white/15 rounded-xl">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="text-sm text-white/80 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('modal-body px-6 py-5 space-y-4', className)}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'modal-footer px-6 py-4 bg-gray-50 border-t border-gray-100',
        'flex justify-end gap-3 flex-shrink-0',
        className
      )}
    >
      {children}
    </div>
  );
}
