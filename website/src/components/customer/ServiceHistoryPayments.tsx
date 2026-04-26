import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { PaymentSourceBadges } from '@/components/payment/PaymentSourceBadges';
import { formatVND, parseDisplayDate } from '@/lib/formatting';

interface ServiceHistoryPaymentsProps {
  readonly payments: readonly PaymentWithAllocations[];
}

export function ServiceHistoryPayments({ payments }: ServiceHistoryPaymentsProps) {
  const { t } = useTranslation('services');

  return (
    <tr className="bg-gray-50/50">
      <td colSpan={8} className="py-3 px-4">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('paymentHistory')}</span>
            <span className="text-[10px] text-gray-400">({payments.length} {t('transactions')})</span>
          </div>
          {payments.map((payment) => {
            const isVoided = payment.status === 'voided';
            const dateInfo = parseDisplayDate(payment.paymentDate || payment.createdAt);
            return (
              <div
                key={payment.id}
                className={`px-4 py-2.5 flex items-center justify-between gap-3 border-b border-gray-50 last:border-b-0 ${isVoided ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg border bg-orange-50 border-orange-200 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-bold leading-none text-orange-600">{dateInfo?.day ?? '-'}</span>
                    <span className="text-[9px] text-gray-500 leading-tight">{dateInfo?.month ?? ''}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <PaymentSourceBadges
                        method={payment.method}
                        cashAmount={payment.cashAmount}
                        bankAmount={payment.bankAmount}
                        depositUsed={payment.depositUsed}
                      />
                      {payment.referenceCode && <span className="text-[10px] text-gray-500">{payment.referenceCode}</span>}
                      {payment.receiptNumber && payment.receiptNumber !== payment.referenceCode && (
                        <span className="text-[10px] text-gray-400">{payment.receiptNumber}</span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${isVoided ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {formatVND(payment.amount)}
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
  );
}
