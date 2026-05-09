/**
 * Payment History Table - Shows all payment transactions
 * @crossref:used-in[Payment]
 * @crossref:uses[mockPayment]
 */

import { Receipt, FileText, Image as ImageIcon } from 'lucide-react';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  type PaymentRecord,
} from '@/data/mockPayment';
import { formatVND } from '@/lib/formatting';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/shared/LoadingState';
import { useState } from 'react';
import { PaymentProofModal } from './PaymentProofModal';

interface PaymentHistoryProps {
  readonly payments: readonly PaymentRecord[];
  readonly loading?: boolean;
}

export function PaymentHistory({ payments, loading = false }: PaymentHistoryProps) {
  const { t } = useTranslation('payment');
  const [proofPaymentId, setProofPaymentId] = useState<string | null>(null);
  if (loading) {
    return <LoadingState title="Loading payments..." />;
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{t('noPaymentRecords')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colReceipt')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colCustomer')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colService')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colAmount')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colMethod')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colStatus')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colDate')}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('colProof')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-col">
                      {payment.referenceCode && <span className="text-xs font-medium text-gray-700">{payment.referenceCode}</span>}
                      {!payment.referenceCode && payment.receiptNumber && <span className="text-xs font-mono text-gray-600">{payment.receiptNumber}</span>}
                      {payment.referenceCode && payment.receiptNumber && <span className="text-[10px] font-mono text-gray-400">{payment.receiptNumber}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{payment.customerName}</p>
                    <p className="text-xs text-gray-400">{payment.customerPhone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-700">{payment.recordName}</p>
                  <p className="text-xs text-gray-400">{payment.locationName}</p>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatVND(payment.amount)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {PAYMENT_METHOD_LABELS[payment.method]}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PAYMENT_STATUS_STYLES[payment.status]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{payment.date}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setProofPaymentId(payment.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                    {t('viewReceiptProof')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {proofPaymentId && (
        <PaymentProofModal
          paymentId={proofPaymentId}
          isOpen={true}
          onClose={() => setProofPaymentId(null)}
        />
      )}
    </div>
  );
}
