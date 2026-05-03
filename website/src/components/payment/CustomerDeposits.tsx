import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { VietQrModal } from './VietQrModal';
import type { DepositTransaction, DepositBalance } from '@/hooks/useDeposits';
import {
  CUSTOMER_DEPOSIT_PAGE_SIZE,
  DepositFormModal,
  DepositPagination,
  DepositSummaryCards,
  DepositTransactionsTable,
  UsageHistoryTable,
  type CustomerDepositMethod,
  type CustomerDepositModalMode,
} from './CustomerDepositSections';

interface CustomerDepositsProps {
  depositList: DepositTransaction[];
  usageHistory: DepositTransaction[];
  balance: DepositBalance;
  loading?: boolean;
  onAddDeposit?: (amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date: string, note?: string) => Promise<void>;
  onAddRefund?: (amount: number, method: 'cash' | 'bank_transfer', date: string, note?: string) => Promise<void>;
  onVoidDeposit?: (id: string) => Promise<void>;
  onDeleteDeposit?: (id: string) => Promise<void>;
  onEditDeposit?: (id: string, data: Partial<{amount: number;method: 'cash' | 'bank_transfer';notes: string;paymentDate: string;}>) => Promise<void>;
  onRefresh?: () => void;
}

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
  onRefresh
}: CustomerDepositsProps) {
  const { t } = useTranslation('payment');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'deposits' | 'usage'>('deposits');
  const [modalMode, setModalMode] = useState<CustomerDepositModalMode>(null);
  const [editingTx, setEditingTx] = useState<DepositTransaction | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<CustomerDepositMethod>('cash');
  const { getToday } = useTimezone();
  const [formDate, setFormDate] = useState(getToday);
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showVietQr, setShowVietQr] = useState(false);

  const totalPages = Math.max(1, Math.ceil(depositList.length / CUSTOMER_DEPOSIT_PAGE_SIZE));
  const paged = depositList.slice((page - 1) * CUSTOMER_DEPOSIT_PAGE_SIZE, page * CUSTOMER_DEPOSIT_PAGE_SIZE);
  const startRow = depositList.length === 0 ? 0 : (page - 1) * CUSTOMER_DEPOSIT_PAGE_SIZE + 1;
  const endRow = Math.min(page * CUSTOMER_DEPOSIT_PAGE_SIZE, depositList.length);

  const openModal = (mode: 'deposit' | 'refund') => {
    setFormAmount('');
    setFormMethod('cash');
    setFormDate(getToday());
    setFormNote('');
    setModalMode(mode);
  };

  const openEditModal = (tx: DepositTransaction) => {
    setEditingTx(tx);
    setFormAmount(String(tx.amount));
    setFormMethod(tx.method === 'cash' ? 'cash' : tx.method === 'bank_transfer' ? 'bank_transfer' : 'cash');
    setFormDate(tx.date);
    setFormNote(tx.note || '');
    setModalMode(tx.type === 'refund' ? 'refund' : 'deposit');
  };

  const closeModals = () => {
    setModalMode(null);
    setEditingTx(null);
    setFormAmount('');
    setFormNote('');
  };

  const handleSubmitDeposit = async () => {
    if (!formAmount || !modalMode) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(formAmount);
      if (editingTx && onEditDeposit) {
        await onEditDeposit(editingTx.id, {
          amount: editingTx.type === 'refund' ? -Math.abs(amt) : amt,
          method: formMethod === 'vietqr' ? 'bank_transfer' : formMethod,
          notes: formNote || undefined,
          paymentDate: formDate
        });
      } else if (modalMode === 'refund' && onAddRefund) {
        await onAddRefund(amt, formMethod === 'vietqr' ? 'bank_transfer' : formMethod, formDate, formNote || undefined);
      } else if (modalMode === 'deposit' && onAddDeposit) {
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
    if (!confirm(t('messages.confirmVoidDeposit'))) return;
    try {
      await onVoidDeposit(id);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteDeposit) return;
    if (!confirm(t('messages.confirmDeleteDeposit'))) return;
    try {
      await onDeleteDeposit(id);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <DepositSummaryCards balance={balance} />

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('deposits')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'deposits' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {depositList.length > 0 && <span className="text-xs font-normal text-gray-500 ml-1">({depositList.length})</span>}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('usage')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'usage' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {usageHistory.length > 0 && <span className="text-xs font-normal text-gray-500 ml-1">({usageHistory.length})</span>}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'deposits' && (onAddDeposit || onAddRefund) && (
              <>
                <button
                  onClick={() => openModal('deposit')}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {t('ngTmNg')}
                </button>
                {onAddRefund && (
                  <button
                    onClick={() => openModal('refund')}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {t('honTmNg')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto min-w-0">
          {activeTab === 'deposits' ? (
            <DepositTransactionsTable
              loading={loading}
              paged={paged}
              onEditDeposit={onEditDeposit ? openEditModal : undefined}
              onVoidDeposit={onVoidDeposit ? handleVoid : undefined}
              onDeleteDeposit={onDeleteDeposit ? handleDelete : undefined}
            />
          ) : (
            <UsageHistoryTable loading={loading} usageHistory={usageHistory} />
          )}
        </div>

        {activeTab === 'deposits' && depositList.length > 0 && (
          <DepositPagination
            page={page}
            totalPages={totalPages}
            startRow={startRow}
            endRow={endRow}
            totalRows={depositList.length}
            onPageChange={(updater) => setPage(updater)}
          />
        )}
      </div>

      <DepositFormModal
        modalMode={modalMode}
        editingTx={editingTx}
        formAmount={formAmount}
        formMethod={formMethod}
        formDate={formDate}
        formNote={formNote}
        submitting={submitting}
        onAmountChange={setFormAmount}
        onMethodChange={setFormMethod}
        onDateChange={setFormDate}
        onNoteChange={setFormNote}
        onClose={closeModals}
        onSubmit={handleSubmitDeposit}
        onShowVietQr={() => setShowVietQr(true)}
      />
      <VietQrModal open={showVietQr} onClose={() => setShowVietQr(false)} defaultAmount={formAmount ? Number(formAmount) : undefined} />
    </div>
  );
}
