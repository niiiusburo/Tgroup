import type { TFunction } from 'i18next';
import type { FaceCandidate } from '@/lib/api';

interface CustomerCameraCandidateReviewProps {
  readonly t: TFunction<'customers'>;
  readonly candidates: readonly FaceCandidate[];
  readonly onSelect: (candidate: FaceCandidate) => void;
  readonly onCancel: () => void;
}

export function CustomerCameraCandidateReview({
  t,
  candidates,
  onSelect,
  onCancel,
}: CustomerCameraCandidateReviewProps) {
  return (
    <div className="w-full space-y-2">
      <p className="text-[10px] text-gray-500 text-center">
        {t('face.selectMatch', 'Select the correct customer')}
      </p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {candidates.map((c) => (
          <button
            key={c.partnerId}
            type="button"
            onClick={() => onSelect(c)}
            className="w-full flex items-center justify-between px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
            <div className="flex flex-col">
              <span className="font-medium text-gray-800">{c.name}</span>
              <span className="text-xs text-gray-400">{c.code} · {c.phone}</span>
            </div>
            <span className="text-[10px] font-semibold text-orange-500">
              {(c.confidence * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="w-full px-3 py-2 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
        {t('cancel')}
      </button>
    </div>
  );
}
