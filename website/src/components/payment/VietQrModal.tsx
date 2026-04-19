/**
 * VietQrModal - Split-panel QR generation modal for VietQR payments
 * @crossref:used-in[PaymentForm.tsx, DepositWallet.tsx]
 * @crossref:uses[vietqr.ts, useBankSettings.ts]
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, QrCode, CheckCircle } from 'lucide-react';
import { buildVietQrUrl, generatePaymentDescription } from '../../lib/vietqr';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { useBankSettings } from '../../hooks/useBankSettings';
import { uploadPaymentProof } from '../../lib/api';

interface VietQrModalProps {
  open: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  defaultAmount?: number;
  paymentId?: string;
}

export function VietQrModal({
  open,
  onClose,
  customerName = '',
  customerPhone = '',
  defaultAmount,
  paymentId
}: VietQrModalProps) {
  const { t } = useTranslation('payment');
  const { settings, loading } = useBankSettings();
  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : '');
  const [description, setDescription] = useState<string>('');
  const [generated, setGenerated] = useState<boolean>(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount ? String(defaultAmount) : '');
      setDescription(
        customerName ? generatePaymentDescription(customerName, customerPhone) : ''
      );
      setGenerated(false);
      setProofImage(null);
      setUploadSuccess(false);
      setUploadError(null);
    }
  }, [open, customerName, customerPhone, defaultAmount]);

  if (!open) return null;

  const qrUrl =
  generated && settings && amount ?
  buildVietQrUrl({
    bin: settings.bankBin,
    number: settings.bankNumber,
    amount: Number(amount),
    description: description || '',
    name: settings.bankAccountName
  }) :
  null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadSuccess(false);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProofImage(result || null);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPayment = async () => {
    if (!proofImage || !paymentId) return;
    setUploading(true);
    setUploadSuccess(false);
    setUploadError(null);
    try {
      await uploadPaymentProof(paymentId, proofImage, description || undefined);
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 py-5 bg-primary">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t('thanhTonVietqr')}</h2>
                <p className="text-sm text-orange-100 mt-0.5">{t('qutMQrChuynKhon')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">

              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel - inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('sTinVnd')}
              </label>
              <CurrencyInput
                value={amount ? Number(amount) : null}
                onChange={(v) => {
                  setAmount(v === null ? '' : String(v));
                  setGenerated(false);
                }}
                placeholder={t('enterAmount', { ns: 'payment' })} />

            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('niDungChuynKhon')}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setGenerated(false);
                }}
                placeholder={t('enterNote', { ns: 'payment' })}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

            </div>

            <button
              type="button"
              onClick={() => setGenerated(true)}
              disabled={!amount || loading || !settings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {t('toQr')}
            </button>
          </div>

          {/* Right panel - QR display + proof upload */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 p-4 min-h-[200px]">
              {loading ?
              <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />

              </div> :
              !settings ?
              <div className="text-center text-gray-500">
                  <p className="text-sm">{t('vuiLngCuHnhTiKhonNgnHngTrongCiT')}</p>
                </div> :
              qrUrl ?
              <div className="text-center">
                  <img src={qrUrl} alt="VietQR" className="mx-auto rounded-lg" />
                  <p className="mt-2 text-xs text-gray-400">
                    {settings.bankAccountName} - {settings.bankNumber}
                  </p>
                </div> :

              <div className="text-center text-gray-400">
                  <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('nhpSTinVNhnToQr')}</p>
                </div>
              }
            </div>

            {qrUrl &&
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                {t('nhXcNhnChuynKhon')}
              </label>
                <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100" />

                {proofImage &&
              <img src={proofImage} alt="Payment proof preview" className="w-full max-h-40 object-contain rounded-lg border border-gray-100" />
              }
                <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={!proofImage || uploading || !paymentId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? t('saving') : t("xcNhnThanhTon")}
                </button>
                {uploadSuccess &&
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('luXcNhnThanhTonThnhCng')}</span>
                  </div>
              }
                {uploadError &&
              <div className="text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">{uploadError}</div>
              }
              </div>
            }
          </div>
        </div>
      </div>
    </div>);

}