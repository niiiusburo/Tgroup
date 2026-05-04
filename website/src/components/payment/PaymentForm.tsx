/**
 * PaymentForm - Pay-per-service payment recording.
 * Opens from a specific service row (ServiceHistory / OutstandingBalance) with
 * a locked ServicePaymentContext. No service picker, no location picker.
 * Multi-source (wallet + cash + bank) is capped at serviceContext.residual.
 *
 * @crossref:used-in[CustomerProfile.tsx]
 * @crossref:uses[ServicePaymentCard, VietQrModal, CurrencyInput, useDeposits, allocatePaymentSources]
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';
import {
  Banknote, Building2, CalendarDays, Check, CheckCircle2, CreditCard,
  DollarSign, FileText, Info, QrCode, Wallet, X } from
'lucide-react';
import { VietQrModal } from './VietQrModal';
import { ServicePaymentCard, type ServicePaymentContext } from './ServicePaymentCard';
import { useDeposits } from '@/hooks/useDeposits';
import { formatVND } from '@/lib/formatting';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { allocatePaymentSources } from '@/lib/allocatePaymentSources';

export interface PaymentSourceBreakdown {
  readonly depositAmount: number;
  readonly cashAmount: number;
  readonly bankAmount: number;
}

export interface PaymentAllocationInput {
  readonly invoiceId?: string;
  readonly dotkhamId?: string;
  readonly allocatedAmount: number;
}

export interface PaymentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly amount: number;
  readonly method: 'deposit' | 'cash' | 'bank_transfer' | 'mixed';
  readonly locationName: string;
  readonly notes: string;
  readonly paymentDate: string;
  readonly referenceCode?: string;
  readonly sources?: PaymentSourceBreakdown;
  readonly allocations?: PaymentAllocationInput[];
}

interface PaymentFormProps {
  readonly onSubmit: (data: PaymentFormData) => void;
  readonly onClose: () => void;
  readonly serviceContext: ServicePaymentContext;
  readonly defaultCustomerId: string;
  readonly defaultCustomerName: string;
  readonly defaultCustomerPhone?: string;
  readonly depositBalance?: number;
  readonly outstandingBalance?: number;
  readonly defaultNotes?: string;
  readonly defaultPaymentDate?: string;
  readonly defaultReferenceCode?: string;
  readonly defaultDepositAmount?: number;
  readonly defaultCashAmount?: number;
  readonly defaultBankAmount?: number;
  readonly isEdit?: boolean;
}

export function PaymentForm({
  onSubmit,
  onClose,
  serviceContext,
  defaultCustomerId,
  defaultCustomerName,
  defaultCustomerPhone = '',
  depositBalance: externalDepositBalance,
  outstandingBalance: externalOutstandingBalance,
  defaultNotes = '',
  defaultPaymentDate,
  defaultReferenceCode = '',
  defaultDepositAmount = 0,
  defaultCashAmount = 0,
  defaultBankAmount = 0,
  isEdit = false
}: PaymentFormProps) {
  const { t } = useTranslation('payment');
  const { loadDeposits, balance: depositBalanceData } = useDeposits();

  const cap = Math.max(0, serviceContext.residual);

  const seed = useMemo(() => allocatePaymentSources(cap, {
    deposit: defaultDepositAmount,
    cash: defaultCashAmount,
    bank: defaultBankAmount
  }), [cap, defaultDepositAmount, defaultCashAmount, defaultBankAmount]);

  const [depositAmount, setDepositAmount] = useState(seed.deposit);
  const [cashAmount, setCashAmount] = useState(seed.cash);
  const [bankAmount, setBankAmount] = useState(seed.bank);
  const [notes, setNotes] = useState(defaultNotes);
  const { getToday } = useTimezone();
  const [paymentDate, setPaymentDate] = useState(
    () => defaultPaymentDate ?? getToday()
  );
  const [referenceCode, setReferenceCode] = useState(defaultReferenceCode);
  const [showVietQr, setShowVietQr] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const availableDeposit = externalDepositBalance ?? depositBalanceData.depositBalance;
  const outstandingBalance = externalOutstandingBalance ?? depositBalanceData.outstandingBalance;

  useEffect(() => {
    if (defaultCustomerId && externalDepositBalance === undefined) {
      loadDeposits(defaultCustomerId);
    }
  }, [defaultCustomerId, externalDepositBalance, loadDeposits]);

  const applySources = useCallback(
    (next: {deposit: number;cash: number;bank: number;}) => {
      const allocated = allocatePaymentSources(cap, next);
      setDepositAmount(allocated.deposit);
      setCashAmount(allocated.cash);
      setBankAmount(allocated.bank);
      return allocated;
    },
    [cap]
  );

  const handleDepositChange = useCallback((v: number | null) => {
    const deposit = Math.max(0, Math.min(availableDeposit, v ?? 0));
    applySources({ deposit, cash: cashAmount, bank: bankAmount });
  }, [applySources, availableDeposit, cashAmount, bankAmount]);

  const handleCashChange = useCallback((v: number | null) => {
    applySources({ deposit: depositAmount, cash: Math.max(0, v ?? 0), bank: bankAmount });
  }, [applySources, depositAmount, bankAmount]);

  const handleBankChange = useCallback((v: number | null) => {
    applySources({ deposit: depositAmount, cash: cashAmount, bank: Math.max(0, v ?? 0) });
  }, [applySources, depositAmount, cashAmount]);

  const useMaxDeposit = useCallback(() => {
    const target = Math.min(availableDeposit, cap);
    applySources({ deposit: target, cash: 0, bank: 0 });
  }, [applySources, availableDeposit, cap]);

  const totalPayment = depositAmount + cashAmount + bankAmount;
  const atCap = cap > 0 && Math.abs(totalPayment - cap) <= 0.01;
  const remaining = Math.max(0, cap - totalPayment);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (totalPayment <= 0 || cap <= 0) return;

    let method: PaymentFormData['method'] = 'cash';
    const activeCount = [depositAmount > 0, cashAmount > 0, bankAmount > 0].filter(Boolean).length;
    if (activeCount > 1) method = 'mixed';else
    if (depositAmount > 0) method = 'deposit';else
    if (bankAmount > 0) method = 'bank_transfer';

    const allocation: PaymentAllocationInput =
    serviceContext.recordType === 'saleorder' ?
    { invoiceId: serviceContext.recordId, allocatedAmount: totalPayment } :
    { dotkhamId: serviceContext.recordId, allocatedAmount: totalPayment };

    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        customerId: defaultCustomerId,
        customerName: defaultCustomerName,
        customerPhone: defaultCustomerPhone,
        amount: totalPayment,
        method,
        locationName: serviceContext.locationName,
        notes: notes.trim(),
        paymentDate,
        referenceCode: referenceCode.trim() || undefined,
        sources: { depositAmount, cashAmount, bankAmount },
        allocations: [allocation]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      setSubmitError(message);
      console.error('Payment save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }

  const submitDisabled = isSaving || totalPayment <= 0 || cap <= 0;

  return (
    <div className="modal-container">
      {/* animate: backdrop fade-in coordinated with modal zoom-in — total ≤250ms */}
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="payment-ipad-modal modal-content animate-in zoom-in-95 duration-200 max-w-2xl">
        <div className="modal-header relative px-6 py-5 bg-primary">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEdit ? t("chnhSaThanhTon") : t("ghiNhnThanhTon")}
                </h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {serviceContext.recordName} — {defaultCustomerName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              aria-label={t('close')}>
              
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="payment-ipad-form modal-body px-6 py-6 space-y-5">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {submitError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <p className="text-xs text-emerald-600 mb-0.5">{t('sDVDeposit')}</p>
              <p className="text-lg font-bold text-emerald-700 tabular-nums">{formatVND(availableDeposit)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-xs text-red-600 mb-0.5">{t('cnNOutstanding')}</p>
              <p className="text-lg font-bold text-red-700 tabular-nums">{formatVND(outstandingBalance)}</p>
            </div>
          </div>

          <ServicePaymentCard ctx={serviceContext} />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('ngunThanhTon')}
                </label>
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <Info className="w-3 h-3" />
                  {formatVND(cap)}
                </span>
              </div>
              {/* animate: key-driven crossfade between "Còn lại" and "Đã đủ" states */}
              {remaining > 0 ?
              <span key="remaining" className="text-xs text-gray-500 animate-in fade-in duration-200">
                  {t('cnLi')} <span className="font-semibold text-gray-700 tabular-nums">{formatVND(remaining)}</span>
                </span> :

              <span key="full" className="text-xs font-semibold text-emerald-600 animate-in fade-in duration-200">{t('fullyPaid')}</span>
              }
            </div>

            <div className="space-y-3">
              {/* Deposit source row */}
              <div
                className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                depositAmount > 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 bg-white'}`
                }>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* animate: icon container scale-in + color shift on activation */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      depositAmount > 0 ? 'bg-emerald-100 scale-105' : 'bg-gray-100 scale-100'}`
                      }>
                      
                      <Wallet className={`w-4 h-4 transition-colors duration-200 ${depositAmount > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">{t('fromWallet')}</span>
                      {/* polish: gray-400 → gray-500 for legibility */}
                      <span className="text-xs text-gray-500 ml-2">{t('sn')} {formatVND(availableDeposit)}</span>
                    </div>
                  </div>
                  {/* polish: title tooltip when cap=0 so disabled state explains itself */}
                  <button
                    type="button"
                    onClick={useMaxDeposit}
                    disabled={availableDeposit <= 0 || cap <= 0}
                    title={cap <= 0 ? t("sDTiAT") : undefined}
                    className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {t('dngTtC')}

                  </button>
                </div>
                <CurrencyInput
                  value={depositAmount || null}
                  onChange={handleDepositChange}
                  placeholder="0" />
                
              </div>

              {/* Cash source row */}
              <div
                className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                cashAmount > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-white'}`
                }>
                
                <div className="flex items-center gap-2 mb-2">
                  {/* animate: icon container scale-in + color shift on activation */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    cashAmount > 0 ? 'bg-amber-100 scale-105' : 'bg-gray-100 scale-100'}`
                    }>
                    
                    <Banknote className={`w-4 h-4 transition-colors duration-200 ${cashAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('cash')}</span>
                </div>
                <CurrencyInput
                  value={cashAmount || null}
                  onChange={handleCashChange}
                  placeholder="0" />
                
              </div>

              {/* Bank transfer source row */}
              <div
                className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                bankAmount > 0 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'}`
                }>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* animate: icon container scale-in + color shift on activation */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      bankAmount > 0 ? 'bg-blue-100 scale-105' : 'bg-gray-100 scale-100'}`
                      }>
                      
                      <Building2 className={`w-4 h-4 transition-colors duration-200 ${bankAmount > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{t('bank')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVietQr(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                    {t('generateQR')}
                    <QrCode className="w-3.5 h-3.5" />

                  </button>
                </div>
                <CurrencyInput
                  value={bankAmount || null}
                  onChange={handleBankChange}
                  placeholder="0" />
                
              </div>
            </div>

            {/* Total summary panel */}
            <div
              className={`mt-4 rounded-xl p-4 border-2 transition-all duration-200 ${
              totalPayment > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`
              }>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">{t('tngThanhTon')}</span>
                </div>
                {/* animate: tabular-nums for stable width; transition-colors only on money figure */}
                <span className="text-2xl font-bold text-orange-600 tabular-nums transition-colors duration-150">
                  {formatVND(totalPayment)}
                </span>
              </div>
              {totalPayment > 0 &&
              <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                  {depositAmount > 0 &&
                <div className="flex justify-between text-xs">
                      <span className="text-emerald-600">{t('fromWallet')}</span>
                      {/* polish: tabular-nums so breakdown amounts column-align */}
                      <span className="font-medium tabular-nums">{formatVND(depositAmount)}</span>
                    </div>
                }
                  {cashAmount > 0 &&
                <div className="flex justify-between text-xs">
                      <span className="text-amber-600">{t('cash')}</span>
                      <span className="font-medium tabular-nums">{formatVND(cashAmount)}</span>
                    </div>
                }
                  {bankAmount > 0 &&
                <div className="flex justify-between text-xs">
                      <span className="text-blue-600">{t('bank')}</span>
                      <span className="font-medium tabular-nums">{formatVND(bankAmount)}</span>
                    </div>
                }
                </div>
              }
              {/* animate: one-time slide-in-from-bottom so the message is noticed on first appearance.
                    polish: CheckCircle2 replaces AlertCircle — reaching cap is a positive confirmation,
                    not a warning; keeps emerald color consistent with success semantics. */}
              {atCap &&
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('fullyPaid')}
              </div>
              }
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5" />
              {t('ngyThanhTon')}
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />
            
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              {t('mThamChiuGhiChNhanh')}
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder={t('referenceOptional')}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />
            
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('enterNotePlaceholder')}
              rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm resize-none" />
            
          </div>
          {/* Footer inside form so Enter key submits and type="submit" works natively */}
          <div className="modal-footer px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 -mx-6 -mb-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {isEdit ? t('luThayI') : t('ghiNhnThanhTon')}
              {totalPayment > 0 ? ` ${formatVND(totalPayment)}` : ''}
            </button>
          </div>
        </form>

        <VietQrModal
          open={showVietQr}
          onClose={() => setShowVietQr(false)}
          defaultAmount={bankAmount > 0 ? bankAmount : undefined}
          customerName={defaultCustomerName}
          customerPhone={defaultCustomerPhone}
        />
      </div>
    </div>
  );

}
