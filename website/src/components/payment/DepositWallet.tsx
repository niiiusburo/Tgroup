/**
 * Deposit Wallet Component - Shows wallet balance and transaction history
 * @crossref:used-in[Payment, CustomerProfile]
 * @crossref:uses[usePayment, mockPayment]
 */

import { useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp } from 'lucide-react';
import type { DepositWalletData } from '@/data/mockPayment';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

interface DepositWalletProps {
  readonly wallet: DepositWalletData;
  readonly onTopUp: (amount: number) => void;
}

export function DepositWallet({ wallet, onTopUp }: DepositWalletProps) {
  const [showTransactions, setShowTransactions] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showTopUpForm, setShowTopUpForm] = useState(false);

  const handleTopUp = () => {
    const amount = Number(topUpAmount);
    if (amount > 0) {
      onTopUp(amount);
      setTopUpAmount('');
      setShowTopUpForm(false);
    }
  };

  const QUICK_AMOUNTS = [2_000_000, 5_000_000, 10_000_000, 20_000_000] as const;

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Wallet header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Deposit Wallet</span>
          </div>
          <span className="text-xs opacity-75">{wallet.customerName}</span>
        </div>
        <p className="text-3xl font-bold">{formatVND(wallet.balance)}</p>
        <p className="text-xs opacity-75 mt-1">
          Last top-up: {wallet.lastTopUp}
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        {!showTopUpForm ? (
          <button
            type="button"
            onClick={() => setShowTopUpForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Top Up Wallet
          </button>
        ) : (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="Enter amount (VND)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTopUpAmount(String(amount))}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {formatVND(amount)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTopUp}
                className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => { setShowTopUpForm(false); setTopUpAmount(''); }}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transaction toggle */}
        <button
          type="button"
          onClick={() => setShowTransactions(!showTransactions)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span>Recent Transactions ({wallet.transactions.length})</span>
          {showTransactions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Transaction list */}
        {showTransactions && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                <div className={`p-1.5 rounded-full ${tx.type === 'topup' ? 'bg-green-100' : tx.type === 'refund' ? 'bg-blue-100' : 'bg-red-100'}`}>
                  {tx.type === 'topup' || tx.type === 'refund' ? (
                    <ArrowDownLeft className={`w-3.5 h-3.5 ${tx.type === 'topup' ? 'text-green-600' : 'text-blue-600'}`} />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
                <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatVND(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
