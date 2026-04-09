/**
 * MultiVisitTracker - Tracks treatment progress across visits
 * @crossref:used-in[Services, CustomerProfile]
 */

import { CheckCircle2, Clock, Circle, XCircle, AlertTriangle } from 'lucide-react';
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_STYLES,
  type ServiceRecord,
  type ServiceVisit,
  type VisitStatus,
} from '@/data/mockServices';

interface MultiVisitTrackerProps {
  readonly record: ServiceRecord;
  readonly onUpdateVisit?: (recordId: string, visitId: string, status: VisitStatus) => void;
  readonly compact?: boolean;
}

const VISIT_ICONS: Record<VisitStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  scheduled: Clock,
  missed: AlertTriangle,
  cancelled: XCircle,
};

function ProgressBar({ completed, total }: { readonly completed: number; readonly total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
        {completed}/{total} ({pct}%)
      </span>
    </div>
  );
}

export function MultiVisitTracker({ record, onUpdateVisit, compact = false }: MultiVisitTrackerProps) {
  if (compact) {
    return (
      <div className="space-y-1.5">
        <ProgressBar completed={record.completedVisits} total={record.totalVisits} />
        <div className="flex gap-1">
          {(record.visits ?? []).map((visit) => {
            const Icon = VISIT_ICONS[visit.status];
            return (
              <div
                key={visit.id}
                title={`Visit ${visit.visitNumber}: ${VISIT_STATUS_LABELS[visit.status]}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${VISIT_STATUS_STYLES[visit.status]}`}
              >
                <Icon className="w-3 h-3" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ProgressBar completed={record.completedVisits} total={record.totalVisits} />

      <div className="space-y-2">
        {(record.visits ?? []).map((visit, idx) => (
          <VisitRow
            key={visit.id}
            visit={visit}
            isLast={idx === (record.visits?.length ?? 0) - 1}
            onAdvance={
              onUpdateVisit && visit.status === 'scheduled'
                ? () => onUpdateVisit(record.id, visit.id, 'completed')
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

interface VisitRowProps {
  readonly visit: ServiceVisit;
  readonly isLast: boolean;
  readonly onAdvance?: () => void;
}

function VisitRow({ visit, isLast, onAdvance }: VisitRowProps) {
  const Icon = VISIT_ICONS[visit.status];
  const isCompleted = visit.status === 'completed';

  return (
    <div className="flex items-start gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${VISIT_STATUS_STYLES[visit.status]}`}>
          {visit.status === 'scheduled' && !isCompleted ? (
            <Circle className="w-3.5 h-3.5" />
          ) : (
            <Icon className="w-3.5 h-3.5" />
          )}
        </div>
        {!isLast && (
          <div className={`w-0.5 h-6 ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              Visit {visit.visitNumber}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${VISIT_STATUS_STYLES[visit.status]}`}>
              {VISIT_STATUS_LABELS[visit.status]}
            </span>
          </div>
          {onAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              className="text-xs px-2.5 py-1 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Mark Complete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          {visit.date && <span>{visit.date}</span>}
          <span>{visit.doctorName}</span>
          {visit.toothNumbers.length > 0 && (
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
              {visit.toothNumbers.join(', ')}
            </span>
          )}
        </div>
        {visit.notes && (
          <p className="text-xs text-gray-400 mt-1">{visit.notes}</p>
        )}
      </div>
    </div>
  );
}
