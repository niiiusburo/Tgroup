import { X, Clock, User, MapPin, Phone, FileText, Tag } from 'lucide-react';
import { APPOINTMENT_TYPE_COLORS, APPOINTMENT_TYPE_LABELS } from '@/constants';
import { STATUS_LABELS, STATUS_BADGE_STYLES, type CalendarAppointment } from '@/data/mockCalendar';

/**
 * AppointmentDetailsModal - Full appointment info overlay
 * @crossref:used-in[Calendar, Appointments]
 */

interface AppointmentDetailsModalProps {
  readonly appointment: CalendarAppointment | null;
  readonly onClose: () => void;
}

export function AppointmentDetailsModal({ appointment, onClose }: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  const typeColors = APPOINTMENT_TYPE_COLORS[appointment.appointmentType];
  const statusStyle = STATUS_BADGE_STYLES[appointment.status];
  const statusLabel = STATUS_LABELS[appointment.status];
  const typeLabel = APPOINTMENT_TYPE_LABELS[appointment.appointmentType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header with type color */}
        <div className={`px-6 py-4 ${typeColors.bg} border-b ${typeColors.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{appointment.customerName}</h2>
              <p className={`text-sm font-medium mt-0.5 ${typeColors.text}`}>{appointment.serviceName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/60 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Status + Type badges */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
              {statusLabel}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${typeColors.border} ${typeColors.text} ${typeColors.bg}`}>
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Time">
            {appointment.date} &middot; {appointment.startTime} - {appointment.endTime}
          </DetailRow>

          <DetailRow icon={<User className="w-4 h-4" />} label="Doctor">
            {appointment.dentist}
          </DetailRow>

          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location">
            {appointment.locationName}
          </DetailRow>

          <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone">
            {appointment.customerPhone}
          </DetailRow>

          <DetailRow icon={<Tag className="w-4 h-4" />} label="Type">
            <span className={`inline-flex items-center gap-1.5 ${typeColors.text}`}>
              <span className={`w-2 h-2 rounded-full ${typeColors.dot}`} />
              {typeLabel}
            </span>
          </DetailRow>

          {appointment.notes && (
            <DetailRow icon={<FileText className="w-4 h-4" />} label="Notes">
              {appointment.notes}
            </DetailRow>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
          >
            Edit Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetailRowProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly children: React.ReactNode;
}

function DetailRow({ icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800">{children}</p>
      </div>
    </div>
  );
}
