import { useState, useRef, useCallback, useEffect } from 'react';
import { ScanFace, CreditCard, X, Check, Loader2, UserCheck, ScanLine } from 'lucide-react';
import type { CustomerFormData } from '@/types/customer';

type WidgetMode = 'idle' | 'face-id' | 'quick-add';
type CaptureState = 'preview' | 'processing' | 'success';

interface CustomerCameraWidgetProps {
  readonly onQuickAddResult: (fields: Partial<CustomerFormData>) => void;
  readonly onFaceIdResult: (fields: Partial<CustomerFormData> | null) => void;
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
  phone: '0901234567',
};

const MOCK_FACE_ID_MATCH: Partial<CustomerFormData> = {
  name: 'TRẦN THỊ B',
  gender: 'female',
  birthday: 22,
  birthmonth: 3,
  birthyear: 1988,
  identitynumber: '079188000456',
  street: '45 Lê Lợi',
  cityname: 'Hồ Chí Minh',
  districtname: 'Quận 3',
  wardname: 'Phường Võ Thị Sáu',
  phone: '0909876543',
  photoUrl: 'https://i.pravatar.cc/150?u=faceid-match',
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function CustomerCameraWidget({
  onQuickAddResult,
  onFaceIdResult,
  disabled = false,
}: CustomerCameraWidgetProps) {
  const [mode, setMode] = useState<WidgetMode>('idle');
  const [captureState, setCaptureState] = useState<CaptureState>('preview');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (targetMode: Exclude<WidgetMode, 'idle'>) => {
    setError(null);
    setCaptureState('preview');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode(targetMode);
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng cấp quyền.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMode('idle');
    setCaptureState('preview');
    setError(null);
  }, []);

  const handleCapture = useCallback(() => {
    if (captureState !== 'preview') return;
    setCaptureState('processing');

    // Mock delay for UX validation
    setTimeout(() => {
      setCaptureState('success');
      setTimeout(() => {
        if (mode === 'quick-add') {
          onQuickAddResult(MOCK_QUICK_ADD_DATA);
        } else if (mode === 'face-id') {
          // Toggle between match and no-match for UX testing
          const hasMatch = Math.random() > 0.3;
          onFaceIdResult(hasMatch ? MOCK_FACE_ID_MATCH : null);
        }
        stopCamera();
      }, 400);
    }, 1200);
  }, [captureState, mode, onQuickAddResult, onFaceIdResult, stopCamera]);

  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
    };
  }, []);

  const isActive = mode !== 'idle';
  const isProcessing = captureState === 'processing';
  const isSuccess = captureState === 'success';

  return (
    <div className="flex flex-col items-center">
      {/* Camera Preview — only shown when active */}
      {isActive && (
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay frame */}
          {mode === 'quick-add' && !isProcessing && !isSuccess && (
            <div className="absolute inset-0 p-3">
              <div className="w-full h-full border-2 border-white/80 rounded-lg relative">
                <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-orange-500 rounded-tl-md" />
                <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-orange-500 rounded-tr-md" />
                <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-orange-500 rounded-bl-md" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-orange-500 rounded-br-md" />
              </div>
            </div>
          )}
          {mode === 'face-id' && !isProcessing && !isSuccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-24 border-2 border-white/80 rounded-[50%]" />
            </div>
          )}
          {(isProcessing || isSuccess) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Check className="w-8 h-8 text-emerald-400" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-3 w-full">
        {error && (
          <p className="text-[10px] text-red-500 text-center mb-2 leading-tight">{error}</p>
        )}

        {!isActive ? (
          // Idle state: two large module buttons
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => startCamera('face-id')}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50"
            >
              <ScanFace className="w-7 h-7 text-orange-500" />
              <span>Face ID</span>
            </button>
            <button
              type="button"
              onClick={() => startCamera('quick-add')}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-white bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl hover:from-orange-600 hover:to-orange-500 hover:shadow-sm transition-all disabled:opacity-50"
            >
              <CreditCard className="w-7 h-7" />
              <span>Quick Add</span>
            </button>
          </div>
        ) : (
          // Active state: capture + cancel
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleCapture}
              disabled={isProcessing || isSuccess}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-lg hover:from-emerald-600 hover:to-emerald-500 transition-all disabled:opacity-50"
            >
              {mode === 'face-id' ? (
                <UserCheck className="w-3.5 h-3.5" />
              ) : (
                <ScanLine className="w-3.5 h-3.5" />
              )}
              {isProcessing ? 'Đang xử lý...' : mode === 'face-id' ? 'Nhận diện' : 'Quét'}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={isProcessing || isSuccess}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
