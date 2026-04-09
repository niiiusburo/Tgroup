/**
 * ServiceHistoryList - Displays service records in a list view
 * @crossref:used-in[Services, Customers, Payment]
 */

import { Stethoscope, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { APPOINTMENT_TYPE_COLORS, APPOINTMENT_TYPE_LABELS } from '@/constants';
import {
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_STYLES,
  type ServiceRecord,
  type VisitStatus,
} from '@/data/mockServices';
import { MultiVisitTracker } from './MultiVisitTracker';

interface ServiceHistoryListProps {
  readonly records: readonly ServiceRecord[];
  readonly onUpdateVisit?: (recordId: string, visitId: string, status: VisitStatus) => void;
  readonly onCancel?: (recordId: string) => void;
  readonly onEdit?: (record: ServiceRecord) => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

export function ServiceHistoryList({ records, onUpdateVisit, onCancel, onEdit }: ServiceHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <Stethoscope className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-400">No service records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
      {records.map((record) => {
        const typeColors = APPOINTMENT_TYPE_COLORS[record.category];
        const isExpanded = expandedId === record.id;
        const outstanding = record.totalCost - record.paidAmount;

        return (
          <div key={record.id} className="transition-colors hover:bg-gray-50/50">
            {/* Row */}
            <button
              type="button"
              onClick={() => toggleExpanded(record.id)}
              className="w-full text-left p-4 flex items-center gap-4"
            >
              {/* Category dot + customer */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${typeColors.dot}`} />
                  <span className="font-medium text-gray-900 truncate">{record.customerName}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate ml-4">
                  {record.serviceName} &middot; {record.doctorName} &middot; {record.locationName}
                </div>
              </div>

              {/* Progress compact */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                <span className="font-medium">{record.completedVisits}/{record.totalVisits}</span>
                <span>visits</span>
              </div>

              {/* Cost */}
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900">{formatVND(record.totalCost)}</div>
                {outstanding > 0 && (
                  <div className="text-xs text-amber-600">Due: {formatVND(outstanding)}</div>
                )}
              </div>

              {/* Status badge */}
              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${SERVICE_STATUS_STYLES[record.status]}`}>
                {SERVICE_STATUS_LABELS[record.status]}
              </span>

              {/* Expand */}
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              }
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-50">
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors.bg} ${typeColors.text}`}>
                    {APPOINTMENT_TYPE_LABELS[record.category]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {record.startDate} - {record.expectedEndDate}
                  </span>
                  {(record.toothNumbers?.length ?? 0) > 0 && (
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                      Tooth: {record.toothNumbers?.join(', ')}
                    </span>
                  )}
                </div>

                {/* Notes */}
                {record.notes && (
                  <p className="text-sm text-gray-600">{record.notes}</p>
                )}

                {/* Payment summary */}
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Total: </span>
                    <span className="font-medium text-gray-700">{formatVND(record.totalCost)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Paid: </span>
                    <span className="font-medium text-green-600">{formatVND(record.paidAmount)}</span>
                  </div>
                  {outstanding > 0 && (
                    <div>
                      <span className="text-gray-400">Outstanding: </span>
                      <span className="font-medium text-amber-600">{formatVND(outstanding)}</span>
                    </div>
                  )}
                </div>

                {/* Multi-visit tracker */}
                <MultiVisitTracker
                  record={record}
                  onUpdateVisit={onUpdateVisit}
                />

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {onCancel && record.status !== 'completed' && record.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => onCancel(record.id)}
                      className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel Service
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
