import {
  ChevronLeft,
  ChevronRight,
  Coins,
  DollarSign,
  Edit2,
  History,
  Loader2,
  QrCode,
  Receipt,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatVND, formatVNDInput } from '@/lib/formatting';
import type { DepositBalance, DepositTransaction } from '@/hooks/useDeposits';

export const CUSTOMER_DEPOSIT_PAGE_SIZE = 20;

export type CustomerDepositModalMode = 'deposit' | 'refund' | null;
export type CustomerDepositMethod = 'cash' | 'bank_transfer' | 'vietqr';

export function formatCustomerDepositDate(dateStr: string): string {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

interface DepositSummaryCardsProps {
  readonly balance: DepositBalance;
}

export function DepositSummaryCards({ balance }: DepositSummaryCardsProps) {
  const { t } = useTranslation('payment');
  const cards = [
    { label: t('tmNgNg'), value: balance.totalDeposited, icon: Wallet, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: t('tmNgCnLi'), value: balance.depositBalance, icon: Coins, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: t('tmNgDng'), value: balance.totalUsed, icon: Receipt, bg: 'bg-rose-50', text: 'text-rose-600' },
    { label: t('tmNgHon'), value: balance.totalRefunded, icon: History, bg: 'bg-amber-50', text: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, bg, text }) => (
        <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${text}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold ${text}`}>{formatVND(value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DepositFormModalProps {
  readonly modalMode: CustomerDepositModalMode;
  readonly editingTx: DepositTransaction | null;
  readonly formAmount: string;
  readonly formMethod: CustomerDepositMethod;
  readonly formDate: string;
  readonly formNote: string;
  readonly submitting: boolean;
  readonly onAmountChange: (value: string) => void;
  readonly onMethodChange: (value: CustomerDepositMethod) => void;
  readonly onDateChange: (value: string) => void;
  readonly onNoteChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly onShowVietQr: () => void;
}

export function DepositFormModal({
  modalMode,
  editingTx,
  formAmount,
  formMethod,
  formDate,
  formNote,
  submitting,
  onAmountChange,
  onMethodChange,
  onDateChange,
  onNoteChange,
  onClose,
  onSubmit,
  onShowVietQr,
}: DepositFormModalProps) {
  const { t } = useTranslation('payment');
  const isRefund = modalMode === 'refund';
  if (!modalMode) return null;
  const title = editingTx ? t('editDeposit') : isRefund ? t('refundDeposit') : t('addDeposit');

  return (
    <div className="modal-container">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="modal-content w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('ngyGiaoDch')}</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-2 text-gray-500">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-600">{t('sTin')}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <CurrencyInput
                  value={formAmount ? Number(formAmount) : null}
                  onChange={(v) => onAmountChange(v === null ? '' : String(v))}
                  placeholder="0"
                  className="w-36"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">{t('quickAmount')}</span>
              {[500000, 1000000, 2000000, 5000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onAmountChange(String(amt))}
                  className="px-3 py-1 text-xs font-medium border rounded-full text-gray-600 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {formatVNDInput(amt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('phngThc')}</label>
            <div className="grid grid-cols-3 gap-2">
              <PaymentMethodButton active={formMethod === 'cash'} onClick={() => onMethodChange('cash')}>
                {t('tinMt')}
              </PaymentMethodButton>
              <PaymentMethodButton active={formMethod === 'bank_transfer'} onClick={() => onMethodChange('bank_transfer')}>
                {t('chuynKhon')}
              </PaymentMethodButton>
              {!isRefund && (
                <PaymentMethodButton active={formMethod === 'vietqr'} onClick={() => onMethodChange('vietqr')}>
                  VietQR
                </PaymentMethodButton>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('ghiChTyChn')}</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={t('enterNote', { ns: 'payment' })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            />
          </div>
        </div>

        {formMethod === 'vietqr' && !isRefund && (
          <button
            type="button"
            onClick={onShowVietQr}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('hy')}
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !formAmount}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingTx ? t('saveChanges') : isRefund ? t('honTmNg') : t('ngTmNg')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

interface DepositTransactionsTableProps {
  readonly loading?: boolean;
  readonly paged: DepositTransaction[];
  readonly onEditDeposit?: (tx: DepositTransaction) => void;
  readonly onVoidDeposit?: (id: string) => void;
  readonly onDeleteDeposit?: (id: string) => void;
}

export function DepositTransactionsTable({
  loading,
  paged,
  onEditDeposit,
  onVoidDeposit,
  onDeleteDeposit,
}: DepositTransactionsTableProps) {
  const { t } = useTranslation('payment');

  return (
    <table className="w-full text-sm min-w-[640px]">
      <thead>
        <tr className="bg-gray-50 text-left">
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sPhiu')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('ngy')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('phngThc')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('loi')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider text-right">{t('sTin')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('trngThi')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider text-right">{t('thaoTc')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {loading ? (
          <tr>
            <td colSpan={7} className="px-2 sm:px-4 py-8 text-center text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </td>
          </tr>
        ) : paged.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-2 sm:px-4 py-8 text-center text-gray-400">
              {t('khngCDLieu')}
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
              <td className="px-2 sm:px-4 py-3 text-gray-600">{formatCustomerDepositDate(tx.date)}</td>
              <td className="px-2 sm:px-4 py-3 text-gray-600">{t(`methods.${tx.method}`, { defaultValue: tx.method })}</td>
              <td className="px-2 sm:px-4 py-3">
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                  tx.type === 'refund' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}
                >
                  {tx.type === 'refund' ? t('refund') : t('deposit')}
                </span>
              </td>
              <td className={`px-2 sm:px-4 py-3 text-right font-medium ${
                tx.type === 'refund' ? 'text-amber-600' : 'text-blue-600'
              }`}
              >
                {tx.type === 'refund' ? '-' : '+'}{formatVND(tx.amount)}
              </td>
              <td className="px-2 sm:px-4 py-3">
                <DepositStatusBadge tx={tx} confirmedLabel={t('confirmed')} cancelledLabel={t('cancelled')} />
              </td>
              <td className="px-2 sm:px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1 sm:gap-2">
                  {onEditDeposit && (
                    <button
                      onClick={() => onEditDeposit(tx)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title={t('sa')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {onVoidDeposit && tx.status !== 'voided' && (
                    <button
                      onClick={() => onVoidDeposit(tx.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title={t('cancel')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {onDeleteDeposit && (
                    <button
                      onClick={() => onDeleteDeposit(tx.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title={t('xa')}
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
  );
}

interface UsageHistoryTableProps {
  readonly loading?: boolean;
  readonly usageHistory: DepositTransaction[];
}

export function UsageHistoryTable({ loading, usageHistory }: UsageHistoryTableProps) {
  const { t } = useTranslation('payment');

  return (
    <table className="w-full text-sm min-w-[480px]">
      <thead>
        <tr className="bg-gray-50 text-left">
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('ngy')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('phngThc')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('ghiCh')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider text-right">{t('sTin')}</th>
          <th className="px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{t('trngThi')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {loading ? (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </td>
          </tr>
        ) : usageHistory.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-2 sm:px-4 py-8 text-center text-gray-400">
              {t('khngCDLieuSDngTmNg')}
            </td>
          </tr>
        ) : (
          usageHistory.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-2 sm:px-4 py-3 text-gray-600">{formatCustomerDepositDate(tx.date)}</td>
              <td className="px-2 sm:px-4 py-3 text-gray-600">{tx.method}</td>
              <td className="px-2 sm:px-4 py-3 text-gray-600">{tx.note || '-'}</td>
              <td className="px-2 sm:px-4 py-3 text-right font-medium text-rose-600">
                -{formatVND(tx.amount)}
              </td>
              <td className="px-2 sm:px-4 py-3">
                <DepositStatusBadge tx={tx} confirmedLabel={t('xcNhn')} cancelledLabel={t('cancel')} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function DepositStatusBadge({
  tx,
  confirmedLabel,
  cancelledLabel,
}: {
  readonly tx: DepositTransaction;
  readonly confirmedLabel: string;
  readonly cancelledLabel: string;
}) {
  const confirmed = tx.status === 'posted' || tx.status === 'confirmed';
  return (
    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
      confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}
    >
      {confirmed ? confirmedLabel : cancelledLabel}
    </span>
  );
}

interface DepositPaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly startRow: number;
  readonly endRow: number;
  readonly totalRows: number;
  readonly onPageChange: (updater: (page: number) => number) => void;
}

export function DepositPagination({
  page,
  totalPages,
  startRow,
  endRow,
  totalRows,
  onPageChange,
}: DepositPaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <select
          value={CUSTOMER_DEPOSIT_PAGE_SIZE}
          disabled
          className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-600"
        >
          <option value={20}>20</option>
        </select>
        <span className="text-xs text-gray-500">
          {startRow}-{endRow}{totalRows}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 text-xs text-gray-600">{page}</span>
        <button
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
