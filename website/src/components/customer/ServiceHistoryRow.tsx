import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, CreditCard, Edit2, Trash2, Wallet } from 'lucide-react';
import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { formatVND } from '@/lib/formatting';
import { getPaymentsForService, resolveServiceFinancials } from './ServiceHistoryUtils';
import { ServiceHistoryPayments } from './ServiceHistoryPayments';
import { RecordDateBadge } from './RecordDateBadge';

interface ServiceHistoryRowProps {
  readonly service: CustomerService;
  readonly isExpanded: boolean;
  readonly payments?: readonly PaymentWithAllocations[];
  readonly onToggle: () => void;
  readonly onEditService?: (service: CustomerService) => void;
  readonly onDeleteService?: (service: CustomerService) => void;
  readonly onPayForService?: (service: CustomerService) => void;
}

const STATUS_DOT_CLASSES: Record<CustomerService['status'], string> = {
  completed: 'bg-emerald-500',
  active: 'bg-blue-500',
  cancelled: 'bg-red-500',
};

export function ServiceHistoryRow({
  service,
  isExpanded,
  payments,
  onToggle,
  onEditService,
  onDeleteService,
  onPayForService,
}: ServiceHistoryRowProps) {
  const { t } = useTranslation('services');
  const relatedPayments = getPaymentsForService(service, payments);
  const hasPayment = relatedPayments.length > 0;
  const { paidAmount, residual } = resolveServiceFinancials(service);
  const canPay = !!onPayForService && service.status !== 'cancelled' && residual > 0;
  const paidPct = service.cost > 0 ? Math.min(100, Math.max(0, (paidAmount / service.cost) * 100)) : 0;

  return (
    <React.Fragment>
      <tr
        className={`transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
        onClick={() => hasPayment && onToggle()}
      >
        <td className="py-3 pr-4 align-top whitespace-nowrap">
          <RecordDateBadge value={service.date} ariaLabel="Service date" />
        </td>
        <td className="py-3 pr-4 align-top">
          <div className="flex items-start gap-2">
            <div className={`mt-2 w-2 h-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[service.status]}`} />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{service.service}</p>
              {(service.orderCode || service.orderName) && (
                <p className="text-xs font-mono text-primary mt-0.5">{service.orderCode || service.orderName}</p>
              )}
              {service.doctor && service.doctor !== 'N/A' && (
                <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{service.doctor}</p>
              )}
              <StaffLine label="Phụ tá" value={service.assistantName} />
              <StaffLine label="Trợ lý BS" value={service.dentalAideName} />
            </div>
          </div>
        </td>
        <td className="py-3 pr-4 text-right align-top whitespace-nowrap">
          <div className="flex items-center justify-end gap-2">
            <ToothBadge value={service.tooth} />
            <span className="inline-flex min-w-[3rem] justify-end">
              <span className="text-gray-700">{service.quantity ?? 1}</span>
              {service.unit && <span className="text-gray-400 text-xs ml-1">{service.unit}</span>}
            </span>
          </div>
        </td>
        <td className="py-3 pr-4 text-right align-top whitespace-nowrap font-medium text-gray-900">
          {formatVND(service.cost)}
        </td>
        <td className="py-3 pr-4 text-right align-top whitespace-nowrap">
          <span className={`font-medium ${paidAmount >= service.cost ? 'text-emerald-600' : 'text-gray-900'}`}>
            {formatVND(paidAmount)}
          </span>
        </td>
        <td className="py-3 pr-4 text-right align-top whitespace-nowrap">
          <div className="flex flex-col items-end gap-1">
            <span className={`font-medium ${residual > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {formatVND(residual)}
            </span>
            {canPay && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onPayForService?.(service); }}
                className="relative inline-flex min-w-[118px] items-center justify-center gap-1 overflow-hidden rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-gray-900 shadow-sm transition-colors hover:border-primary hover:bg-orange-100"
                title={`${t('outstanding')}: ${formatVND(residual)}`}
                aria-label={`${t('pay')} ${formatVND(residual)}`}
              >
                {paidPct > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-emerald-200/90"
                    style={{ width: `${paidPct}%`, minWidth: '8px' }}
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
        <td className="py-3 text-center align-top">
          <div className="flex items-center justify-center gap-1">
            {onEditService && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onEditService(service); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title={t('editTreatment')}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDeleteService && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onDeleteService(service); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title={t('deleteTreatment')}
                aria-label={t('deleteTreatment')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {hasPayment && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onToggle(); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                title={t('paymentHistory')}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && relatedPayments.length > 0 && <ServiceHistoryPayments payments={relatedPayments} />}
    </React.Fragment>
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

function StaffLine({ label, value }: { readonly label: string; readonly value?: string }) {
  if (!value) return null;

  return (
    <p className="mt-0.5 truncate text-xs text-gray-500">
      <span className="text-gray-400">{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
  );
}
