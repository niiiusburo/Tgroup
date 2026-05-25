import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  me: { id: string; name: string; email?: string; phone?: string; referral_code?: string } | null;
}

export function CtvMeTab({ me }: Props) {
  const { logout, user } = useAuth();
  const { t } = useTranslation('ctv');
  const [copied, setCopied] = useState(false);

  const displayName = me?.name || user?.name || 'CTV';
  const email = me?.email || user?.email || '—';
  const phone = me?.phone;
  const referralCode = me?.referral_code || 'CTV-' + (me?.id?.slice(0, 6).toUpperCase() || '000000');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  }

  return (
    <div className="pt-2">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 ring-1 ring-gray-100 shadow-sm text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl text-white shadow-lg shadow-orange-500/25 mb-3">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="text-xl font-semibold tracking-tight">{displayName}</div>
        <div className="text-xs text-orange-600 uppercase tracking-[0.15em] font-semibold mt-1">{t('me.ctvPartner')}</div>
        <div className="text-sm text-gray-600 mt-3">{email}</div>
        {phone && <div className="text-sm text-gray-600">{phone}</div>}
      </div>

      {/* Referral Code */}
      <div className="bg-white rounded-3xl ring-1 ring-gray-100 mt-4 p-5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('me.referralCode')}</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm font-mono font-semibold text-gray-800 tracking-wider">
            {referralCode}
          </div>
          <button
            onClick={handleCopy}
            className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition"
            aria-label={t('actions.copy')}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-[11px] text-gray-400 mt-2">{t('me.copyCodeHint')}</div>
        {copied && <div className="text-xs text-emerald-600 font-medium mt-1">{t('actions.copied')}</div>}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-3xl ring-1 ring-gray-100 mt-4 divide-y divide-gray-50 text-sm">
        <div className="flex justify-between items-center px-5 py-3.5">
          <span className="text-gray-600">{t('me.language')}</span>
          <span className="font-medium text-gray-900">VI</span>
        </div>
        <div className="flex justify-between items-center px-5 py-3.5">
          <span className="text-gray-600">{t('me.notifications')}</span>
          <span className="font-medium text-emerald-600">{t('me.on')}</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => { logout(); window.location.href = '/login'; }}
        className="w-full mt-6 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-semibold shadow-lg shadow-orange-500/25 active:opacity-90 active:scale-[0.99] transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> {t('actions.logout')}
      </button>
    </div>
  );
}
