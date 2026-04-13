/**
 * EditPaymentModal - Edit an existing payment record
 * @crossref:used-in[CustomerProfile]
 * @crossref:uses[updatePayment from api.ts]
 */

import { useState, useEffect } from 'react';
import { X, Check, CreditCard, FileText, Calendar, DollarSign } from 'lucide-react';
import { updatePayment, type ApiPayment } from '@/lib/api';
import { formatVND } from '@/lib/formatting';

interface EditPaymentModalProps {
  readonly payment: ApiPayment | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSaved: (updated: ApiPayment) => void;
}

const METHOD_OPTIONS = [
  { value: 'cash' as const, label: 'Cash', active: 'bg-amber-100 text-amber-700 border-amber-300 ring-amber-500/20' },
  { value: 'bank_transfer' as const, label: 'Bank Transfer', active: 'bg-blue-100 text-blue-700 border-blue-300 ring-blue-500/20' },
  { value: 'deposit' as const, label: 'Deposit', active: 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-emerald-500/20' },
  { value: 'mixed' as const, label: 'Mixed', active: 'bg-purple-100 text-purple-700 border-purple-300 ring-purple-500/20' },
] as const;

export function EditPaymentModal({ payment, isOpen, onClose, onSaved }: EditPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'deposit' | 'mixed'>('cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payment && isOpen) {
      setAmount(String(payment.amount));
      setMethod(payment.method);
      const rawDate = payment.paymentDate || payment.createdAt?.slice(0, 10) || '';
      setPaymentDate(/^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '');
      setReferenceCode(payment.referenceCode || '');
      setNotes(payment.notes || '');
      setError(null);
    }
  }, [payment, isOpen]);

  async function handleSave() {
    if (!payment) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePayment(payment.id, {
        amount: parsedAmount,
        method,
        paymentDate: paymentDate || undefined,
        referenceCode: referenceCode || undefined,
        notes: notes || undefined,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    if (!isSaving) onClose();
  }

  if (!isOpen || !payment) return null;

  const isVoided = payment.status === 'voided';
  const isNegative = payment.amount < 0;
  const previewAmount = parseFloat(amount);

  return (
    <div className="modal-container">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-[480px]">
        {/* Header */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Ch&#7881;nh s&#7917;a thanh to&#225;n</h2>
              <p className="text-sm text-orange-100 mt-1 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                {payment.receiptNumber ? `Receipt: ${payment.receiptNumber}` : `ID: ${payment.id.slice(0, 8)}…`}
                {isVoided && (
                  <span className="bg-red-500/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">VOIDED</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body px-6 py-6 space-y-5">
          {isVoided && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              This payment has been voided. Editing is allowed but won&#39;t affect financial totals.
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />
              S&#7889; ti&#7873;n (VND)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step={1000}
                className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm font-medium ${
                  isNegative ? 'text-red-600 border-red-200' : 'text-gray-900 border-gray-200'
                }`}
                placeholder="0"
              />
              {amount && !isNaN(previewAmount) && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  {formatVND(previewAmount)}
                </span>
              )}
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              Ph&#432;&#417;ng th&#7913;c
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMethod(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                    method === opt.value
                      ? `${opt.active} ring-2`
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Ng&#224;y thanh to&#225;n
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
          </div>

          {/* Reference Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              M&#227; tham chi&#7871;u (tu&#7ef3; ch&#7885;n)
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="VD: TXN-20240415"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Ghi ch&#250;
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ghi ch&#250; th&#234;m..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            H&#7911;y b&#7887;
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                &#272;ang l&#432;u...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                L&#432;u thay &#273;&#7893;i
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
