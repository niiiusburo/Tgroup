import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, Trash2 } from 'lucide-react';
import { CustomerDeposits } from '@/components/payment/CustomerDeposits';
import { PaymentSourceBadges } from '@/components/payment/PaymentSourceBadges';
import { formatVND, parseDisplayDate } from '@/lib/formatting';
import type { PaymentTabProps } from './types';

export function PaymentTab({
  profile,
  services,
  payments,
  loadingPayments,
  loadingDeposits,
  depositList,
  usageHistory,
  depositBalance,
  onAddDeposit,
  onAddRefund,
  onVoidDeposit,
  onDeleteDeposit,
  onEditDeposit,
  onRefreshDeposits,
  onDeletePayment,
}: PaymentTabProps) {
  const { t } = useTranslation('customers');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const totalServiceCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
  const amountPaid = Math.max(0, totalServiceCost - profile.outstandingBalance);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('payment', { ns: 'customers' })} &amp; {t('profileSection.deposit', { ns: 'customers' })}
        </h3>
      </div>

      {/* Bill summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label={t('profileSection.totalCost', { ns: 'customers' })} value={formatVND(totalServiceCost)} valueColor="text-gray-900" />
        <SummaryCard label={t('thanhTon')} value={formatVND(amountPaid)} valueColor="text-emerald-600" />
        <SummaryCard label={t('cnN')} value={formatVND(profile.outstandingBalance)} valueColor="text-red-600" />
      </div>

      {/* Payments list */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-500" />
            {t('paymentHistory', { ns: 'services' })}
            {payments.length > 0 && <span className="text-xs font-normal text-gray-500 ml-1">({payments.length})</span>}
          </h4>
        </div>

        {loadingPayments ? (
          <div className="p-6 text-center text-sm text-gray-500">{t('angTi', { ns: 'common' })}...</div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">{t('noPayments', { ns: 'services' })}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((p) => (
              <PaymentRow
                key={p.id}
                payment={p}
                isExpanded={expandedPaymentId === p.id}
                onToggleExpand={() => setExpandedPaymentId(expandedPaymentId === p.id ? null : p.id)}
                onDelete={onDeletePayment}
              />
            ))}
          </div>
        )}
      </div>

      <CustomerDeposits
        depositList={[...depositList]}
        usageHistory={[...usageHistory]}
        balance={depositBalance}
        loading={loadingDeposits}
        onAddDeposit={onAddDeposit ? (amount, method, date, note) => onAddDeposit(amount, method, date, note) : undefined}
        onAddRefund={onAddRefund ? (amount, method, date, note) => onAddRefund(amount, method, date, note) : undefined}
        onVoidDeposit={onVoidDeposit}
        onDeleteDeposit={onDeleteDeposit}
        onEditDeposit={onEditDeposit}
        onRefresh={onRefreshDeposits}
      />
    </div>
  );
}

function SummaryCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

interface PaymentRowProps {
  payment: import('@/hooks/useCustomerPayments').PaymentWithAllocations;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: (id: string) => void;
}

function PaymentRow({ payment: p, isExpanded, onToggleExpand, onDelete }: PaymentRowProps) {
  const { t } = useTranslation('customers');
  const isVoided = p.status === 'voided';
  const isNegative = p.amount < 0;
  const dateInfo = parseDisplayDate(p.paymentDate || p.createdAt);
  const dd = dateInfo?.day ?? '—';
  const mmm = dateInfo?.month ?? '';
  const yyyy = dateInfo?.year ?? '';

  return (
    <div className={`transition-all duration-200 group ${isNegative ? 'bg-red-50/20' : ''}`}>
      <div
        role={isVoided ? 'button' : undefined}
        tabIndex={isVoided ? 0 : undefined}
        onClick={() => { if (isVoided) onToggleExpand(); }}
        onKeyDown={(event) => {
          if (isVoided && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onToggleExpand();
          }
        }}
        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-200 ${
          isVoided
            ? 'cursor-default opacity-60'
            : 'hover:bg-gray-50 hover:ring-2 hover:ring-primary/20 hover:ring-inset hover:shadow-sm hover:-translate-y-px'
        }`}
      >
        {/* Date block */}
        <div className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-12 rounded-lg border text-center ${
          isNegative ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <span className={`text-sm font-bold leading-none ${isNegative ? 'text-red-600' : 'text-orange-600'}`}>{dd}</span>
          {mmm && <span className="text-[9px] text-gray-500 leading-tight mt-0.5">{mmm}</span>}
          {yyyy && <span className="text-[8px] text-gray-400 leading-tight">{yyyy}</span>}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <PaymentSourceBadges method={p.method} cashAmount={p.cashAmount} bankAmount={p.bankAmount} depositUsed={p.depositUsed} />
            {p.referenceCode && <span className="text-[10px] text-gray-700 font-medium">{p.referenceCode}</span>}
            {!p.referenceCode && p.receiptNumber && <span className="text-[10px] text-gray-400 font-mono">{p.receiptNumber}</span>}
            {p.referenceCode && p.receiptNumber && <span className="text-[10px] text-gray-400 font-mono">{p.receiptNumber}</span>}
          </div>
          <p className={`text-sm font-semibold ${isNegative ? 'text-red-600' : 'text-gray-900'} ${isVoided ? 'line-through' : ''}`}>
            {formatVND(p.amount)}
          </p>
          {p.notes && (
            <p className="text-[10px] text-gray-400 truncate max-w-[140px] sm:max-w-[200px]" title={p.notes}>{p.notes}</p>
          )}
        </div>

        {/* Status + delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isVoided ? (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Voided</span>
          ) : (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Posted</span>
          )}
          {!isVoided && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
              title={t('deletePayment', 'Xóa thanh toán')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isVoided && isExpanded && (
        <div className="px-4 pb-3">
          {p.notes && <p className="text-xs text-gray-500">Note: {p.notes}</p>}
        </div>
      )}
    </div>
  );
}
