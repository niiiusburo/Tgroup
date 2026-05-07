import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Loader2, UserCheck, UserX, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';

/**
 * Global Face ID quick-search button.
 *
 * Lives in the top header on every page (next to the location filter).
 * Click → opens FaceCaptureModal → captures face → POST /api/face/recognize.
 * - Match: navigate to /customers/:id
 * - Candidates: list options in a popover, each navigates to that customer
 * - No match: brief popover, then dismiss
 */
export function GlobalFaceIdButton() {
  const { t } = useTranslation('customers');
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const { recognizeState, recognize, reset } = useFaceRecognition();

  const dismiss = useCallback(() => {
    setShowPopover(false);
    reset();
  }, [reset]);

  const handleCapture = useCallback(
    async (image: Blob) => {
      setShowCapture(false);
      setShowPopover(true);
      const result = await recognize(image);
      if (result.match) {
        // Auto-match: jump straight to the customer detail page.
        navigate(`/customers/${result.match.partnerId}`);
        // Small delay so the popover briefly confirms the match before dismissing.
        setTimeout(dismiss, 800);
      }
    },
    [recognize, navigate, dismiss]
  );

  // Click-outside to dismiss the popover.
  useEffect(() => {
    if (!showPopover) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showPopover, dismiss]);

  const handlePickCandidate = (partnerId: string) => {
    navigate(`/customers/${partnerId}`);
    dismiss();
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        title={t('face.quickScan', 'Quick Face ID') as string}
        aria-label={t('face.quickScan', 'Quick Face ID') as string}
        onClick={() => {
          reset();
          setShowPopover(false);
          setShowCapture(true);
        }}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 shadow-sm hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 transition-colors duration-150"
      >
        <ScanFace className="w-5 h-5" />
      </button>

      {showPopover && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-lg p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">
              {t('face.quickScan', 'Quick Face ID')}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="dismiss"
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {recognizeState.status === 'processing' && (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('face.quickScanRecognizing', 'Recognizing…')}</span>
            </div>
          )}

          {recognizeState.status === 'success' && (
            <div className="flex items-center gap-2 py-2 text-sm text-emerald-700">
              <UserCheck className="w-4 h-4" />
              <div className="flex flex-col leading-tight">
                <span className="font-medium">{recognizeState.match.name}</span>
                <span className="text-[11px] text-gray-500">
                  {recognizeState.match.code}
                  {recognizeState.match.phone ? ` · ${recognizeState.match.phone}` : ''}
                </span>
              </div>
            </div>
          )}

          {recognizeState.status === 'candidates' && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500">
                {t('face.possibleMatches', 'Possible matches')}
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {recognizeState.candidates.map((c) => (
                  <button
                    key={c.partnerId}
                    type="button"
                    onClick={() => handlePickCandidate(c.partnerId)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-gray-800 truncate">{c.name}</span>
                      <span className="text-[11px] text-gray-500 truncate">
                        {c.code}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-orange-500">
                      {(c.confidence * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recognizeState.status === 'no_match' && (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-600">
              <UserX className="w-4 h-4 text-gray-400" />
              <span>{t('face.noMatch', 'No customer matched')}</span>
            </div>
          )}

          {recognizeState.status === 'error' && (
            <div className="py-2 text-sm text-red-600">{recognizeState.message}</div>
          )}
        </div>
      )}

      <FaceCaptureModal
        isOpen={showCapture}
        title={t('face.quickScan', 'Quick Face ID') as string}
        onCapture={handleCapture}
        onCancel={() => setShowCapture(false)}
      />
    </div>
  );
}
