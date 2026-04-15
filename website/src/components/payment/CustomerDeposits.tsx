import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wallet,
  Coins,
  Receipt,
  History,
  Plus,
  Edit2,
  X,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { VietQrModal } from './VietQrModal';
import { formatVND, formatVNDInput } from '@/lib/formatting';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import type { DepositTransaction, DepositBalance } from '@/hooks/useDeposits';

interface CustomerDepositsProps {
  depositList: DepositTransaction[];
  usageHistory: DepositTransaction[];
  balance: DepositBalance;
  loading?: boolean;
  onAddDeposit?: (amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date: string, note?: string) => Promise<void>;
  onAddRefund?: (amount: number, method: 'cash' | 'bank_transfer', date: string, note?: string) => Promise<void>;
  onVoidDeposit?: (id: string) => Promise<void>;
  onDeleteDeposit?: (id: string) => Promise<void>;
  onEditDeposit?: (id: string, data: Partial<{ amount: number; method: 'cash' | 'bank_transfer'; notes: string; paymentDate: string }>) => Promise<void>;
  onRefresh?: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

const PAGE_SIZE = 20;

export function CustomerDeposits({
  depositList,
  usageHistory,
  balance,
  loading,
  onAddDeposit,
  onAddRefund,
  onVoidDeposit,
  onDeleteDeposit,
  onEditDeposit,
  onRefresh,
}: CustomerDepositsProps) {
  const { t } = useTranslation('payment');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'deposits' | 'usage'>('deposits');

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [editingTx, setEditingTx] = useState<DepositTransaction | null>(null);

  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<'cash' | 'bank_transfer' | 'vietqr'>('cash');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showVietQr, setShowVietQr] = useState(false);

