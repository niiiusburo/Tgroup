/**
 * @crossref:domain[ctv]
 * @crossref:route[path="/verify-discount"]
 * @crossref:used-in[NK3 staff QR discount verification — scanned from CTV voucher; routed page (/verify-discount): website/src/App.tsx (lazy)]
 * @crossref:uses[product-map/domains/ctv.yaml, website/src/lib/api/discountCodes.ts (backend api/src/routes/discountCodes.js), website/src/lib/api/core.ts (ApiError), website/src/contexts/AuthContext.tsx]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Info, Loader2, LogOut, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/core';
import {
  lookupDiscountClient,
  lookupDiscountCode,
  verifyDiscountCode,
  type DiscountClientLookup,
  type DiscountCodeLookup,
  type DiscountCodeLob,
} from '@/lib/api/discountCodes';
import { cn } from '@/lib/utils';

function AuthLoading() {
  const { t } = useTranslation('common');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
        <span className="text-sm text-gray-500">{t('loading')}</span>
      </div>
    </div>
  );
}

function CtvLogoutGate({ returnTo }: { readonly returnTo: string }) {
  const { t } = useTranslation('verifyDiscount');
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-amber-50 via-orange-50 to-yellow-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-orange-200 bg-white/90 p-6 shadow-xl backdrop-blur-sm">
        <p className="text-center text-4xl">🔐</p>
        <h1 className="mt-3 text-center text-xl font-bold text-gray-900">{t('ctvGateTitle')}</h1>
        <p className="mt-2 text-center text-sm leading-6 text-gray-600">{t('ctvGateBody')}</p>
        {user?.name ? (
          <p className="mt-3 text-center text-xs text-gray-500">
            {t('ctvGateSignedInAs', { name: user.name })}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-sm font-bold text-white"
        >
          <LogOut className="h-4 w-4" />
          {t('ctvGateLogout')}
        </button>
      </div>
    </div>
  );
}

function lobLabel(lob: DiscountCodeLob, t: (key: string) => string): string {
  return lob === 'cosmetic' ? t('lobCosmetic') : t('lobDental');
}

function ClientPhoneCheck({
  lookup,
  lobLabelText,
  t,
}: {
  readonly lookup: { status: 'idle' | 'checking' | 'done'; result?: DiscountClientLookup };
  readonly lobLabelText: string;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (lookup.status === 'idle') return null;
  if (lookup.status === 'checking') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('checking', { lob: lobLabelText })}
      </p>
    );
  }
  const r = lookup.result;
  if (!r) return null;
  if (!r.exists) {
    return <p className="mt-1.5 text-xs font-medium text-emerald-600">{t('checkNew', { lob: lobLabelText })}</p>;
  }
  if (r.claimed) {
    return (
      <p className="mt-1.5 text-xs font-bold text-amber-600">
        {t('checkClaimed', { lob: lobLabelText, owner: r.ownerName || '—' })}
      </p>
    );
  }
  if (r.claimedByMe) {
    return (
      <p className="mt-1.5 text-xs font-medium text-orange-600">
        {t('checkYours', { lob: lobLabelText, name: r.name || '' })}
      </p>
    );
  }
  const serviceHint = r.hasService ? t('checkHasService', { lob: lobLabelText }) : t('checkNoService', { lob: lobLabelText });
  return (
    <p className="mt-1.5 text-xs font-medium text-sky-600">
      {t('checkExists', { lob: lobLabelText, name: r.name || '' })} {serviceHint}
    </p>
  );
}

function StaffVerifyFlow({ code }: { readonly code: string }) {
  const { t } = useTranslation('verifyDiscount');
  const [lookup, setLookup] = useState<DiscountCodeLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(Boolean(code));
  const [phone, setPhone] = useState('');
  const [customerLob, setCustomerLob] = useState<DiscountCodeLob>('dental');
  const [customerName, setCustomerName] = useState('');
  const [clientLookup, setClientLookup] = useState<{
    status: 'idle' | 'checking' | 'done';
    result?: DiscountClientLookup;
  }>({ status: 'idle' });
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!code) {
      setLookup(null);
      setLookupLoading(false);
      return;
    }
    let cancelled = false;
    setLookupLoading(true);
    void lookupDiscountCode(code)
      .then((data) => {
        if (!cancelled) setLookup(data);
      })
      .catch(() => {
        if (!cancelled) setLookup({ found: false, code, message: t('lookupError') });
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  useEffect(() => {
    const trimmed = phone.trim();
    if (!lookup?.valid || trimmed.length < 6) {
      setClientLookup({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setClientLookup({ status: 'checking' });
    const id = window.setTimeout(() => {
      void lookupDiscountClient(trimmed, customerLob, code)
        .then((r) => {
          if (cancelled) return;
          setClientLookup({ status: 'done', result: r });
          const existingName = r.exists && !r.claimed ? r.name?.trim() : '';
          if (existingName) {
            setCustomerName((current) => (current.trim() ? current : existingName));
          }
        })
        .catch(() => {
          if (!cancelled) setClientLookup({ status: 'idle' });
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [phone, customerLob, code, lookup?.valid]);

  const lobLabelText = lobLabel(customerLob, t);

  const canVerify = useMemo(() => {
    if (!code || !lookup?.valid || phone.trim().length < 9) return false;
    if (clientLookup.status === 'checking') return false;
    if (clientLookup.result?.claimed) return false;
    if (lookup.status === 'checked_in') return true;
    if (clientLookup.result?.exists) return true;
    return customerName.trim().length >= 2;
  }, [clientLookup, code, customerName, lookup, phone]);

  const isCheckedIn = lookup?.status === 'checked_in';

  const handleVerify = useCallback(async () => {
    if (!canVerify) return;
    setVerifying(true);
    setResult(null);
    const trimmedPhone = phone.trim();
    const existing = clientLookup.result;
    try {
      const res = await verifyDiscountCode({
        code,
        customerPartnerId: existing?.exists ? existing.clientId : undefined,
        customerLob,
        customerPhone: trimmedPhone,
        customerName: existing?.name || customerName.trim() || undefined,
        createIfMissing: !existing?.exists,
        markAsUsed: isCheckedIn,
      });
      setResult({ ok: true, message: res.message || t('verifySuccess') });
      setLookup((prev) =>
        prev ? { ...prev, valid: false, status: 'used', message: res.message } : prev
      );
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.code === 'B_CLIENT_CLAIMED') {
        const owner =
          (apiErr.body as { error?: { ownerName?: string } })?.error?.ownerName || '—';
        setResult({ ok: false, message: t('errorClaimed', { owner }) });
      } else if (apiErr?.code === 'VALIDATION' && isCheckedIn) {
        // Backend asks to mark as used; retry automatically once
        try {
          const res = await verifyDiscountCode({
            code,
            customerPartnerId: existing?.exists ? existing.clientId : undefined,
            customerLob,
            customerPhone: trimmedPhone,
            customerName: existing?.name || customerName.trim() || undefined,
            createIfMissing: !existing?.exists,
            markAsUsed: true,
          });
          setResult({ ok: true, message: res.message || t('verifySuccess') });
          setLookup((prev) =>
            prev ? { ...prev, valid: false, status: 'used', message: res.message } : prev
          );
        } catch (retryErr: unknown) {
          const msg = retryErr instanceof Error ? retryErr.message : t('verifyFailed');
          setResult({ ok: false, message: msg });
        }
      } else {
        const message = err instanceof Error ? err.message : t('verifyFailed');
        setResult({ ok: false, message });
      }
    } finally {
      setVerifying(false);
    }
  }, [canVerify, clientLookup.result, code, customerLob, customerName, phone, t, isCheckedIn]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-amber-50 via-orange-50 to-yellow-50 px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('pageTitle')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('pageSubtitle')}</p>
        </div>

        {lookupLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div
            className={cn(
              'mb-5 rounded-2xl border-2 bg-white p-5 shadow-sm',
              lookup?.valid ? 'border-teal-400' : 'border-red-300'
            )}
          >
            <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {t('codeLabel')}
            </p>
            <p className="mt-1 text-center font-mono text-3xl font-bold tracking-wider text-gray-900">
              {code || '—'}
            </p>
            {lookup?.discountLabel ? (
              <p className="mt-2 text-center text-lg font-bold text-red-600">{lookup.discountLabel}</p>
            ) : null}
            {lookup?.ctvName ? (
              <p className="mt-1 text-center text-sm text-gray-600">
                {t('ctvLabel', { name: lookup.ctvName })}
              </p>
            ) : null}
            {lookup?.status === 'checked_in' ? (
              <p className="mt-2 text-center text-sm font-bold text-blue-600">
                {t('statusCheckedIn')}
              </p>
            ) : null}
            {lookup?.message ? (
              <p
                className={cn(
                  'mt-3 text-center text-sm',
                  lookup.valid ? 'text-teal-700' : 'text-red-600'
                )}
              >
                {lookup.message}
              </p>
            ) : null}
          </div>
        )}

        {lookup?.valid ? (
          <div className="space-y-4 rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-800">{t('lobLabel')}</label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
                {(['dental', 'cosmetic'] as const).map((lob) => (
                  <button
                    key={lob}
                    type="button"
                    onClick={() => {
                      setCustomerLob(lob);
                      setResult(null);
                    }}
                    className={cn(
                      'rounded-lg py-2 text-sm font-bold transition-colors',
                      customerLob === lob
                        ? lob === 'dental'
                          ? 'bg-white text-orange-700 shadow-sm'
                          : 'bg-white text-rose-700 shadow-sm'
                        : 'text-gray-600'
                    )}
                  >
                    {lobLabel(lob, t)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2.5 text-orange-800 ring-1 ring-orange-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">{t('phoneFirstNotice')}</p>
            </div>

            <div>
              <label htmlFor="verify-phone" className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Phone className="h-4 w-4 text-teal-600" />
                {t('phoneLabel')}
              </label>
              <input
                id="verify-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setResult(null);
                }}
                placeholder={t('phonePlaceholder')}
                className="mt-3 h-11 w-full rounded-xl border border-gray-200 px-3 font-mono text-sm outline-none focus:border-teal-400"
              />
              <ClientPhoneCheck lookup={clientLookup} lobLabelText={lobLabelText} t={t} />
            </div>

            {clientLookup.result && !clientLookup.result.exists ? (
              <div>
                <label htmlFor="verify-name" className="block text-sm font-semibold text-gray-800">
                  {t('clientNameLabel')}
                </label>
                <input
                  id="verify-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('clientNamePlaceholder')}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-teal-400"
                />
              </div>
            ) : null}

            <button
              type="button"
              disabled={!canVerify || verifying}
              onClick={() => void handleVerify()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 text-sm font-bold text-white disabled:opacity-50"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {verifying ? t('verifying') : isCheckedIn ? t('confirmComplete') : t('confirmVerify')}
            </button>
          </div>
        ) : null}

        {result ? (
          <div
            className={cn(
              'mt-4 rounded-2xl border-2 p-5 text-center',
              result.ok ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'
            )}
          >
            <p className={cn('text-lg font-bold', result.ok ? 'text-green-700' : 'text-red-700')}>
              {result.ok ? t('doneTitle') : t('errorTitle')}
            </p>
            <p className="mt-1 text-sm text-gray-700">{result.message}</p>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-gray-500">
          <Link to="/" className="font-semibold text-orange-600 hover:underline">
            {t('backToDashboard')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyDiscount() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  const returnTo = `${location.pathname}${location.search}`;
  const isCtv = user?.is_ctv === true || user?.isCtv === true;

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  if (isCtv) return <CtvLogoutGate returnTo={returnTo} />;
  if (!code) {
    return <Navigate to="/" replace />;
  }

  return <StaffVerifyFlow code={code} />;
}