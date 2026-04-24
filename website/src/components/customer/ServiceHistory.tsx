import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stethoscope, CheckCircle2, Clock, XCircle, ChevronUp, Wallet, Edit2, CreditCard } from 'lucide-react';
import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { formatVND, parseDisplayDate } from '@/lib/formatting';
import { PaymentSourceBadges } from '@/components/payment/PaymentSourceBadges';

/**
 * Service History - Treatment history table (Lịch sử điều trị)
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

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, label: 'completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  active: { icon: Clock, label: 'active', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  cancelled: { icon: XCircle, label: 'cancelled', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' }
} as const;

function getPaymentsForService(
  svc: CustomerService,
  payments?: readonly PaymentWithAllocations[]
): PaymentWithAllocations[] {
  if (!payments) return [];
  return payments.filter(
    (p) =>
      p.serviceId === svc.id ||
      p.serviceId === svc.orderId ||
      (p.allocations && p.allocations.some(
        (a) => a.invoiceId === svc.id || a.invoiceId === svc.orderId
      ))
  );
}

function ToothBadge({ value }: { readonly value: string }) {
  const label = value?.trim() || '-';

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-gray-700">
      <span role="img" aria-label="Tooth" className="text-sm leading-none">🦷</span>
      <span>{label}</span>
    </span>
  );
}

export function ServiceHistory({
  services,
  limit,
  payments,
  onEditService,
  onUpdateStatus: _onUpdateStatus,
  onPayForService,
  onDeletePayment: _onDeletePayment
}: ServiceHistoryProps) {
  const { t } = useTranslation('services');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayServices = limit ? services.slice(0, limit) : services;

  const totalCost = services
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.cost, 0);
  const totalPaid = services
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + (s.paidAmount ?? 0), 0);
  const zeroCostCount = services.filter((s) => s.cost === 0 && s.status !== 'cancelled').length;

  if (services.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">{t('history.title')}</h3>
        </div>
        <div className="text-center py-8 text-gray-400 text-sm">{t('history.noHistory')}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">{t('history.title')}</h3>
          <span className="text-xs text-gray-400">({services.length}{limit && services.length > limit ? '+' : ''} {t('treatment')})</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-left sm:text-right">
          {zeroCostCount > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              ⚠ {zeroCostCount} {t('noPrice')}
            </span>
          )}
          <div>
            <p className="text-xs text-gray-400">{t('totalCost')} / {t('collected')}</p>
            <p className="text-sm font-bold text-gray-900">{formatVND(totalPaid)} <span className="text-gray-400 font-normal">/ {formatVND(totalCost)}</span></p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="pb-3 pr-4 font-medium">Ngày</th>
              <th className="pb-3 pr-4 font-medium">Dịch vụ</th>
              <th className="pb-3 pr-4 font-medium text-right">Số lượng</th>
              <th className="pb-3 pr-4 font-medium text-right">Thành tiền</th>
              <th className="pb-3 pr-4 font-medium text-right">Thanh toán</th>
              <th className="pb-3 pr-4 font-medium text-right">Còn lại</th>
              <th className="pb-3 pr-4 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span role="img" aria-label="Tooth">🦷</span>
                  Răng & chẩn đoán
                </span>
              </th>
              <th className="pb-3 font-medium text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayServices.map((svc) => {
              const statusCfg = STATUS_CONFIG[svc.status];
              const isExpanded = expandedId === svc.id;
              const relatedPayments = getPaymentsForService(svc, payments);
              const paidAmt = svc.paidAmount ?? 0;
              const resAmt = svc.residual ?? Math.max(0, svc.cost - paidAmt);
              const hasPayment = relatedPayments.length > 0;
              const canPay = !!onPayForService && svc.status !== 'cancelled' && resAmt > 0;
              const paidPct = svc.cost > 0 ? Math.min(100, Math.max(0, paidAmt / svc.cost * 100)) : 0;

              return (
                <React.Fragment key={svc.id}>
                  <tr
                    className={`transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    onClick={() => hasPayment && setExpandedId(isExpanded ? null : svc.id)}
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">{svc.date}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{svc.service}</p>
                          {(svc.orderCode || svc.orderName) && (
                            <p className="text-xs font-mono text-primary mt-0.5">{svc.orderCode || svc.orderName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      <span className="text-gray-700">{svc.quantity ?? 1}</span>
                      {svc.unit && <span className="text-gray-400 text-xs ml-1">{svc.unit}</span>}
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap font-medium text-gray-900">
                      {formatVND(svc.cost)}
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      <span className={`font-medium ${paidAmt >= svc.cost ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {formatVND(paidAmt)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-medium ${resAmt > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {formatVND(resAmt)}
                        </span>
                        {canPay && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onPayForService?.(svc); }}
                            className="relative inline-flex min-w-[118px] items-center justify-center gap-1 overflow-hidden rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-gray-900 shadow-sm transition-colors hover:border-primary hover:bg-orange-100"
                            title={`${t('outstanding')}: ${formatVND(resAmt)}`}
                            aria-label={`${t('pay')} ${formatVND(resAmt)}`}
                          >
                            {paidPct > 0 && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 bg-emerald-200/90"
                                style={{
                                  width: `${paidPct}%`,
                                  minWidth: paidPct > 0 ? '8px' : undefined,
                                }}
                              />
                            )}
                            <span className="relative inline-flex items-center gap-1">
                              <CreditCard className="h-3 w-3 text-orange-600" />
                              {t('pay')}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <ToothBadge value={svc.tooth} />
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onEditService && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEditService(svc); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title={t('editTreatment')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPayment && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : svc.id); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                            title={t('paymentHistory')}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && relatedPayments.length > 0 && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={8} className="py-3 px-4">
                        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('paymentHistory')}</span>
                            <span className="text-[10px] text-gray-400">({relatedPayments.length} {t('transactions')})</span>
                          </div>
                          {relatedPayments.map((p) => {
                            const isVoided = p.status === 'voided';
                            const dateInfo = parseDisplayDate(p.paymentDate || p.createdAt);
                            return (
                              <div
                                key={p.id}
                                className={`px-4 py-2.5 flex items-center justify-between gap-3 border-b border-gray-50 last:border-b-0 ${isVoided ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex-shrink-0 w-10 h-10 rounded-lg border bg-orange-50 border-orange-200 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm font-bold leading-none text-orange-600">{dateInfo?.day ?? '—'}</span>
                                    <span className="text-[9px] text-gray-500 leading-tight">{dateInfo?.month ?? ''}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <PaymentSourceBadges
                                        method={p.method}
                                        cashAmount={p.cashAmount}
                                        bankAmount={p.bankAmount}
                                        depositUsed={p.depositUsed}
                                      />
                                      {p.referenceCode && <span className="text-[10px] text-gray-500">{p.referenceCode}</span>}
                                    </div>
                                    <p className={`text-sm font-semibold ${isVoided ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                      {formatVND(p.amount)}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isVoided ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                                  {isVoided ? 'Voided' : 'Posted'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
