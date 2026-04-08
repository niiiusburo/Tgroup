import { Clock, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { DepositTransaction } from '@/hooks/useDeposits';

interface DepositHistoryProps {
  transactions: DepositTransaction[];
  loading?: boolean;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

export function DepositHistory({ transactions, loading }: DepositHistoryProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Deposit History</h3>
        </div>
        <div className="text-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-gray-900">Deposit History</h3>
        <span className="text-xs text-gray-400">({transactions.length} transactions)</span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No deposit history yet
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const isDeposit = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isDeposit 
                    ? 'bg-emerald-50 border-emerald-100' 
                    : 'bg-red-50 border-red-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isDeposit ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {isDeposit ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      isDeposit ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {isDeposit ? '+' : ''}{formatVND(tx.amount)} đ
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isDeposit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {tx.method}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {tx.note || (isDeposit ? 'Deposit added' : 'Deposit used')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                  {tx.balanceAfter !== undefined && (
                    <p className="text-xs text-gray-500">
                      Bal: {formatVND(tx.balanceAfter)} đ
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
