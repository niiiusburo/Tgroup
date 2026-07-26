import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sourceLockMessageKey, type SourceLockState } from '@/lib/saleOrderSourceLock';

export interface ServiceSourceOption {
  readonly id: string;
  readonly name: string;
}

interface ServiceSourceFieldProps {
  readonly sources: readonly ServiceSourceOption[];
  readonly sourceId: string | null;
  readonly onChange: (next: string | null) => void;
  readonly lock: SourceLockState;
  readonly error?: string;
}

export function ServiceSourceField({
  sources,
  sourceId,
  onChange,
  lock,
  error,
}: ServiceSourceFieldProps) {
  const { t } = useTranslation('services');
  const locked = lock.locked;
  const lockHint = lock.locked ? t(sourceLockMessageKey(lock)) : '';

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
        <FileText className="h-3.5 w-3.5" />
        {t('form.orderSource', 'Nguồn đơn hàng')}
      </label>
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => {
          const isSelected = sourceId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              aria-disabled={locked}
              title={locked ? lockHint : undefined}
              onClick={() => {
                if (locked) return;
                onChange(isSelected ? null : s.id);
              }}
              className={`
                rounded-full border px-3 py-1.5 text-sm font-medium transition-all
                ${locked ? 'cursor-not-allowed opacity-60' : ''}
                ${isSelected
                  ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600'}
              `}
            >
              {s.name}
            </button>
          );
        })}
      </div>
      {locked && (
        <p className="mt-1.5 text-xs text-amber-700" role="status">
          {lockHint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
