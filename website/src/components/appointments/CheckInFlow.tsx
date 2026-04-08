/**
 * CheckInFlow - Appointment check-in status workflow
 * @crossref:used-in[Appointments]
 * Steps: arrival -> waiting -> in-treatment -> done
 */

import { Check, ChevronRight, UserCheck, Clock, Stethoscope, CheckCircle2 } from 'lucide-react';
import {
  CHECK_IN_FLOW_ORDER,
  CHECK_IN_STATUS_LABELS,
  CHECK_IN_STATUS_STYLES,
  type CheckInStatus,
  type ManagedAppointment,
} from '@/data/mockAppointments';
import { WaitTimer } from './WaitTimer';

interface CheckInFlowProps {
  readonly appointment: ManagedAppointment;
  readonly onAdvance: (appointmentId: string) => void | Promise<void>;
}

const STEP_ICONS: Record<CheckInStatus, React.ReactNode> = {
  'not-arrived': <UserCheck className="w-4 h-4" />,
  arrived: <UserCheck className="w-4 h-4" />,
  waiting: <Clock className="w-4 h-4" />,
  'in-treatment': <Stethoscope className="w-4 h-4" />,
  done: <CheckCircle2 className="w-4 h-4" />,
};

function getStepState(
  stepStatus: CheckInStatus,
  currentStatus: CheckInStatus,
): 'completed' | 'current' | 'upcoming' {
  const stepIdx = CHECK_IN_FLOW_ORDER.indexOf(stepStatus);
  const currentIdx = CHECK_IN_FLOW_ORDER.indexOf(currentStatus);
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'upcoming';
}

export function CheckInFlow({ appointment, onAdvance }: CheckInFlowProps) {
  const currentIdx = CHECK_IN_FLOW_ORDER.indexOf(appointment.checkInStatus);
  const canAdvance =
    currentIdx < CHECK_IN_FLOW_ORDER.length - 1 &&
    appointment.status !== 'cancelled';

  const visibleSteps = CHECK_IN_FLOW_ORDER.filter((s) => s !== 'not-arrived');

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {visibleSteps.map((step, idx) => {
          const state = getStepState(step, appointment.checkInStatus);
          return (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  state === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : state === 'current'
                      ? CHECK_IN_STATUS_STYLES[step]
                      : 'bg-gray-50 text-gray-400'
                }`}
              >
                {state === 'completed' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  STEP_ICONS[step]
                )}
                <span className="hidden sm:inline">{CHECK_IN_STATUS_LABELS[step]}</span>
              </div>
              {idx < visibleSteps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 mx-0.5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Wait timer when applicable */}
      {(appointment.checkInStatus === 'waiting' || appointment.checkInStatus === 'in-treatment' || appointment.checkInStatus === 'done') && (
        <WaitTimer
          arrivalTime={appointment.arrivalTime}
          treatmentStartTime={appointment.treatmentStartTime}
        />
      )}

      {/* Advance button */}
      {canAdvance && (
        <button
          type="button"
          onClick={() => onAdvance(appointment.id)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          {appointment.checkInStatus === 'not-arrived' && 'Mark Arrived'}
          {appointment.checkInStatus === 'arrived' && 'Move to Waiting'}
          {appointment.checkInStatus === 'waiting' && 'Start Treatment'}
          {appointment.checkInStatus === 'in-treatment' && 'Complete'}
        </button>
      )}
    </div>
  );
}
