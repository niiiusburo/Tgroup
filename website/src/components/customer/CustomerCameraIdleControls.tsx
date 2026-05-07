import { CreditCard, ScanFace } from 'lucide-react';
import type { TFunction } from 'i18next';

interface CustomerCameraIdleControlsProps {
  readonly t: TFunction<'customers'>;
  readonly disabled: boolean;
  readonly onFaceId: () => void;
  readonly onQuickAdd: () => void;
}

export function CustomerCameraIdleControls({
  t,
  disabled,
  onFaceId,
  onQuickAdd,
}: CustomerCameraIdleControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onFaceId}
        disabled={disabled}
        className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50">
        <ScanFace className="w-7 h-7 text-orange-500" />
        <span>{t('faceId', 'Nhận diện khuôn mặt')}</span>
      </button>
      <button
        type="button"
        onClick={onQuickAdd}
        disabled={disabled}
        className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-white bg-primary rounded-2xl hover:bg-primary-dark hover:shadow-sm transition-all disabled:opacity-50">
        <CreditCard className="w-7 h-7" />
        <span>{t('quickAdd', 'Thêm nhanh')}</span>
      </button>
    </div>
  );
}
