import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Loader2 } from 'lucide-react';
import type { ApiPartner } from '@/lib/api';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { fetchPartners } from '@/lib/api';
import { CustomerCameraCandidateReview } from './CustomerCameraCandidateReview';
import { CustomerCameraIdleControls } from './CustomerCameraIdleControls';
import { CustomerCameraNoMatchRescue } from './CustomerCameraNoMatchRescue';
import type { CustomerCameraWidgetProps } from './CustomerCameraWidget.types';
import { MOCK_QUICK_ADD_DATA } from './customerCameraMockData';

type WidgetMode = 'idle' | 'face-id' | 'quick-add' | 'candidate-review' | 'no-match-rescue';
type CaptureState = 'preview' | 'processing' | 'success';

export function CustomerCameraWidget({
  onQuickAddResult,
  onFaceIdResult,
  disabled = false
}: CustomerCameraWidgetProps) {
  const { t } = useTranslation('customers');
  const [mode, setMode] = useState<WidgetMode>('idle');
  const [captureState, setCaptureState] = useState<CaptureState>('preview');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [capturedImages, setCapturedImages] = useState<readonly Blob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPartner[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiPartner | null>(null);
  const [registering, setRegistering] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { recognizeState, registerState, recognize, register, reset } = useFaceRecognition();

  const startFaceId = useCallback(() => {
    reset();
    setCaptureState('preview');
    setMode('face-id');
    setShowCaptureModal(true);
    setCapturedImage(null);
    setCapturedImages([]);
    setSelectedCustomer(null);
    setSearchResults([]);
    setSearchQuery('');
  }, [reset]);

  const startQuickAdd = useCallback(() => {
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
    setCapturedImage(null);
    setCapturedImages([]);
    setSelectedCustomer(null);
    setSearchResults([]);
    setSearchQuery('');
    reset();
  }, [reset]);

  const handleCapture = useCallback(
    async (imageBlob: Blob, imageBlobs?: readonly Blob[]) => {
      const profileImages = imageBlobs?.length ? imageBlobs : [imageBlob];
      setShowCaptureModal(false);
      setCaptureState('processing');
      setCapturedImage(imageBlob);
      setCapturedImages(profileImages);
      const result = await recognize(imageBlob);

      if (result.match) {
        const match = result.match;
        setCaptureState('success');
        setTimeout(() => {
          onFaceIdResult({
            name: match.name,
            phone: match.phone,
            ref: match.code,
          }, imageBlob);
          setMode('idle');
          setCaptureState('preview');
          setCapturedImage(null);
          setCapturedImages([]);
          reset();
        }, 400);
      } else if (result.candidates && result.candidates.length > 0) {
        setCaptureState('preview');
        setMode('candidate-review');
      } else {
        setCaptureState('preview');
        setMode('no-match-rescue');
        onFaceIdResult(null, imageBlob, profileImages);
      }
    },
    [onFaceIdResult, recognize, reset]
  );

  const handleSelectCandidate = useCallback((candidate: { partnerId: string; name: string; code: string; phone: string }) => {
    onFaceIdResult({ name: candidate.name, phone: candidate.phone, ref: candidate.code }, capturedImage ?? undefined);
    setMode('idle');
    setCaptureState('preview');
    setCapturedImage(null);
    setCapturedImages([]);
    reset();
  }, [onFaceIdResult, capturedImage, reset]);

  const handleSearchCustomers = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedCustomer(null);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetchPartners({ search: query.trim(), limit: 10, status: 'active' });
        setSearchResults(res.items ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const handleRegisterToCustomer = useCallback(async () => {
    const imagesToRegister = capturedImages.length ? capturedImages : capturedImage ? [capturedImage] : [];
    if (!selectedCustomer || imagesToRegister.length === 0) return;
    setRegistering(true);
    try {
      for (const image of imagesToRegister) {
        await register(selectedCustomer.id, image, 'no_match_rescue');
      }
      onFaceIdResult({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone ?? '',
        ref: selectedCustomer.ref ?? '',
      }, imagesToRegister[0], imagesToRegister);
      setMode('idle');
      setCaptureState('preview');
      setCapturedImage(null);
      setCapturedImages([]);
      setSelectedCustomer(null);
      setSearchResults([]);
      setSearchQuery('');
      reset();
    } catch {
      // error surfaced via registerState
    } finally {
      setRegistering(false);
    }
  }, [selectedCustomer, capturedImage, capturedImages, register, onFaceIdResult, reset]);

  const isProcessing = captureState === 'processing' || recognizeState.status === 'processing';
  const isSuccess = captureState === 'success';
  const isCandidateReview = mode === 'candidate-review';
  const isNoMatchRescue = mode === 'no-match-rescue';

  return (
    <div className="flex flex-col items-center">
      {(isProcessing || isSuccess || isCandidateReview || isNoMatchRescue) && (
        <div className="relative w-28 h-28 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-3">
          {isProcessing ? (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : isSuccess ? (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
          ) : isCandidateReview ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className="text-[10px] text-gray-500">{t('face.possibleMatches', 'Possible matches')}</span>
            </div>
          ) : isNoMatchRescue ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className="text-[10px] text-gray-500">{t('face.noMatch', 'No match found')}</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="w-full">
        {mode === 'idle' && (
          <CustomerCameraIdleControls
            t={t}
            disabled={disabled}
            onFaceId={startFaceId}
            onQuickAdd={startQuickAdd}
          />
        )}

        {mode === 'face-id' && !isProcessing && !isSuccess && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500">{t('angChp')}</span>
            <button
              type="button"
              onClick={cancel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isCandidateReview && recognizeState.status === 'candidates' && (
          <CustomerCameraCandidateReview
            t={t}
            candidates={recognizeState.candidates}
            onSelect={handleSelectCandidate}
            onCancel={cancel}
          />
        )}

        {isNoMatchRescue && (
          <CustomerCameraNoMatchRescue
            t={t}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            selectedCustomer={selectedCustomer}
            registering={registering}
            registerProcessing={registerState.status === 'processing'}
            registerError={registerState.status === 'error' ? registerState.message : undefined}
            onSearch={handleSearchCustomers}
            onSelectCustomer={setSelectedCustomer}
            onRegister={handleRegisterToCustomer}
            onCancel={cancel}
          />
        )}
      </div>

      <FaceCaptureModal
        isOpen={showCaptureModal}
        title={t('customerProfile', { ns: 'customers' })}
        captureMode="profile"
        onCapture={handleCapture}
        onCancel={() => {
          setShowCaptureModal(false);
          setCapturedImages([]);
          if (mode === 'face-id') setMode('idle');
        }}
      />
    </div>
  );
}
