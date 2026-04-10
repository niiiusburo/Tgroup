/**
 * VietQrModal - Split-panel QR generation modal for VietQR payments
 * @crossref:used-in[PaymentForm.tsx, DepositWallet.tsx]
 * @crossref:uses[vietqr.ts, useBankSettings.ts]
 */

import { useState, useEffect } from 'react';
import { X, QrCode } from 'lucide-react';
import { buildVietQrUrl, generatePaymentDescription } from '../../lib/vietqr';
import { useBankSettings } from '../../hooks/useBankSettings';

interface VietQrModalProps {
  open: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  defaultAmount?: number;
}

export function VietQrModal({
  open,
  onClose,
  customerName = '',
  customerPhone = '',
  defaultAmount,
}: VietQrModalProps) {
  const { settings, loading } = useBankSettings();
  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : '');
  const [description, setDescription] = useState<string>('');
  const [generated, setGenerated] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount ? String(defaultAmount) : '');
      setDescription(
        customerName ? generatePaymentDescription(customerName, customerPhone) : ''
      );
      setGenerated(false);
    }
  }, [open, customerName, customerPhone, defaultAmount]);

  if (!open) return null;

  const qrUrl =
    generated && settings && amount
      ? buildVietQrUrl({
          bin: settings.bankBin,
          number: settings.bankNumber,
          amount: Number(amount),
          description: description || '',
          name: settings.bankAccountName,
        })
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Thanh toán VietQR</h2>
                <p className="text-sm text-orange-100 mt-0.5">Quét mã QR để chuyển khoản</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel - inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Số tiền (VND)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setGenerated(false);
                }}
                placeholder="Nhập số tiền"
                min={0}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Nội dung chuyển khoản
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setGenerated(false);
                }}
                placeholder="Nhập nội dung"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => setGenerated(true)}
              disabled={!amount || loading || !settings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tạo QR
            </button>
          </div>

          {/* Right panel - QR display */}
          <div className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 p-4 min-h-[200px]">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Đang tải...
              </div>
            ) : !settings ? (
              <div className="text-center text-gray-500">
                <p className="text-sm">Vui lòng cấu hình tài khoản ngân hàng trong Cài đặt</p>
              </div>
            ) : qrUrl ? (
              <div className="text-center">
                <img src={qrUrl} alt="VietQR" className="mx-auto rounded-lg" />
                <p className="mt-2 text-xs text-gray-400">
                  {settings.bankAccountName} - {settings.bankNumber}
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nhập số tiền và nhấn "Tạo QR"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
