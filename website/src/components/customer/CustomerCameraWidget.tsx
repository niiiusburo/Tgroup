import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanFace, CreditCard, X, Check, Loader2 } from 'lucide-react';
import type { CustomerFormData } from '@/types/customer';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';

type WidgetMode = 'idle' | 'face-id' | 'quick-add';
type CaptureState = 'preview' | 'processing' | 'success';

interface CustomerCameraWidgetProps {
  readonly onQuickAddResult: (fields: Partial<CustomerFormData>) => void;
  readonly onFaceIdResult: (fields: Partial<CustomerFormData> | null, imageBlob?: Blob) => void;
  readonly disabled?: boolean;
}

const MOCK_QUICK_ADD_DATA: Partial<CustomerFormData> = {
  name: 'NGUYỄN VĂN A',
  gender: 'male',
  birthday: 15,
  birthmonth: 6,
  birthyear: 1990,
  identitynumber: '079199000123',
  street: '123 Nguyễn Huệ',
  cityname: 'Hồ Chí Minh',
  districtname: 'Quận 1',
  wardname: 'Phường Bến Nghé',
  phone: '0901234567'
};

export function CustomerCameraWidget({
  onQuickAddResult,
  onFaceIdResult,
  disabled = false
}: CustomerCameraWidgetProps) {
  const { t } = useTranslation('customers');
  const [mode, setMode] = useState<WidgetMode>('idle');
  const [captureState, setCaptureState] = useState<CaptureState>('preview');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const { recognizeState, recognize, reset } = useFaceRecognition();

  const startFaceId = useCallback(() => {
    reset();
    setCaptureState('preview');
    setMode('face-id');
    setShowCaptureModal(true);
  }, [reset]);

  const startQuickAdd = useCallback(() => {
    // Retain original quick-add UX (fully mocked)
    setCaptureState('processing');
    setMode('quick-add');
    setTimeout(() => {
      setCaptureState('success');
      setTimeout(() => {
        onQuickAddResult(MOCK_QUICK_ADD_DATA);
        setMode('idle');
        setCaptureState('preview');
      }, 400);
    }, 1200);
  }, [onQuickAddResult]);

  const cancel = useCallback(() => {
    setMode('idle');
    setCaptureState('preview');
    setShowCaptureModal(false);
    reset();
  }, [reset]);

  const handleCapture = useCallback(
    async (imageBlob: Blob) => {
      setShowCaptureModal(false);
      setCaptureState('processing');
      const result = await recognize(imageBlob);
      if (result.match) {
        setCaptureState('success');
        setTimeout(() => {
          onFaceIdResult(result.match, imageBlob);
          setMode('idle');
          setCaptureState('preview');
          reset();
        }, 400);
      } else {
        setCaptureState('preview');
        onFaceIdResult(null, imageBlob);
        // stay in face-id mode so the no-match UI remains visible
      }
    },
    [onFaceIdResult, recognize, reset]
  );

  const isProcessing = captureState === 'processing' || recognizeState.status === 'processing';
  const isSuccess = captureState === 'success';
  const isNoMatch = mode === 'face-id' && captureState === 'preview' && recognizeState.status === 'no_match';

  return (
    <div className="flex flex-col items-center">
      {/* Status indicators */}
      {(isProcessing || isSuccess || isNoMatch) &&
      <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-3">
          {isProcessing ?
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div> :
        isSuccess ?
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div> :
        isNoMatch ?
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className="text-[10px] text-gray-500"></span>
            </div> :
        null}
        </div>
      }

      {/* Controls */}
      <div className="w-full">
        {!isNoMatch ?
        // Normal / processing / success controls
        <div className="w-full">
            {showCaptureModal ? null : mode === 'idle' ?
          <div className="grid grid-cols-2 gap-3">
                <button
              type="button"
              onClick={startFaceId}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50">
              
                  <ScanFace className="w-7 h-7 text-orange-500" />
                  <span>Face ID</span>
                </button>
                <button
              type="button"
              onClick={startQuickAdd}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-white bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl hover:from-orange-600 hover:to-orange-500 hover:shadow-sm transition-all disabled:opacity-50">
              
                  <CreditCard className="w-7 h-7" />
                  <span>Quick Add</span>
                </button>
              </div> :

          <div className="flex items-center justify-center gap-2">
                {mode === 'face-id' &&
            <>
                    <span className="text-xs text-gray-500">
                      {isProcessing ? t("angXL") : isSuccess ? t("thnhCng") : t("angChp")}
                    </span>
                    <button
                type="button"
                onClick={cancel}
                disabled={isProcessing || isSuccess}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50">
                
                      <X className="w-3.5 h-3.5" />

              </button>
                  </>
            }
              </div>
          }
          </div> :

        // No-match UI
        <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-gray-500 text-center">No face recognized</p>
            <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
            
              <X className="w-3.5 h-3.5" />

          </button>
          </div>
        }
      </div>

      <FaceCaptureModal
        isOpen={showCaptureModal}
        title={t('customerProfile', { ns: 'customers' })}
        onCapture={handleCapture}
        onCancel={() => {
          setShowCaptureModal(false);
          if (mode === 'face-id') setMode('idle');
        }} />
      
    </div>);

}