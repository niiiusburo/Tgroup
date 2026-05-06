import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanFace, CreditCard, X, Check, Loader2, Search, UserCheck } from 'lucide-react';
import type { CustomerFormData } from '@/types/customer';
import type { ApiPartner } from '@/lib/api';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { fetchPartners } from '@/lib/api';

type WidgetMode = 'idle' | 'face-id' | 'quick-add' | 'candidate-review' | 'no-match-rescue';
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
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
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
    setSelectedCustomer(null);
    setSearchResults([]);
    setSearchQuery('');
    reset();
  }, [reset]);

  const handleCapture = useCallback(
    async (imageBlob: Blob) => {
      setShowCaptureModal(false);
      setCaptureState('processing');
      setCapturedImage(imageBlob);
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
          reset();
        }, 400);
      } else if (result.candidates && result.candidates.length > 0) {
        setCaptureState('preview');
        setMode('candidate-review');
      } else {
        setCaptureState('preview');
        setMode('no-match-rescue');
        onFaceIdResult(null, imageBlob);
      }
    },
    [onFaceIdResult, recognize, reset]
  );

  const handleSelectCandidate = useCallback((candidate: { partnerId: string; name: string; code: string; phone: string }) => {
    onFaceIdResult({ name: candidate.name, phone: candidate.phone, ref: candidate.code }, capturedImage ?? undefined);
    setMode('idle');
    setCaptureState('preview');
    setCapturedImage(null);
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
    if (!selectedCustomer || !capturedImage) return;
    setRegistering(true);
    try {
      await register(selectedCustomer.id, capturedImage, 'no_match_rescue');
      onFaceIdResult({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone ?? '',
        ref: selectedCustomer.ref ?? '',
      }, capturedImage);
      setMode('idle');
      setCaptureState('preview');
      setCapturedImage(null);
      setSelectedCustomer(null);
      setSearchResults([]);
      setSearchQuery('');
      reset();
    } catch {
      // error surfaced via registerState
    } finally {
      setRegistering(false);
    }
  }, [selectedCustomer, capturedImage, register, onFaceIdResult, reset]);

  const isProcessing = captureState === 'processing' || recognizeState.status === 'processing';
  const isSuccess = captureState === 'success';
  const isCandidateReview = mode === 'candidate-review';
  const isNoMatchRescue = mode === 'no-match-rescue';

  return (
    <div className="flex flex-col items-center">
      {/* Status indicators */}
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

      {/* Controls */}
      <div className="w-full">
        {mode === 'idle' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startFaceId}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50">
              <ScanFace className="w-7 h-7 text-orange-500" />
              <span>{t('faceId', 'Nhận diện khuôn mặt')}</span>
            </button>
            <button
              type="button"
              onClick={startQuickAdd}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-2 px-3 py-5 text-sm font-semibold text-white bg-primary rounded-2xl hover:bg-primary-dark hover:shadow-sm transition-all disabled:opacity-50">
              <CreditCard className="w-7 h-7" />
              <span>{t('quickAdd', 'Thêm nhanh')}</span>
            </button>
          </div>
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

        {/* Candidate review */}
        {isCandidateReview && recognizeState.status === 'candidates' && (
          <div className="w-full space-y-2">
            <p className="text-[10px] text-gray-500 text-center">{t('face.selectMatch', 'Select the correct customer')}</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recognizeState.candidates.map((c) => (
                <button
                  key={c.partnerId}
                  type="button"
                  onClick={() => handleSelectCandidate(c)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.code} · {c.phone}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-orange-500">{(c.confidence * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={cancel}
              className="w-full px-3 py-2 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              {t('cancel')}
            </button>
          </div>
        )}

        {/* No-match rescue */}
        {isNoMatchRescue && (
          <div className="w-full space-y-2">
            <p className="text-[10px] text-gray-500 text-center">{t('face.searchToRegister', 'Search customer to register this face')}</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchCustomers(e.target.value)}
                placeholder={t('face.searchPlaceholder', 'Name, phone, or code...')}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {searchLoading && <p className="text-[10px] text-gray-400 text-center">{t('loading')}</p>}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedCustomer(p)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-xl border transition-all ${
                    selectedCustomer?.id === p.id
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}>
                  <UserCheck className={`w-3.5 h-3.5 ${selectedCustomer?.id === p.id ? 'text-orange-500' : 'text-gray-400'}`} />
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-xs text-gray-400">{p.ref ?? ''} · {p.phone ?? ''}</span>
                  </div>
                </button>
              ))}
            </div>
            {selectedCustomer && (
              <button
                type="button"
                onClick={handleRegisterToCustomer}
                disabled={registering || registerState.status === 'processing'}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-all">
                {registering && <Loader2 className="w-3 h-3 animate-spin" />}
                {t('face.registerToCustomer', 'Register face to {name}', { name: selectedCustomer.name })}
              </button>
            )}
            {registerState.status === 'error' && (
              <p className="text-[10px] text-red-500 text-center">{registerState.message}</p>
            )}
            <button
              type="button"
              onClick={cancel}
              className="w-full px-3 py-2 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              {t('cancel')}
            </button>
          </div>
        )}
      </div>

      <FaceCaptureModal
        isOpen={showCaptureModal}
        title={t('customerProfile', { ns: 'customers' })}
        onCapture={handleCapture}
        onCancel={() => {
          setShowCaptureModal(false);
          if (mode === 'face-id') setMode('idle');
        }}
      />
    </div>
  );
}
