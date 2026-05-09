import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { confirmPaymentProof, fetchPaymentById, type ApiPayment } from '@/lib/api/payments';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentProofModalProps {
  readonly paymentId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PaymentProofModal({ paymentId, isOpen, onClose }: PaymentProofModalProps) {
  const { t } = useTranslation('payment');
  const { hasPermission } = useAuth();
  const canConfirm = hasPermission('payment.confirm');

  const [payment, setPayment] = useState<ApiPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proof = payment?.proof ?? null;
  const isConfirmed = Boolean(proof?.confirmedAt);

  const title = useMemo(() => {
    if (payment?.receiptNumber) return `${t('receiptProofTitle')} • ${payment.receiptNumber}`;
    if (payment?.referenceCode) return `${t('receiptProofTitle')} • ${payment.referenceCode}`;
    return t('receiptProofTitle');
  }, [payment?.receiptNumber, payment?.referenceCode, t]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setPayment(null);
    fetchPaymentById(paymentId)
      .then((res) => setPayment(res))
      .catch((e) => setError(e?.message || 'Failed to load payment'))
      .finally(() => setLoading(false));
  }, [isOpen, paymentId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!canConfirm || !proof || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      await confirmPaymentProof(paymentId);
      const refreshed = await fetchPaymentById(paymentId);
      setPayment(refreshed);
    } catch (e: any) {
      setError(e?.message || 'Failed to confirm receipt');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {proof && (
              <p className="mt-1 text-xs text-gray-500">
                {isConfirmed ? t('receiptConfirmed') : t('receiptUnconfirmed')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('loadingReceiptProof')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && !proof && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {t('noReceiptProof')}
            </div>
          )}

          {!loading && !error && proof && (
            <div className="space-y-3">
              <img
                src={proof.proofImageBase64}
                alt="Payment proof"
                className="max-h-[520px] w-full rounded-xl border border-gray-200 object-contain"
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {isConfirmed ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-emerald-700">{t('receiptConfirmed')}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{t('receiptUnconfirmed')}</span>
                    </>
                  )}
                </div>

                {canConfirm && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirming || isConfirmed}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {isConfirmed ? t('receiptAlreadyConfirmed') : t('confirmReceipt')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

