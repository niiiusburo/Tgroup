import { useTranslation } from 'react-i18next';
import type { CustomerService } from '@/types/customer';

interface DeleteServiceDialogProps {
  readonly service: CustomerService | null;
  readonly isDeleting: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteServiceDialog({
  service,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteServiceDialogProps) {
  const { t } = useTranslation('services');
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('deleteTreatment')}</h3>
        <p className="mb-3 text-sm font-medium text-gray-900">{service.service}</p>
        <p className="mb-4 text-sm text-gray-600">
          {t('deleteTreatmentWarning')}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            {t('cancel', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label={t('confirmDeleteTreatment')}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? t('deletingTreatment') : t('confirmDeleteTreatment')}
          </button>
        </div>
      </div>
    </div>
  );
}
