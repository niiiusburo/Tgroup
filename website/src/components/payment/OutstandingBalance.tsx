/**
 * Outstanding Balance Card - Shows unpaid balances for services
 * @crossref:used-in[Payment, CustomerProfile, Services]
 * @crossref:uses[mockPayment]
 */

import { AlertTriangle, Clock } from 'lucide-react';
import type { OutstandingBalanceItem } from '@/types/payment';
import { formatVND } from '@/lib/formatting';
import { useTranslation } from 'react-i18next';

function getDaysUntilDue(dueDate: string): number {
  if (!dueDate) return NaN;
  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return NaN;
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface OutstandingBalanceProps {
  readonly balances: readonly OutstandingBalanceItem[];
  readonly onPayNow?: (balance: OutstandingBalanceItem) => void;
}

export function OutstandingBalance({ balances, onPayNow }: OutstandingBalanceProps) {
  const { t } = useTranslation('payment');
  if (balances.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6 text-center">
        <div className="p-3 bg-green-50 rounded-full w-fit mx-auto mb-2">
          <Clock className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-sm text-gray-500">{t('noOutstanding')}</p>
      </div>
    );
  }

  const totalOutstanding = balances.reduce((sum, b) => sum + (b.remainingBalance ?? (b.totalCost - b.paidAmount)), 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800">{t('totalOutstanding')}</p>
          <p className="text-xl font-bold text-amber-900">{formatVND(totalOutstanding)}</p>
        </div>
        <span className="ml-auto text-xs text-amber-600 font-medium">
          {balances.length} {balances.length === 1 ? t('item') : t('items')}
        </span>
      </div>

      {/* Balance cards */}
      {balances.map((balance) => {
        const daysUntil = getDaysUntilDue(balance.dueDate);
        const isOverdue = daysUntil < 0;
        const isUrgent = daysUntil >= 0 && daysUntil <= 7;
        const paidPercent = Math.round((balance.paidAmount / balance.totalCost) * 100);

        return (
          <div key={balance.id} className="bg-white rounded-xl shadow-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{balance.customerName}</p>
                <p className="text-xs text-gray-500">{balance.recordName}</p>
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isOverdue
                  ? 'bg-red-100 text-red-700'
                  : isUrgent
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {isNaN(daysUntil)
                  ? '—'
                  : isOverdue
                    ? `${Math.abs(daysUntil)}d ${t('overdue')}`
                    : `${daysUntil}d ${t('remainingLabel')}`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{t('paid')}: {formatVND(balance.paidAmount)}</span>
                <span>{paidPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="rounded-full h-1.5 bg-primary transition-all"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400">{t('remainingLabel')} </span>
                <span className="text-sm font-bold text-gray-900">{formatVND(balance.remainingBalance ?? (balance.totalCost - balance.paidAmount))}</span>
              </div>
              {onPayNow && (
                <button
                  type="button"
                  onClick={() => onPayNow(balance)}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  {t('payNow')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{balance.locationName}</span>
              <span>Due: {balance.dueDate}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
