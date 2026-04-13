import { Stethoscope, CheckCircle2, Clock, XCircle, CreditCard, CheckCircle } from 'lucide-react';
import type { CustomerService } from '@/types/customer';
import { formatVND } from '@/lib/formatting';
import { StatusDropdown, type StatusOption } from '@/components/shared/StatusDropdown';

/**
 * Service History - Treatment history list
 * @crossref:used-in[CustomerProfile, Services]
 */

interface ServiceHistoryProps {
  readonly services: readonly CustomerService[];
  readonly limit?: number;
  readonly onSelect?: (service: CustomerService) => void;
  readonly onUpdateStatus?: (serviceId: string, newStatus: string) => Promise<void>;
  readonly onPayForService?: (service: CustomerService) => void;
}

const STATUS_OPTIONS: readonly StatusOption[] = [
  { value: 'completed', label: 'Hoàn thành', style: 'text-emerald-600 bg-emerald-50' },
  { value: 'active', label: 'Đang điều trị', style: 'text-blue-600 bg-blue-50' },
  { value: 'cancelled', label: 'Đã hủy', style: 'text-red-600 bg-red-50' },
];

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'Hoàn thành', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  active: { icon: Clock, label: 'Đang điều trị', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  cancelled: { icon: XCircle, label: 'Đã hủy', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
} as const;

export function ServiceHistory({ services, limit, onSelect, onUpdateStatus, onPayForService }: ServiceHistoryProps) {
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
            return (
              <div
                key={svc.id}
                className={`border border-gray-100 rounded-lg p-4 transition-colors ${onSelect ? 'cursor-pointer hover:border-primary/40 hover:bg-primary/5' : 'hover:border-gray-200'}`}
                onClick={() => onSelect?.(svc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <p className="font-medium text-gray-900">{svc.service}</p>
                      {svc.orderName && <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{svc.orderName}</span>}
                      {onPayForService && svc.status !== 'cancelled' && (() => {
                        const owed = svc.residual ?? Math.max(0, svc.cost - (svc.paidAmount ?? 0));
                        const hasBalance = owed > 0;
                        return (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onPayForService(svc); }}
                            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg transition-colors ${
                              hasBalance
                                ? 'text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                                : 'text-gray-400 bg-gray-50 border border-gray-200 hover:bg-gray-100'
                            }`}
                            title={hasBalance ? `Còn nợ ${formatVND(owed)}` : 'Đã thanh toán đủ'}
                          >
                            {hasBalance
                              ? <CreditCard className="w-3 h-3" />
                              : <CheckCircle className="w-3 h-3" />}
                            {hasBalance ? `Pay ${formatVND(owed)}` : 'Paid'}
                          </button>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 ml-4">
                      <span>{svc.date}</span>
                      <span>{svc.doctor}</span>
                      {svc.assistantName && (
                        <span className="text-blue-600">{svc.assistantName}</span>
                      )}
                      {svc.dentalAideName && (
                        <span className="text-emerald-600">{svc.dentalAideName}</span>
                      )}
                      {(svc.quantity || svc.unit) && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                          {svc.quantity ?? 1} {svc.unit || ''}
                        </span>
                      )}
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        Tooth: {svc.tooth}
                      </span>
                    </div>
                    {svc.notes && (
                      <p className="text-xs text-gray-400 mt-2 ml-4">{svc.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <StatusDropdown
                      current={svc.status}
                      options={STATUS_OPTIONS}
                      onChange={(newStatus) => onUpdateStatus?.(svc.id, newStatus)}
                      disabled={!onUpdateStatus}
                    />
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
