/**
 * Payment History Table - Shows all payment transactions with confirmation actions
 * @crossref:used-in[Payment]
 * @crossref:uses[mockPayment]
 */

import { useState } from 'react';
import { Receipt, FileText, CheckCircle2, CircleOff } from 'lucide-react';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  type PaymentRecord,
} from '@/data/mockPayment';
import { formatVND } from '@/lib/formatting';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentHistoryProps {
  readonly payments: readonly PaymentRecord[];
  readonly loading?: boolean;
  readonly onConfirm?: (paymentId: string, confirmed: boolean, notes?: string) => Promise<void>;
  readonly confirmLoading?: string | null;
}

function ConfirmModal({
  open,
  payment,
  onClose,
  onConfirm,
}: {
  open: boolean;
  payment: PaymentRecord | null;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
}) {
  const { t } = useTranslation('payment');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open || !payment) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(notes || undefined);
      setNotes('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('confirmPayment')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {formatVND(payment.amount)} — {payment.recordName}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('enterNotePlaceholder')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none mb-4 resize-none"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            {t('cancelBtn')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? t('saving') : t('confirmPayment')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentHistory({ payments, loading = false, onConfirm, confirmLoading }: PaymentHistoryProps) {
  const { t } = useTranslation('payment');
  const { hasPermission } = useAuth();
  const canConfirm = hasPermission('payment.confirm');
  const [modalPayment, setModalPayment] = useState<PaymentRecord | null>(null);

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
    <>
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
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => {
                const isConfirmed = payment.status === 'confirmed';
                const isCanonicalPayment = !!payment.createdBy;
                const showConfirmButton = canConfirm && payment.status === 'completed' && isCanonicalPayment && onConfirm;
                const showUnconfirmButton = canConfirm && isConfirmed && isCanonicalPayment && onConfirm;

                return (
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
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full w-fit ${PAYMENT_STATUS_STYLES[payment.status]}`}>
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </span>
                        {isConfirmed && payment.confirmedAt && (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {new Date(payment.confirmedAt).toLocaleDateString()}
                            {payment.confirmedByName && ` · ${payment.confirmedByName}`}
                          </span>
                        )}
                        {payment.confirmationNotes && (
                          <span className="text-[10px] text-gray-500 italic truncate max-w-[200px]">
                            “{payment.confirmationNotes}”
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{payment.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {showConfirmButton && (
                          <button
                            type="button"
                            onClick={() => setModalPayment(payment)}
                            disabled={confirmLoading === payment.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            title={t('confirmPayment')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('confirmPayment')}
                          </button>
                        )}
                        {showUnconfirmButton && (
                          <button
                            type="button"
                            onClick={() => onConfirm?.(payment.id, false)}
                            disabled={confirmLoading === payment.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50"
                            title={t('cancel')}
                          >
                            <CircleOff className="w-3.5 h-3.5" />
                            {t('cancel')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!modalPayment}
        payment={modalPayment}
        onClose={() => setModalPayment(null)}
        onConfirm={async (notes) => {
          if (modalPayment) {
            await onConfirm?.(modalPayment.id, true, notes);
            setModalPayment(null);
          }
        }}
      />
    </>
  );
}
