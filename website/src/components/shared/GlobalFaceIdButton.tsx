import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Loader2, UserCheck, UserX, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { fetchPartners, registerFace } from '@/lib/api';
import type { ApiPartner } from '@/lib/api';

const FACE_RECOGNITION_VERSION_LABEL = 'v0.32.59';

/**
 * Global Face ID quick-search button.
 *
 * Lives in the top header on every page (next to the location filter).
 * Click → opens FaceCaptureModal → captures face → POST /api/face/recognize.
 * - Match: navigate to /customers/:id
 * - Candidates: require a clearer scan instead of exposing identity choices
 * - No match: brief popover, then dismiss
 */
export function GlobalFaceIdButton() {
  const { t } = useTranslation('customers');
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCapture, setShowCapture] = useState(false);
  const [showGuidedRegisterCapture, setShowGuidedRegisterCapture] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [pendingRegisterCustomer, setPendingRegisterCustomer] = useState<ApiPartner | null>(null);

  // No-match rescue state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPartner[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiPartner | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const { recognizeState, recognize, reset } = useFaceRecognition();
  const activeRecognitionVersion =
    'recognitionVersion' in recognizeState && recognizeState.recognitionVersion
      ? recognizeState.recognitionVersion.replace(/^face-recognition-/, 'v')
      : FACE_RECOGNITION_VERSION_LABEL;
  const quickScanLabel = t('face.quickScanWithVersion', {
    version: FACE_RECOGNITION_VERSION_LABEL,
    defaultValue: 'Quick Face ID {{version}}',
  }) as string;

  const clearCaptureState = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCustomer(null);
    setPendingRegisterCustomer(null);
    setRegisterError(null);
  }, []);

  const dismiss = useCallback(() => {
    setShowPopover(false);
    clearCaptureState();
    setRegistering(false);
    reset();
  }, [clearCaptureState, reset]);

  const startCapture = useCallback(() => {
    reset();
    setShowPopover(false);
    setShowGuidedRegisterCapture(false);
    clearCaptureState();
    setShowCapture(true);
  }, [clearCaptureState, reset]);

  const handleCapture = useCallback(
    async (image: Blob) => {
      setRegisterError(null);
      const result = await recognize(image);
      setShowCapture(false);
      setShowPopover(true);
      if (result.match) {
        navigate(`/customers/${result.match.partnerId}`);
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

  const handleSearchCustomers = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedCustomer(null);
    setRegisterError(null);
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

  const handleStartGuidedRegister = useCallback(() => {
    if (!selectedCustomer) return;
    setPendingRegisterCustomer(selectedCustomer);
    setShowPopover(false);
    setShowGuidedRegisterCapture(true);
  }, [selectedCustomer]);

  const handleGuidedRegisterCapture = useCallback(async (image: Blob, images?: readonly Blob[]) => {
    const customer = pendingRegisterCustomer ?? selectedCustomer;
    const imagesToRegister = images?.length ? images : [image];
    if (!customer || imagesToRegister.length === 0) return;

    setRegistering(true);
    setRegisterError(null);
    try {
      for (const imageToRegister of imagesToRegister) {
        await registerFace(customer.id, imageToRegister, 'no_match_rescue');
      }
      setShowGuidedRegisterCapture(false);
      navigate(`/customers/${customer.id}`);
      dismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('faceRecognition.registerFailed');
      setRegisterError(message);
      setShowGuidedRegisterCapture(false);
      setShowPopover(true);
    } finally {
      setRegistering(false);
    }
  }, [pendingRegisterCustomer, selectedCustomer, navigate, dismiss, t]);

  const cancelGuidedRegister = useCallback(() => {
    setShowGuidedRegisterCapture(false);
    setPendingRegisterCustomer(null);
    setShowPopover(true);
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title={quickScanLabel}
          aria-label={quickScanLabel}
          onClick={startCapture}
          className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 shadow-sm hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 transition-colors duration-150"
        >
          <ScanFace className="w-5 h-5" />
        </button>
        <span className="hidden xl:inline-flex flex-col leading-none text-[10px] font-semibold text-orange-600">
          <span>{t('face.versionName', 'Face ID')}</span>
          <span className="font-mono text-[10px] text-orange-500">
            {FACE_RECOGNITION_VERSION_LABEL}
          </span>
        </span>
      </div>

      {showPopover && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-lg p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">
              {t('face.quickScan', 'Quick Face ID')}
            </span>
            <span className="ml-auto mr-2 rounded-full bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-600">
              {activeRecognitionVersion}
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

          {recognizeState.status === 'ambiguous' && (
            <div className="space-y-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-semibold text-amber-800">
                  {t('face.ambiguousTitle', 'Face ID needs a clearer scan')}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-amber-700">
                  {t('face.ambiguousHint', 'Two customer records are too close to choose safely. Rescan with one centered face.')}
                </p>
                {recognizeState.recognitionVersion && (
                  <p className="mt-1 font-mono text-[10px] text-amber-700">
                    {recognizeState.recognitionVersion}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={startCapture}
                className="w-full px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-all"
              >
                {t('face.rescan', 'Scan again')}
              </button>
            </div>
          )}

          {recognizeState.status === 'candidates' && (
            <div className="space-y-2">
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                  <ScanFace className="h-4 w-4" />
                  <span>{t('face.clearerScan', 'Face ID needs a clearer scan')}</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-orange-700/80">
                  {t('face.clearerScanHint', 'The scan is close to more than one customer. Scan again instead of choosing a candidate.')}
                </p>
              </div>
              <p className="text-[11px] text-gray-500">
                {t('face.possibleMatchesHidden', {
                  count: recognizeState.candidates.length,
                  defaultValue: '{{count}} possible matches hidden for safety',
                })}
              </p>
              <button
                type="button"
                onClick={startCapture}
                className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                {t('face.scanAgain', 'Scan again')}
              </button>
            </div>
          )}

          {recognizeState.status === 'no_match' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-1 text-sm text-gray-600">
                <UserX className="w-4 h-4 text-gray-400" />
                <span>{t('face.noMatch', 'No customer matched')}</span>
              </div>

              {/* No-match rescue: search customer to register face */}
              <div className="border-t border-gray-100 pt-2 space-y-2">
                <p className="text-[11px] text-gray-500">
                  {t('face.searchToRegister', 'Search customer to register this face')}
                </p>
                <p className="text-[11px] leading-snug text-orange-700">
                  {t(
                    'face.guidedRegisterHint',
                    'After choosing a customer, capture straight, left, and right angles before saving Face ID.',
                  )}
                </p>
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
                {searchLoading && (
                  <p className="text-[10px] text-gray-400 text-center">{t('loading')}</p>
                )}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(p);
                        setRegisterError(null);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-xl border transition-all ${
                        selectedCustomer?.id === p.id
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <UserCheck
                        className={`w-3.5 h-3.5 ${
                          selectedCustomer?.id === p.id ? 'text-orange-500' : 'text-gray-400'
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-800 truncate">{p.name}</span>
                        <span className="text-xs text-gray-400 truncate">
                          {p.ref ?? ''} · {p.phone ?? ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={handleStartGuidedRegister}
                    disabled={registering}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-all"
                  >
                    {registering && <Loader2 className="w-3 h-3 animate-spin" />}
                    {t('face.startGuidedRegisterToCustomer', 'Start 3-angle scan for {name}', {
                      name: selectedCustomer.name,
                    })}
                  </button>
                )}
                {registerError && (
                  <p className="text-[10px] text-red-500 text-center">{registerError}</p>
                )}
              </div>
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
        versionLabel={FACE_RECOGNITION_VERSION_LABEL}
        onCapture={handleCapture}
        onCancel={() => {
          setShowCapture(false);
        }}
      />

      <FaceCaptureModal
        isOpen={showGuidedRegisterCapture}
        title={t('face.guidedRegisterTitle', '3-angle Face ID registration') as string}
        versionLabel={FACE_RECOGNITION_VERSION_LABEL}
        captureMode="profile"
        onCapture={handleGuidedRegisterCapture}
        onCancel={cancelGuidedRegister}
      />
    </div>
  );
}
