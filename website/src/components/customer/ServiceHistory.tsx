import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stethoscope, CheckCircle2, Clock, XCircle, CreditCard, CheckCircle, Edit2, Wallet, Trash2 } from 'lucide-react';
import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { formatVND, parseDisplayDate } from '@/lib/formatting';
import { StatusDropdown, type StatusOption } from '@/components/shared/StatusDropdown';
import { PaymentSourceBadges } from '@/components/payment/PaymentSourceBadges';

/**
 * Service History - Treatment history list
 * @crossref:used-in[CustomerProfile, Services]
 */

interface ServiceHistoryProps {
  readonly services: readonly CustomerService[];
  readonly limit?: number;
  readonly payments?: readonly PaymentWithAllocations[];
  readonly onEditService?: (service: CustomerService) => void;
  readonly onUpdateStatus?: (serviceId: string, newStatus: string) => Promise<void>;
  readonly onPayForService?: (service: CustomerService) => void;
  readonly onDeletePayment?: (id: string) => void | Promise<void>;
}

const STATUS_OPTIONS: readonly StatusOption[] = [
{ value: 'completed', label: 'completed', style: 'text-emerald-600 bg-emerald-50' },
{ value: 'active', label: 'active', style: 'text-blue-600 bg-blue-50' },
{ value: 'cancelled', label: 'cancelled', style: 'text-red-600 bg-red-50' }];


