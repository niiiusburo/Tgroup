import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import type { AppointmentFormData } from '@/components/appointments/AppointmentForm';


/**
 * Quick Add Appointment Button — Small floating action button for quick access
 * 
 * Usage:
 * <QuickAddAppointmentButton onSuccess={refreshAppointments} />
 * 
 * @crossref:used-in[Overview, Calendar]
 */
interface QuickAddAppointmentButtonProps {
  readonly onSuccess?: () => void;
  readonly size?: 'sm' | 'md';
}

export function QuickAddAppointmentButton({ onSuccess, size = 'md' }: QuickAddAppointmentButtonProps) {
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
      });
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      throw error; // Re-throw to let form handle error display
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
        <span>{size === 'sm' ? 'Hẹn mới' : 'Thêm lịch hẹn'}</span>
      </button>

      {isOpen && (
        <div className="modal-container">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="modal-content animate-in zoom-in-95 duration-200 max-w-[900px]">
            <AppointmentForm
              onSubmit={handleSubmit}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
