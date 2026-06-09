import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveCtvRefCode, joinCtv, lookupPublicCtvByPhone, type PublicCtvLookup } from '@/lib/api/ctv';
import { useCtvCreationForm } from '@/components/shared/CtvCreationForm';
import { CtvCreationForm } from '@/components/shared/CtvCreationForm';

/**
 * JoinCtv — public (no login) CTV self-signup page (via ?ref= or manual upline phone).
 * Now uses the shared CtvCreationForm + useCtvCreationForm (mode: 'public-join') for the core identity fields,
 * validation (email optional, password >=6, name/phone/pass required), per-field errors, LOB dental-forced.
 * Page-specific: upline resolution + lookup gate, rootSignupEnabled flag, code vs manual uplinePhone wiring into joinCtv payload.
 *
 * @crossref:used-in[public unauthed /ctv/join landing + any ?book=1 or direct CTV signup CTA]
 * @crossref:uses[shared/CtvCreationForm (SSOT domain for ctv creation), joinCtv (wraps with code/uplinePhone), resolveCtvRefCode + lookupPublicCtvByPhone for referrer gate]
 * @crossref:domain[ctv-creation — the third canonical call site; changes to hook or form propagate here]
 */

/**
 * Public (unauthenticated) CTV self-signup page. A shared referral link
 * (`/ctv/join?ref=CTV-XXXXXX`) pre-resolves the upline; direct landing CTA
 * visits use the final CTV phone field to choose the upline.
 */
export function JoinCtv() {
  const { t } = useTranslation('ctv');
  const [params] = useSearchParams();
  const code = (params.get('ref') || '').trim();
  const rootSignupEnabled =
    import.meta.env.VITE_CTV_PUBLIC_ROOT_SIGNUP === 'true' || import.meta.env.VITE_CTV_PUBLIC_ROOT_SIGNUP === '1';

  const [upline, setUpline] = useState<{ status: 'manual' | 'loading' | 'ok' | 'invalid'; name?: string | null }>({
    status: code ? 'loading' : 'manual',
  });
  const [uplinePhoneInput, setUplinePhoneInput] = useState('');
  const [ctvLookup, setCtvLookup] = useState<{ status: 'idle' | 'checking' | 'done'; result?: PublicCtvLookup }>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const formApi = useCtvCreationForm({
    config: { mode: 'public-join' },
    onSubmit: async (payload) => {
      setError(null);

      const uplinePhone = uplinePhoneInput.trim();
      if (upline.status !== 'ok' && !uplinePhone && !rootSignupEnabled) {
        const msg = t('join.errors.uplineRequired');
        setError(msg);
        throw new Error(msg);
      }
      if (uplinePhone && ctvLookup.status === 'checking') {
        const msg = t('join.errors.uplineVerifying');
        setError(msg);
        throw new Error(msg);
      }
      if (uplinePhone && (ctvLookup.status !== 'done' || !ctvLookup.result?.exists)) {
        const msg = t('join.errors.uplineNotFound');
        setError(msg);
        throw new Error(msg);
      }

      await joinCtv({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || '',
        password: payload.password,
        ...(uplinePhone ? { uplinePhone } : { code }),
      });
    },
  });

  useEffect(() => {
    if (formApi.success) {
      setDone(true);
    }
  }, [formApi.success]);

  useEffect(() => {
    if (!code) {
      setUpline({ status: 'manual' });
      return;
    }
    let cancelled = false;
    resolveCtvRefCode(code)
      .then((r) => {
        if (!cancelled) setUpline(r.ok ? { status: 'ok', name: r.uplineName } : { status: 'invalid' });
      })
      .catch(() => {
        if (!cancelled) setUpline({ status: 'invalid' });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    const uplinePhone = uplinePhoneInput.trim();
    if (uplinePhone.length < 6) {
      setCtvLookup({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setCtvLookup({ status: 'checking' });
    const id = setTimeout(async () => {
      try {
        const result = await lookupPublicCtvByPhone(uplinePhone);
        if (!cancelled) setCtvLookup({ status: 'done', result });
      } catch {
        if (!cancelled) setCtvLookup({ status: 'done', result: { exists: false } });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [uplinePhoneInput]);

  const field = 'w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="mb-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">{t('join.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('join.subtitle')}</p>
          {upline.status === 'ok' ? (
            <p className="mt-1 text-sm text-gray-600">
              {t('join.uplineFromLink', { name: upline.name || t('profileFallback') })}
            </p>
          ) : upline.status === 'manual' ? (
            <p className="mt-1 text-xs text-gray-500">{t('join.uplineManualHint')}</p>
          ) : null}
        </div>

        {upline.status === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('join.checkingLink')}
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" />
            </span>
            <p className="text-sm font-bold text-gray-900">{t('join.successTitle')}</p>
            <p className="text-sm text-gray-600">{t('join.successBody')}</p>
            <a
              href="/login"
              className="mt-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25"
            >
              {t('join.loginCta')}
            </a>
          </div>
        ) : (
          <div className="space-y-3.5">
            {upline.status === 'invalid' ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-700">
                {t('join.invalidLink')}
              </p>
            ) : null}

            <CtvCreationForm
              hookResult={formApi}
              labels={{
                name: t('join.fields.name'),
                phone: t('join.fields.phone'),
                email: t('join.fields.email'),
                password: t('join.fields.password'),
                lobs: t('join.fields.lobs'),
                submit: t('join.fields.submit'),
                submitting: t('join.fields.submitting'),
                emailOptional: t('join.fields.emailOptional'),
              }}
              showLobs={false}
              beforeLobs={
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">{t('join.uplineLabel')}</span>
                  <input
                    className={field}
                    type="tel"
                    placeholder={t('join.uplinePlaceholder')}
                    value={uplinePhoneInput}
                    onChange={(e) => setUplinePhoneInput(e.target.value)}
                  />
                  <JoinCtvPhoneCheck lookup={ctvLookup} />
                  <span className="mt-1 block text-xs text-gray-500">
                    {upline.status === 'ok'
                      ? t('join.uplineHintFromLink')
                      : rootSignupEnabled
                        ? t('join.uplineHintRoot')
                        : t('join.uplineHintRequired')}
                  </span>
                </label>
              }
              submitLabel={t('join.submit')}
              className="space-y-3.5"
            />

            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

function JoinCtvPhoneCheck({
  lookup,
}: {
  readonly lookup: { status: 'idle' | 'checking' | 'done'; result?: PublicCtvLookup };
}) {
  const { t } = useTranslation('ctv');

  if (lookup.status === 'idle') return null;
  if (lookup.status === 'checking') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('join.uplineChecking')}
      </p>
    );
  }
  if (lookup.result?.exists) {
    return (
      <p className="mt-1 text-xs font-semibold text-emerald-600">
        {t('join.uplineValid', { name: lookup.result.name || t('profileFallback') })}
      </p>
    );
  }
  return <p className="mt-1 text-xs font-semibold text-red-600">{t('join.errors.uplineNotFound')}</p>;
}

export default JoinCtv;