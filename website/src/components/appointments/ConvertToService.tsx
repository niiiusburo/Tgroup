/**
 * ConvertToService - Button to convert completed appointment to a service record
 * @crossref:used-in[Appointments, CheckInFlow]
 */

import { ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import type { ManagedAppointment } from '@/types/appointment';

interface ConvertToServiceProps {
  readonly appointment: ManagedAppointment;
  readonly onConvert: (appointmentId: string) => void;
}

export function ConvertToService({ appointment, onConvert }: ConvertToServiceProps) {
  const isConverted = appointment.convertedToServiceId !== null;
  const canConvert = appointment.checkInStatus === 'done' && !isConverted;

  if (appointment.checkInStatus !== 'done') return null;

  if (isConverted) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg">
        <CheckCircle2 className="w-4 h-4" />
        <span>Converted to Service #{appointment.convertedToServiceId}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (canConvert) onConvert(appointment.id);
      }}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-dental-blue rounded-lg hover:bg-blue-600 transition-colors"
    >
      <ArrowRightCircle className="w-4 h-4" />
      Convert to Service
    </button>
  );
}