const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  active: { icon: Clock, label: 'active', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  cancelled: { icon: XCircle, label: 'cancelled', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' }
} as const;

function getPaymentsForService(
serviceId: string,
payments?: readonly PaymentWithAllocations[])
: PaymentWithAllocations[] {
  if (!payments) return [];
  return payments.filter(
    (p) =>
    p.serviceId === serviceId ||
    p.allocations && p.allocations.some((a) => a.invoiceId === serviceId)
  );
}

export function ServiceHistory({
  services,
  limit,
  payments,
  onEditService,
  onUpdateStatus,
  onPayForService,
  onDeletePayment
}: ServiceHistoryProps) {
  const { t } = useTranslation('services');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const displayServices = limit ? services.slice(0, limit) : services;
  const totalCost = services.
  filter((s) => s.status !== 'cancelled').
  reduce((sum, s) => sum + s.cost, 0);
  const totalPaid = services.
  filter((s) => s.status !== 'cancelled').
  reduce((sum, s) => sum + (s.cost - (s.residual ?? Math.max(0, s.cost - (s.paidAmount ?? 0)))), 0);
  const zeroCostCount = services.filter((s) => s.cost === 0 && s.status !== 'cancelled').length;

  function handleCardClick(svc: CustomerService) {
    setExpandedServiceId((prev) => prev === svc.id ? null : svc.id);
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">{t('history.title')}</h3>
          <span className="text-xs text-gray-400">({services.length}{limit && services.length > limit ? '+' : ''} {t('treatment')})</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-left sm:text-right">
          {zeroCostCount > 0 &&
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              ⚠ {zeroCostCount} {t('noPrice')}
            </span>
          }
          <div>
            <p className="text-xs text-gray-400">{t('totalCost')} / {t('collected')}</p>
            <p className="text-sm font-bold text-gray-900">{formatVND(totalPaid)} <span className="text-gray-400 font-normal">/ {formatVND(totalCost)}</span></p>
          </div>
        </div>
      </div>

      {services.length === 0 ?
      <div className="text-center py-8 text-gray-400 text-sm">{t('history.noHistory')}</div> :

      <div className="space-y-3">
          {displayServices.map((svc) => {
          const statusConfig = STATUS_CONFIG[svc.status];
          const isExpanded = expandedServiceId === svc.id;
          const relatedPayments = getPaymentsForService(svc.id, payments);
          const paidForService = relatedPayments.
          filter((p) => p.status !== 'voided').
          reduce((sum, p) => sum + p.amount, 0);

          return (
            <div
              key={svc.id}
              className={`border rounded-lg p-4 transition-all ${
              isExpanded ?
              'border-primary/40 bg-primary/5' :
              'border-gray-100 cursor-pointer hover:border-primary/40 hover:bg-primary/5'}`
              }
              onClick={() => handleCardClick(svc)}>
              
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {(svc.orderCode || svc.orderName) && <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{svc.orderCode || svc.orderName}</span>}
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <p className="font-medium text-gray-900">{svc.service}</p>
                      {onPayForService && svc.status !== 'cancelled' && (() => {
                      const owed = svc.residual ?? Math.max(0, svc.cost - (svc.paidAmount ?? 0));
                      const hasBalance = owed > 0;
                      const paid = Math.max(0, svc.cost - owed);
                      const pct = svc.cost > 0 ? Math.min(1, Math.max(0, paid / svc.cost)) : 0;
                      return (
                        <button
                          type="button"
                          onClick={(e) => {e.stopPropagation();onPayForService(svc);}}
                          className={`relative overflow-hidden flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg transition-colors ${
                          hasBalance ?
                          'text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:border-orange-300' :
                          'text-gray-400 bg-gray-50 border border-gray-200 hover:bg-gray-100'}`
                          }
                          title={hasBalance ? `${t('outstanding')} ${formatVND(owed)}` : t('paidInFull')}>
                          
                            {hasBalance && pct > 0 &&
                          <span aria-hidden className="absolute inset-y-0 left-0 bg-green-500 transition-[width] duration-500 ease-out" style={{ width: `${pct * 100}%` }} />
                          }
                            <span className="relative flex items-center gap-1">
                              {hasBalance ?
                            <CreditCard className="w-3 h-3" /> :
                            <CheckCircle className="w-3 h-3" />}
                              {hasBalance ? `${t('pay')} ${formatVND(owed)}` : t('paid')}
                            </span>
                          </button>);

                    })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                      <span>{svc.date}</span>
                      <span>{svc.doctor}</span>
                      {svc.assistantName &&
                    <span className="text-blue-600">{svc.assistantName}</span>
                    }
                      {svc.dentalAideName &&
                    <span className="text-emerald-600">{svc.dentalAideName}</span>
                    }
                      {(svc.quantity || svc.unit) &&
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                          {svc.quantity ?? 1} {svc.unit || ''}
                        </span>
                    }
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {t('tooth')}: {svc.tooth}
                      </span>
                    </div>
                    {svc.notes &&
                  <p className="text-xs text-gray-400 mt-2">{svc.notes}</p>
                  }
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                    <div className="relative inline-block group">
                      {onEditService &&
                    <button
                      type="button"
                      onClick={(e) => {e.stopPropagation();onEditService(svc);}}
                      className="sm:absolute sm:right-full sm:top-1/2 sm:-translate-y-1/2 sm:mr-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      title={t('editTreatment')}>
                      
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    }
                      <div onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                        current={svc.status}
                        options={STATUS_OPTIONS}
                        onChange={(newStatus) => onUpdateStatus?.(svc.id, newStatus)}
                        disabled={!onUpdateStatus}
                        namespace="services" />
                      
                      </div>
                    </div>
                    {svc.cost > 0 ?
                  <p className="text-sm font-medium text-gray-900">{formatVND(svc.cost)}</p> :

                  <p className="text-sm font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{t('noPrice')}</p>
                  }
                  </div>
                </div>

                {isExpanded &&
              <div className="mt-4 pt-4 border-t border-dashed border-primary/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="w-4 h-4 text-gray-400" />
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('paymentHistory')}</h4>
                      <span className="text-[10px] text-gray-400">({relatedPayments.length} {t('transactions')})</span>
                    </div>

                    {relatedPayments.length === 0 ?
                <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-400">
                        {t('noPayments')}.
                      </div> :

                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        {relatedPayments.map((p) => {
                    const isVoided = p.status === 'voided';
                    const isNegative = p.amount < 0;
                    const dateInfo = parseDisplayDate(p.paymentDate || p.createdAt);
                    const dd = dateInfo?.day ?? '—';
                    const mmm = dateInfo?.month ?? '';
                    const yyyy = dateInfo?.year ?? '';
                    return (
                      <div
                        key={p.id}
                        className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-50 last:border-b-0 transition-all duration-200 group ${
                        isVoided ? 'opacity-60' : ''} ${
                        isNegative ? 'bg-red-50/30' : ''}`}>
                        
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Date tear-off block */}
                          <div className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-12 rounded-lg border text-center ${isNegative ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                            <span className={`text-sm font-bold leading-none ${isNegative ? 'text-red-600' : 'text-orange-600'}`}>{dd}</span>
                            {mmm && <span className="text-[9px] text-gray-500 leading-tight mt-0.5">{mmm}</span>}
                            {yyyy && <span className="text-[8px] text-gray-400 leading-tight">{yyyy}</span>}
                          </div>
                          {/* Method badge + amount */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              <PaymentSourceBadges
                                method={p.method}
                                cashAmount={p.cashAmount}
                                bankAmount={p.bankAmount}
                                depositUsed={p.depositUsed} />
                              
                              {p.referenceCode &&
                              <span className="text-[10px] text-gray-700 font-medium">{p.referenceCode}</span>
                              }
                              {!p.referenceCode && p.receiptNumber &&
                              <span className="text-[10px] text-gray-400 font-mono">{p.receiptNumber}</span>
                              }
                              {p.referenceCode && p.receiptNumber &&
                              <span className="text-[10px] text-gray-400 font-mono">{p.receiptNumber}</span>
                              }
                            </div>
                            <p className={`text-sm font-semibold ${isNegative ? 'text-red-600' : 'text-gray-900'} ${isVoided ? 'line-through' : ''}`}>
                              {formatVND(p.amount)}
                            </p>
                            {p.notes &&
                            <p className="text-[10px] text-gray-400 truncate max-w-[160px] sm:max-w-[200px]" title={p.notes}>{p.notes}</p>
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isVoided ?
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Voided</span> :

                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Posted</span>
                          }
                          {!isVoided && onDeletePayment &&
                          <button
                            type="button"
                            onClick={(e) => {e.stopPropagation();onDeletePayment(p.id);}}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                            title={t('deletePayment', 'Xóa thanh toán')}>
                            
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          }
                        </div>
                            </div>);

                  })}
                        <div className="px-4 py-2.5 bg-gray-50/70 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">Total paid for this treatment</span>
                          <span className="text-sm font-bold text-gray-900">{formatVND(paidForService)}</span>
                        </div>
                      </div>
                }
                  </div>
              }
              </div>);

        })}
        </div>
      }
    </div>);

}