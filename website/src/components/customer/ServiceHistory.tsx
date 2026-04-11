import { Stethoscope, CheckCircle2, Clock, CalendarPlus } from 'lucide-react';
import type { CustomerService } from '@/types/customer';

/**
 * Service History - Treatment history list
 * @crossref:used-in[CustomerProfile, Services]
 */

interface ServiceHistoryProps {
  readonly services: readonly CustomerService[];
  readonly limit?: number;
  readonly onSelect?: (service: CustomerService) => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'Completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  'in-progress': { icon: Clock, label: 'In Progress', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  planned: { icon: CalendarPlus, label: 'Planned', className: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' },
} as const;

export function ServiceHistory({ services, limit, onSelect }: ServiceHistoryProps) {
  const displayServices = limit ? services.slice(0, limit) : services;
  const totalCost = services
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Treatment History</h3>
          <span className="text-xs text-gray-400">({services.length}{limit && services.length > limit ? '+' : ''} treatments)</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total completed</p>
          <p className="text-sm font-bold text-gray-900">{formatVND(totalCost)}</p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No treatment history</div>
      ) : (
        <div className="space-y-3">
          {displayServices.map((svc) => {
            const statusConfig = STATUS_CONFIG[svc.status];
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={svc.id}
                className={`border border-gray-100 rounded-lg p-4 transition-colors ${onSelect ? 'cursor-pointer hover:border-primary/40 hover:bg-primary/5' : 'hover:border-gray-200'}`}
                onClick={() => onSelect?.(svc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <p className="font-medium text-gray-900">{svc.service}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 ml-4">
                      <span>{svc.date}</span>
                      <span>{svc.doctor}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        Tooth: {svc.tooth}
                      </span>
                    </div>
                    {svc.notes && (
                      <p className="text-xs text-gray-400 mt-2 ml-4">{svc.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    {svc.cost > 0 && (
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatVND(svc.cost)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
