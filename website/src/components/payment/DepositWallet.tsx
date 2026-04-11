import { useState } from 'react';
import { Wallet, Plus, Loader2, QrCode, DollarSign } from 'lucide-react';
import { VietQrModal } from './VietQrModal';

interface DepositWalletProps {
  depositBalance: number;
  outstandingBalance: number;
  onAddDeposit?: (amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date: string, note?: string) => Promise<void>;
  loading?: boolean;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function DepositWallet({ 
  depositBalance, 
  outstandingBalance,
  onAddDeposit,
  loading = false 
}: DepositWalletProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addMethod, setAddMethod] = useState<'cash' | 'bank_transfer' | 'vietqr'>('cash');
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addNote, setAddNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showVietQr, setShowVietQr] = useState(false);

  const handleAddDeposit = async () => {
    if (!onAddDeposit || !addAmount) return;
    
    setSubmitting(true);
    try {
      await onAddDeposit(parseFloat(addAmount), addMethod, addDate, addNote || undefined);
      setShowAddModal(false);
      setAddAmount('');
      setAddNote('');
    } catch (error) {
      console.error('Failed to add deposit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Deposit Wallet</h3>
        </div>
        {onAddDeposit && (
          <button
            onClick={() => setShowAddModal(true)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Deposit
          </button>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <p className="text-xs text-emerald-600 mb-1">Available Balance</p>
          <p className="text-xl font-bold text-emerald-700">
            {formatVND(depositBalance)} đ
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <p className="text-xs text-red-600 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-700">
            {formatVND(outstandingBalance)} đ
          </p>
        </div>
      </div>

      {/* Add Deposit Modal */}
      {showAddModal && (
        <div className="modal-container">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="modal-content w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Deposit</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giao dịch</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-gray-500">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm font-medium text-gray-600">Tổng thanh toán</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="0"
                      className="w-36 text-right text-2xl font-bold text-orange-600 bg-transparent border-b border-orange-300 focus:outline-none focus:border-orange-500 placeholder:text-orange-300"
                    />
                    <span className="text-sm font-semibold text-orange-600">₫</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400">Nhanh:</span>
                  {(outstandingBalance > 0
                    ? [outstandingBalance, 500000, 1000000, 2000000, 5000000, 10000000]
                    : [500000, 1000000, 2000000, 5000000, 10000000]
                  )
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map((amt) => {
                      const isInstallment = amt === outstandingBalance;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAddAmount(String(amt))}
                          className={`px-3 py-1 text-xs font-medium border rounded-full transition-colors ${
                            isInstallment
                              ? 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100'
                              : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          title={isInstallment ? 'Số tiền nợ hiện tại' : undefined}
                        >
                          {isInstallment ? 'Thanh toán nợ ' : ''}{formatVND(amt)} ₫
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddMethod('cash')}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      addMethod === 'cash'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMethod('bank_transfer')}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      addMethod === 'bank_transfer'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMethod('vietqr')}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      addMethod === 'vietqr'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    VietQR
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Add a note"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {addMethod === 'vietqr' && (
              <button
                type="button"
                onClick={() => setShowVietQr(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                Tạo QR
              </button>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDeposit}
                disabled={submitting || !addAmount}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Deposit
              </button>
            </div>
          </div>
        </div>
      )}
      <VietQrModal open={showVietQr} onClose={() => setShowVietQr(false)} defaultAmount={addAmount ? Number(addAmount) : undefined} />
    </div>
  );
}