  const totalPages = Math.max(1, Math.ceil(depositList.length / PAGE_SIZE));
  const paged = depositList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startRow = depositList.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, depositList.length);

  const openDepositModal = () => {
    setFormAmount('');
    setFormMethod('cash');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNote('');
    setShowDepositModal(true);
  };

  const openRefundModal = () => {
    setFormAmount('');
    setFormMethod('cash');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNote('');
    setShowRefundModal(true);
  };

  const openEditModal = (tx: DepositTransaction) => {
    setEditingTx(tx);
    setFormAmount(String(tx.amount));
    setFormMethod(tx.method === 'Tiền mặt' ? 'cash' : tx.method === 'Chuyển khoản' ? 'bank_transfer' : 'cash');
    setFormDate(tx.date);
    setFormNote(tx.note || '');
    if (tx.type === 'refund') {
      setShowRefundModal(true);
    } else {
      setShowDepositModal(true);
    }
  };

  const closeModals = () => {
    setShowDepositModal(false);
    setShowRefundModal(false);
    setEditingTx(null);
    setFormAmount('');
    setFormNote('');
  };

  const handleSubmitDeposit = async () => {
    if (!formAmount || (!showDepositModal && !showRefundModal)) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(formAmount);
      if (editingTx && onEditDeposit) {
        await onEditDeposit(editingTx.id, {
          amount: editingTx.type === 'refund' ? -Math.abs(amt) : amt,
          method: formMethod === 'vietqr' ? 'bank_transfer' : formMethod,
          notes: formNote || undefined,
          paymentDate: formDate,
        });
      } else if (showRefundModal && onAddRefund) {
        await onAddRefund(amt, formMethod === 'vietqr' ? 'bank_transfer' : formMethod, formDate, formNote || undefined);
      } else if (showDepositModal && onAddDeposit) {
        await onAddDeposit(amt, formMethod, formDate, formNote || undefined);
      }
      closeModals();
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async (id: string) => {
    if (!onVoidDeposit) return;
    if (!confirm('Bạn có chắc muốn hủy phiếu tạm ứng này?')) return;
    try {
      await onVoidDeposit(id);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteDeposit) return;
    if (!confirm('Bạn có chắc muốn xóa phiếu tạm ứng này?')) return;
    try {
      await onDeleteDeposit(id);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  const renderDepositFormModal = (isRefund: boolean) => {
    const isOpen = isRefund ? showRefundModal : showDepositModal;
    if (!isOpen) return null;
    const title = editingTx ? 'Sửa phiếu tạm ứng' : isRefund ? 'Hoàn tạm ứng' : 'Đóng tạm ứng';
    return (
      <div className="modal-container">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModals} />
        <div className="modal-content w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giao dịch</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl">
                <div className="flex items-center gap-2 text-gray-500">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium text-gray-600">Số tiền</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <CurrencyInput
                    value={formAmount ? Number(formAmount) : null}
                    onChange={(v) => setFormAmount(v === null ? '' : String(v))}
                    placeholder="0"
                    className="w-36"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs text-gray-400">Nhanh:</span>
                {[500000, 1000000, 2000000, 5000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFormAmount(String(amt))}
                    className="px-3 py-1 text-xs font-medium border rounded-full text-gray-600 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {formatVNDInput(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormMethod('cash')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formMethod === 'cash'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setFormMethod('bank_transfer')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formMethod === 'bank_transfer'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Chuyển khoản
                </button>
                {!isRefund && (
                  <button
                    type="button"
                    onClick={() => setFormMethod('vietqr')}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formMethod === 'vietqr'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    VietQR
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder={t('enterNote', { ns: 'payment' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {formMethod === 'vietqr' && !isRefund && (
            <button
              type="button"
              onClick={() => setShowVietQr(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Tạo QR
            </button>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={closeModals}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmitDeposit}
              disabled={submitting || !formAmount}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTx ? 'Lưu thay đổi' : isRefund ? 'Hoàn tạm ứng' : 'Đóng tạm ứng'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Tạm ứng đã đóng</p>
            <p className="text-xl font-bold text-blue-600">{formatVND(balance.totalDeposited)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <Coins className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Tạm ứng còn lại</p>
            <p className="text-xl font-bold text-emerald-600">{formatVND(balance.depositBalance)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Tạm ứng đã dùng</p>
            <p className="text-xl font-bold text-rose-600">{formatVND(balance.totalUsed)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <History className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Tạm ứng đã hoàn</p>
            <p className="text-xl font-bold text-amber-600">{formatVND(balance.totalRefunded)}</p>
          </div>
        </div>
      </div>

      {/* Action bar + table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('deposits')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'deposits' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Danh sách tạm ứng
              {depositList.length > 0 && (
                <span className="text-xs font-normal text-gray-500 ml-1">({depositList.length})</span>
              )}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('usage')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'usage' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Lịch sử sử dụng
              {usageHistory.length > 0 && (
                <span className="text-xs font-normal text-gray-500 ml-1">({usageHistory.length})</span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'deposits' && (onAddDeposit || onAddRefund) && (
              <>
                <button
                  onClick={openDepositModal}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Đóng tạm ứng
                </button>
                {onAddRefund && (
                  <button
                    onClick={openRefundModal}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Hoàn tạm ứng
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-w-0">
          {activeTab === 'deposits' ? (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Số phiếu</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Phương thức</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Số tiền</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-2 sm:px-4 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 sm:px-4 py-8 text-center text-gray-400">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  paged.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-3">
                        <div className="flex flex-col">
                          {tx.referenceCode && <span className="text-sm font-medium text-gray-700">{tx.referenceCode}</span>}
                          {!tx.referenceCode && <span className="text-sm font-mono text-gray-700">{tx.receiptNumber || '-'}</span>}
                          {tx.referenceCode && tx.receiptNumber && <span className="text-[10px] font-mono text-gray-400">{tx.receiptNumber}</span>}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-gray-600">{formatDate(tx.date)}</td>
                      <td className="px-2 sm:px-4 py-3 text-gray-600">{tx.method}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                          tx.type === 'refund'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {tx.type === 'refund' ? 'Hoàn' : 'Đóng'}
                        </span>
                      </td>
                      <td className={`px-2 sm:px-4 py-3 text-right font-medium ${
                        tx.type === 'refund' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {tx.type === 'refund' ? '-' : '+'}{formatVND(tx.amount)}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                          tx.status === 'posted' || tx.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.status === 'posted' || tx.status === 'confirmed' ? 'Đã xác nhận' : 'Đã hủy'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {onEditDeposit && (
                            <button
                              onClick={() => openEditModal(tx)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {onVoidDeposit && tx.status !== 'voided' && (
                            <button
                              onClick={() => handleVoid(tx.id)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteDeposit && (
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày giao dịch</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Phương thức</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Số tiền</th>
                  <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : usageHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 sm:px-4 py-8 text-center text-gray-400">
                      Không có dữ liệu sử dụng tạm ứng
                    </td>
                  </tr>
                ) : (
                  usageHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-3 text-gray-600">{formatDate(tx.date)}</td>
                      <td className="px-2 sm:px-4 py-3 text-gray-600">{tx.method}</td>
                      <td className="px-2 sm:px-4 py-3 text-gray-600">{tx.note || '-'}</td>
                      <td className="px-2 sm:px-4 py-3 text-right font-medium text-rose-600">
                        -{formatVND(tx.amount)}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                          tx.status === 'posted' || tx.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.status === 'posted' || tx.status === 'confirmed' ? 'Đã xác nhận' : 'Đã hủy'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {activeTab === 'deposits' && depositList.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <select
                value={PAGE_SIZE}
                disabled
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-600"
              >
                <option value={20}>20</option>
              </select>
              <span className="text-xs text-gray-500">
                {startRow}-{endRow} của {depositList.length} dòng
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs text-gray-600">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {renderDepositFormModal(false)}
      {renderDepositFormModal(true)}
      <VietQrModal open={showVietQr} onClose={() => setShowVietQr(false)} defaultAmount={formAmount ? Number(formAmount) : undefined} />
    </div>
  );
}
