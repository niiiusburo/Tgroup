import { X, Clock, User, MapPin, Phone, FileText, Tag, Calendar, Stethoscope, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APPOINTMENT_TYPE_COLORS, APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_I18N_KEYS } from '@/constants';
import { type CalendarAppointment } from '@/data/mockCalendar';

/**
 * AppointmentDetailsModal - Full appointment info overlay
 * @crossref:used-in[Calendar, Appointments]
 * @crossref:uses[EditAppointmentModal styling reference]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  APPOINTMENT MODULE FAMILY — @crossref:related[]                       ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  This component is the VIEW variant of the appointment module.         ║
 * ║  When editing this file, you MUST also check:                          ║
 * ║                                                                        ║
 * ║  @crossref:related[AppointmentForm]  — CREATE variant                  ║
 * ║    • Status labels here MUST match STATUS_OPTIONS in AppointmentForm    ║
 * ║                                                                        ║
 * ║  @crossref:related[EditAppointmentModal] — EDIT variant                ║
 * ║    • Status labels here MUST match STATUS_OPTIONS in EditModal          ║
 * ║                                                                        ║
 * ║  @crossref:color-source[constants/index.ts APPOINTMENT_CARD_COLORS]    ║
 * ║    • Status labels should come from constants, not local STATUS_LABELS ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

interface AppointmentDetailsModalProps {
  readonly appointment: CalendarAppointment | null;
  readonly onClose: () => void;
  readonly onEdit?: (appointment: CalendarAppointment) => void;
}

export function AppointmentDetailsModal({
  appointment, onClose, onEdit }: AppointmentDetailsModalProps) {
  const { t } = useTranslation('calendar');
  if (!appointment) return null;

  const typeColors = APPOINTMENT_TYPE_COLORS[appointment.appointmentType];
  const statusLabel = APPOINTMENT_STATUS_I18N_KEYS[appointment.status]
    ? t(APPOINTMENT_STATUS_I18N_KEYS[appointment.status])
    : appointment.status;
  const typeLabel = APPOINTMENT_TYPE_LABELS[appointment.appointmentType];

  return (
    <div className="modal-container">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-[900px]">
        {/* Header with gradient */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{appointment.customerName}</h2>
              <p className="text-sm text-orange-100 mt-1 flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5" />
                {appointment.serviceName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Status + Type badges */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 text-gray-800 shadow-sm">
              {statusLabel}
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white border border-white/30">
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body px-6 py-6 space-y-5">
          {/* Patient Card */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {t('appointmentDetails.patient')}
            </label>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {appointment.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{appointment.customerName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {appointment.customerPhone}
                </p>
              </div>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label={t('appointmentDetails.date')}>
              {appointment.date}
            </DetailRow>
            <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label={t('appointmentDetails.time')}>
              {appointment.startTime} - {appointment.endTime}
            </DetailRow>
          </div>

          {/* Doctor */}
          <DetailRow icon={<Stethoscope className="w-3.5 h-3.5" />} label={t('appointmentDetails.doctor')}>
            {appointment.dentist}
          </DetailRow>

          {/* Location */}
          <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label={t('appointmentDetails.location')}>
            {appointment.locationName}
          </DetailRow>

          {/* Type */}
          <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label={t('appointmentDetails.serviceType')}>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${typeColors.dot}`} />
              <span className={typeColors.text}>{typeLabel}</span>
            </span>
          </DetailRow>

          {/* Notes */}
          {appointment.notes && (
            <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label={t('appointmentDetails.notes')}>
              <span className="text-gray-700">{appointment.notes}</span>
            </DetailRow>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            {t('close', { ns: 'common' })}
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(appointment);
                onClose();
              }}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
            >
              <Pencil className="w-4 h-4" />
              {t('appointmentDetails.edit')}
            </button>
          )}
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
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800">
        {children}
      </div>
    </div>
  );
}
