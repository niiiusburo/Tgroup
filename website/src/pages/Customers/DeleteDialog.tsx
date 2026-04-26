import { useTranslation } from 'react-i18next';

interface DeleteDialogProps {
  readonly open: boolean;
  readonly customerId: string | null;
  readonly customerName: string;
  readonly mode: 'soft' | 'hard';
  readonly linkedCounts?: { appointments: number; saleorders: number; dotkhams: number } | null;
  readonly error: string | null;
  readonly loading: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteDialog({
  open, customerName, mode, linkedCounts, error, loading, onCancel, onConfirm,
}: DeleteDialogProps) {
  const { t } = useTranslation('customers');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {mode === 'hard' ? t('xaVnhVin') : t('xaKhchHng')}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          <strong>{mode === 'hard' ? t('xaVnhVin1') : t('xa1')}</strong>
          <strong>{customerName}</strong>?
          {mode === 'soft' && t('softDeleteWarning')}
          {mode === 'hard' && t('hardDeleteWarning')}
        </p>
        {linkedCounts && (linkedCounts.appointments > 0 || linkedCounts.saleorders > 0 || linkedCounts.dotkhams > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            <p className="font-medium mb-1">{t('relatedData')}</p>
            <ul className="list-disc list-inside space-y-0.5">
              {linkedCounts.appointments > 0 && <li>{linkedCounts.appointments}</li>}
              {linkedCounts.saleorders > 0 && <li>{linkedCounts.saleorders}</li>}
              {linkedCounts.dotkhams > 0 && <li>{linkedCounts.dotkhams}</li>}
            </ul>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {t('cancel', 'Hủy')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('loading') : mode === 'hard' ? t('xaVnhVin') : t('xa')}
          </button>
        </div>
      </div>
    </div>
  );
}
