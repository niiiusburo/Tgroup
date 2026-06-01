import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, LogOut } from 'lucide-react';

import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import type { CtvProfile } from '@/lib/api/ctv';

interface CtvMeTabProps {
  readonly profile: CtvProfile | null;
}

export function CtvMeTab({ profile }: CtvMeTabProps) {
  const { logout, user } = useAuth();
  const { t } = useTranslation('ctv');
  const [copied, setCopied] = useState(false);
  const displayName = profile?.name || user?.name || t('profileFallback');
  const email = profile?.email || user?.email || '-';
  const phone = profile?.phone;
  const referralSource = profile?.id || user?.id || '000000';
  const referralCode = `CTV-${referralSource.slice(0, 6).toUpperCase()}`;
  // Shareable self-signup link: whoever opens it registers as a CTV UNDER this person.
  const joinLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/ctv/join?ref=${referralCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-500 text-3xl font-bold text-white shadow-lg shadow-orange-500/25">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-gray-900">{displayName}</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-orange-600">{t('me.ctvPartner')}</p>
        <p className="mt-3 text-sm text-gray-600">{email}</p>
        {phone ? <p className="text-sm text-gray-600">{phone}</p> : null}
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('me.referralCode')}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-xl bg-gray-50 px-4 py-3 font-mono text-sm font-semibold tracking-wider text-gray-800">
            {referralCode}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100"
            aria-label={t('actions.copy')}
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">{t('me.copyCodeHint')}</p>
        {copied ? <p className="mt-1 text-xs font-medium text-emerald-600">{t('actions.copied')}</p> : null}
      </section>

      <section className="mt-4 divide-y divide-gray-50 rounded-3xl bg-white text-sm shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-gray-600">{t('me.language')}</span>
          <LanguageToggle compact menuPlacement="below" />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-gray-600">{t('me.notifications')}</span>
          <span className="font-medium text-emerald-600">{t('me.on')}</span>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          logout();
          window.location.href = '/login';
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" />
        {t('actions.logout')}
      </button>
    </div>
  );
}
