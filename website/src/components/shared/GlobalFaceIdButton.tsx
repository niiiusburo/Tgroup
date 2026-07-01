import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Loader2, UserCheck, UserX, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { fetchPartners, registerFace } from '@/lib/api';
import type { ApiPartner } from '@/lib/api';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { probeCrossLob, type CrossLobProbeResult } from '@/lib/api/partners';
import { FACE_MATCH_DISMISS_MS } from '@/constants';

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
  const { currentLOB } = useBusinessUnit();
  const { hasPermission } = useAuth();
  const canCrossView = hasPermission('lob.crossview');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCapture, setShowCapture] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);

  // No-match rescue state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPartner[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiPartner | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  // Cross-LOB chooser: set when the recognized customer also exists in the other LOB.
  const [crossLobMatch, setCrossLobMatch] = useState<CrossLobProbeResult | null>(null);

  const { recognizeState, recognize, reset } = useFaceRecognition();

  const dismiss = useCallback(() => {
    setShowPopover(false);
    setCapturedImage(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCustomer(null);
    setRegistering(false);
    setRegisterError(null);
    setCrossLobMatch(null);
    reset();
  }, [reset]);

  const handleCapture = useCallback(
    async (image: Blob) => {
      setRegisterError(null);
      setCrossLobMatch(null);
      const result = await recognize(image);
      setShowCapture(false);
      setShowPopover(true);
      setCapturedImage(image);
      if (result.match) {
        // If the recognized customer also exists in the other LOB, let the employee
        // choose which record to open instead of auto-navigating (lob.crossview only).
        if (canCrossView && result.match.phone) {
          try {
            const probe = await probeCrossLob(result.match.phone, currentLOB);
            if (probe.matched) {
              setCrossLobMatch(probe);
              return;
            }
          } catch {
            /* probe failure is non-fatal: fall through to the normal single-LOB navigate */
          }
        }
        navigate(`/customers/${result.match.partnerId}`);
        setTimeout(dismiss, FACE_MATCH_DISMISS_MS);
      }
    },
    [recognize, navigate, dismiss, canCrossView, currentLOB]
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

  const openInCurrentLob = (partnerId: string) => {
    navigate(`/customers/${partnerId}`);
    dismiss();
  };

  const openInOtherLob = (probe: CrossLobProbeResult) => {
    if (!probe.matched || !probe.otherId || !probe.otherLob) return;
    // ?lob= is read only at provider init, so the other LOB must open in a fresh tab
    // (matches the ProfileHeader cross-LOB badge) — this also preserves the current LOB context.
    window.open(`/customers/${probe.otherId}?lob=${probe.otherLob}`, '_blank', 'noopener,noreferrer');
    dismiss();
  };

  const rescan = () => {
    reset();
    setShowPopover(false);
    setCapturedImage(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCustomer(null);
    setRegisterError(null);
    setCrossLobMatch(null);
    setShowCapture(true);
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
        const res = await fetchPartners({ search: query.trim(), limit: 10, status: 'active', lob: currentLOB });
        setSearchResults(res.items ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [currentLOB]);

  const handleRegisterToCustomer = useCallback(async () => {
    if (!selectedCustomer || !capturedImage) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      await registerFace(selectedCustomer.id, capturedImage, 'no_match_rescue', currentLOB);
      navigate(`/customers/${selectedCustomer.id}`);
      dismiss();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      const message = code === 'SPOOF_DETECTED'
        ? t('faceRecognition.spoofDetected')
        : (err instanceof Error ? err.message : t('faceRecognition.registerFailed'));
      setRegisterError(message);
    } finally {
      setRegistering(false);
    }
  }, [selectedCustomer, capturedImage, navigate, dismiss, t, currentLOB]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        title={t('face.quickScan', 'Quick Face ID') as string}
        aria-label={t('face.quickScan', 'Quick Face ID') as string}
        onClick={() => {
          reset();
          setShowPopover(false);
          setCapturedImage(null);
          setSearchQuery('');
          setSearchResults([]);
          setSelectedCustomer(null);
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

          {recognizeState.status === 'success' && !crossLobMatch?.matched && (
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

          {recognizeState.status === 'success' && crossLobMatch?.matched && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500">
                {t('face.crossLob.prompt', 'This customer exists in both lines of business. Open which record?')}
              </p>
              <button
                type="button"
                onClick={() => openInCurrentLob(recognizeState.match.partnerId)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left text-sm rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100"
              >
                <span className="font-medium text-gray-800 truncate">{recognizeState.match.name}</span>
                <span className="text-[10px] font-semibold uppercase text-orange-600">
                  {t(`face.crossLob.lob.${currentLOB}`, currentLOB)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openInOtherLob(crossLobMatch)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left text-sm rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100"
              >
                <span className="font-medium text-gray-800 truncate">{crossLobMatch.otherName || recognizeState.match.name}</span>
                <span className="text-[10px] font-semibold uppercase text-blue-600">
                  {crossLobMatch.otherLob ? t(`face.crossLob.lob.${crossLobMatch.otherLob}`, crossLobMatch.otherLob) : ''}
                </span>
              </button>
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
                onClick={rescan}
                className="w-full px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-all"
              >
                {t('face.rescan', 'Scan again')}
              </button>
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
                    onClick={handleRegisterToCustomer}
                    disabled={registering}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-all"
                  >
                    {registering && <Loader2 className="w-3 h-3 animate-spin" />}
                    {t('face.registerToCustomer', 'Register face to {name}', {
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
        onCapture={handleCapture}
        onCancel={() => {
          setShowCapture(false);
          setCapturedImage(null);
        }}
      />
    </div>
  );
}
