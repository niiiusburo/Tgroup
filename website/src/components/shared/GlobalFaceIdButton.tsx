import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Loader2, UserCheck, UserX, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { fetchPartners, registerFace } from '@/lib/api';
import type { ApiPartner } from '@/lib/api';
import type { FaceCaptureMode } from './faceCaptureProfile';

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
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCapture, setShowCapture] = useState(false);
  const [captureMode, setCaptureMode] = useState<FaceCaptureMode>('single');
  const [showPopover, setShowPopover] = useState(false);

  // No-match rescue state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPartner[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiPartner | null>(null);
  const [enrollmentCustomer, setEnrollmentCustomer] = useState<ApiPartner | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const { recognizeState, recognize, reset } = useFaceRecognition();

  const dismiss = useCallback(() => {
    setShowPopover(false);
    setCaptureMode('single');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCustomer(null);
    setEnrollmentCustomer(null);
    setRegistering(false);
    setRegisterError(null);
    reset();
  }, [reset]);

  const handleGuidedEnrollmentCapture = useCallback(
    async (image: Blob, images?: readonly Blob[]) => {
      const customer = enrollmentCustomer ?? selectedCustomer;
      if (!customer) {
        setShowCapture(false);
        setShowPopover(true);
        setCaptureMode('single');
        return;
      }

      const samples = images?.length ? images : [image];
      setShowCapture(false);
      setShowPopover(true);
      setRegistering(true);
      setRegisterError(null);

      try {
        for (const sample of samples) {
          await registerFace(customer.id, sample, 'no_match_rescue');
        }
        navigate(`/customers/${customer.id}`);
        dismiss();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('faceRecognition.registerFailed');
        setRegisterError(message);
      } finally {
        setRegistering(false);
        setCaptureMode('single');
        setEnrollmentCustomer(null);
      }
    },
    [dismiss, enrollmentCustomer, navigate, selectedCustomer, t]
  );

  const handleCapture = useCallback(
    async (image: Blob, images?: readonly Blob[]) => {
      if (captureMode === 'profile') {
        await handleGuidedEnrollmentCapture(image, images);
        return;
      }

      setShowCapture(false);
      setShowPopover(true);
      setRegisterError(null);
      const result = await recognize(image);
      if (result.match) {
        // Auto-match: jump straight to the customer detail page.
        navigate(`/customers/${result.match.partnerId}`);
        // Small delay so the popover briefly confirms the match before dismissing.
        setTimeout(dismiss, 800);
      }
    },
    [captureMode, handleGuidedEnrollmentCapture, recognize, navigate, dismiss]
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

  const handleStartGuidedEnrollment = useCallback(() => {
    if (!selectedCustomer) return;
    setEnrollmentCustomer(selectedCustomer);
    setCaptureMode('profile');
    setShowPopover(false);
    setShowCapture(true);
    setRegisterError(null);
  }, [selectedCustomer]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        title={t('face.quickScan', 'Quick Face ID') as string}
        aria-label={t('face.quickScan', 'Quick Face ID') as string}
        onClick={() => {
          reset();
          setCaptureMode('single');
          setShowPopover(false);
          setSearchQuery('');
          setSearchResults([]);
          setSelectedCustomer(null);
          setEnrollmentCustomer(null);
          setRegisterError(null);
          setShowCapture(true);
        }}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 shadow-sm hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 transition-colors duration-150"
      >
        <ScanFace className="w-5 h-5" />
      </button>

      {showPopover && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-lg p-3 z-50">
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
                <p className="text-[11px] leading-snug text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-2">
                  {t(
                    'face.guidedEnrollHint',
                    'Not enough face data yet. Ask the customer to look straight, then turn left and right.',
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
                    onClick={handleStartGuidedEnrollment}
                    disabled={registering}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-all"
                  >
                    {registering && <Loader2 className="w-3 h-3 animate-spin" />}
                    {t('face.captureMoreAnglesForCustomer', 'Capture 3 face angles for {{name}}', {
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
        title={
          captureMode === 'profile'
            ? t('face.guidedEnrollTitle', 'Capture more face angles') as string
            : t('face.quickScan', 'Quick Face ID') as string
        }
        captureMode={captureMode}
        onCapture={handleCapture}
        onCancel={() => {
          setShowCapture(false);
          if (captureMode === 'profile') setShowPopover(true);
          setCaptureMode('single');
          setEnrollmentCustomer(null);
        }}
      />
    </div>
  );
}
