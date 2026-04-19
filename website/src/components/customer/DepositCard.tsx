import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react';
import type { CustomerDeposit } from '@/types/customer';
import { formatVND } from '@/lib/formatting';

/**
 * Deposit Card - Shows wallet balance and transaction history
 * @crossref:used-in[CustomerProfile, Payment]
 */

interface DepositCardProps {
  readonly deposit: CustomerDeposit;
}

export function DepositCard({ deposit }: DepositCardProps) {
  const totalTopUps = deposit.transactions
    .filter((t) => t.type === 'topup')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = deposit.transactions
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-gray-900">Deposit Wallet</h3>
      </div>

      {/* Balance Card */}
      <div className="bg-primary rounded-xl p-5 text-white mb-4">
        <p className="text-sm opacity-80">Current Balance</p>
        <p className="text-3xl font-bold mt-1">{formatVND(deposit.balance)}</p>
        <div className="flex items-center gap-4 mt-3 text-sm opacity-80">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Last top-up: {deposit.lastTopUp}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <ArrowUpCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Total Top-ups</span>
          </div>
          <p className="text-sm font-bold text-emerald-700">{formatVND(totalTopUps)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-red-600 mb-1">
            <ArrowDownCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Total Spent</span>
          </div>
          <p className="text-sm font-bold text-red-700">{formatVND(totalPayments)}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Transactions</h4>
        <div className="space-y-2">
          {deposit.transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.type === 'topup' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {tx.type === 'topup' ? (
                    <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                tx.type === 'topup' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {tx.type === 'topup' ? '+' : '-'}{formatVND(Math.abs(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
