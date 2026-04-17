import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { AppointmentFormModal } from './AppointmentFormModal';
import type { AppointmentFormData } from '@/components/appointments/AppointmentForm';

interface QuickAddAppointmentButtonProps {
  readonly onSuccess?: () => void;
  readonly size?: 'sm' | 'md';
}

export function QuickAddAppointmentButton({ onSuccess, size = 'md' }: QuickAddAppointmentButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (data: AppointmentFormData) => {
    try {
      const { createAppointment } = await import('@/lib/api');
      await createAppointment({
        partnerid: data.customerId,
        doctorid: data.doctorId,
        companyid: data.locationId,
        name: data.serviceName || data.appointmentType,
        date: data.date,
        time: data.startTime,
        note: data.notes,
        state: 'scheduled',
        assistantid: data.assistantId,
        dentalaideid: data.dentalAideId,
        color: data.color,
        timeexpected: data.estimatedDuration,
        productid: data.serviceId,
      });
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      throw error;
    }
  };

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
          bg-gradient-to-r from-orange-500 to-orange-400 
          hover:from-orange-600 hover:to-orange-500
          text-white font-medium rounded-lg
          shadow-lg shadow-orange-500/25
          transition-all duration-200
          hover:shadow-xl hover:shadow-orange-500/30
          hover:scale-105
        `}
      >
        <CalendarPlus className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{size === 'sm' ? t('overview:quickAdd') : t('overview:quickAddFull')}</span>
      </button>

      <AppointmentFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
