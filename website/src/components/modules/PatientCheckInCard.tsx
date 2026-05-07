import { useEffect, useRef, useState } from 'react';
import { Clock, FileText, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WaitTimer } from '@/components/appointments/WaitTimer';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import type { CheckInStatus, OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { parseAppointmentNote } from '@/lib/appointmentNotes';

interface PatientCardProps {
  readonly appointment: OverviewAppointment;
  readonly onUpdateStatus: (id: string, status: CheckInStatus, onSuccess?: () => void) => void;
  readonly onEditClick?: (appointment: OverviewAppointment) => void;
  readonly onDone?: () => void;
}

const STATUS_CONFIG: Record<CheckInStatus, {labelKey: string;bg: string;text: string;border: string;}> = {
  waiting: {
    labelKey: 'overview:zone1.filterWaiting',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
  },
  'in-treatment': {
    labelKey: 'overview:zone1.filterInProgress',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200/80',
  },
  done: {
    labelKey: 'overview:zone1.filterCompleted',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
  },
};

export function PatientCard({ appointment, onUpdateStatus, onEditClick, onDone }: PatientCardProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const currentStatus = appointment.checkInStatus ?? 'waiting';
  const config = STATUS_CONFIG[currentStatus];
  const parsed = parseAppointmentNote(appointment.note || '');

  useEffect(() => {
    if (currentStatus === 'done' && cardRef.current && typeof cardRef.current.scrollIntoView === 'function') {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStatus]);

  return (
    <div
      ref={cardRef}
      onClick={() => onEditClick?.(appointment)}
      className="border rounded-xl p-3.5 transition-all relative cursor-pointer h-full flex flex-col border-gray-200 bg-gray-50/50 hover:shadow-sm"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer
          ${config.bg} ${config.text} ${config.border}
        `}
      >
        {t(config.labelKey)} <span className="text-[10px] opacity-60">▾</span>
      </button>

      {currentStatus === 'waiting' && appointment.arrivalTime &&
        <div className="mt-2">
          <WaitTimer arrivalTime={appointment.arrivalTime} treatmentStartTime={appointment.treatmentStartTime} compact />
        </div>
      }

      {dropdownOpen &&
        <div className="absolute top-2 left-2 right-2 bg-white border border-gray-200 rounded-xl p-3.5 shadow-lg z-10" onClick={(event) => event.stopPropagation()}>
          <div className="text-xs font-bold text-gray-700 mb-2.5">{t('overview:zone1.changeStatus')}</div>
          {(['waiting', 'in-treatment', 'done'] as CheckInStatus[]).map((status) => {
            const isSelected = currentStatus === status;
            return (
              <label
                key={status}
                className="flex items-center gap-2.5 py-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                onClick={() => {
                  onUpdateStatus(appointment.id, status, status === 'done' ? onDone : undefined);
                  setDropdownOpen(false);
                }}
              >
                <span
                  className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                    ${isSelected ? 'border-blue-600' : 'border-gray-300'}
                  `}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </span>
                {t(STATUS_CONFIG[status].labelKey)}
              </label>
            );
          })}
        </div>
      }

      <div className="mt-2.5 flex-1 flex flex-col gap-2">
        <div className="text-sm font-semibold text-gray-800 break-words">
          <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>{appointment.doctorName}</span>
          <span className="mx-1">·</span>
          <Clock className="w-3 h-3" />
          <span>{appointment.time}</span>
        </div>

        {(parsed.duration || parsed.type) &&
          <div className="flex flex-wrap gap-2">
            {parsed.duration &&
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600">
                <Clock className="w-3 h-3 text-gray-400" />
                {parsed.duration}
              </span>
            }
            {parsed.type &&
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600">
                <User className="w-3 h-3 text-gray-400" />
                {parsed.type}
              </span>
            }
          </div>
        }

        {parsed.freeText &&
          <div className="rounded-r-lg rounded-l-md bg-amber-50/40 border border-gray-100 border-l-4 border-l-amber-200 p-2 text-xs text-gray-600 break-words whitespace-pre-wrap flex items-start gap-1.5">
            <FileText className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <span>{parsed.freeText}</span>
          </div>
        }
      </div>
    </div>
  );
}
