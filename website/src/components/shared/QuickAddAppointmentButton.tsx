import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { AppointmentFormShell } from '@/components/appointments/unified';

interface QuickAddAppointmentButtonProps {
  readonly onSuccess?: () => void;
  readonly size?: 'sm' | 'md';
}

export function QuickAddAppointmentButton({ onSuccess, size = 'md' }: QuickAddAppointmentButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-4 py-2 text-sm gap-2';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          ${sizeClasses}
          inline-flex items-center
          border border-orange-200
          bg-orange-50
          hover:bg-orange-100
          text-orange-700 font-semibold rounded-lg
          shadow-sm
          transition-all duration-150
          active:scale-[0.98]
        `}
      >
        <CalendarPlus className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{size === 'sm' ? t('overview:quickAdd') : t('overview:quickAddFull')}</span>
      </button>

      <AppointmentFormShell
        mode="create"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
