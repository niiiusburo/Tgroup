import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home, Wallet, ListChecks, Users, User, Sparkles,
  BellRing, UserPlus, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchCtvSummary, fetchCtvReferrals, fetchCtvMe,
  fetchCtvClientJourneys, createCtv, createBooking,
  type CtvCommissionSummary, type CtvReferral, type CtvClientJourney,
} from '@/lib/api/ctv';
import { CtvHomeTab } from './tabs/CtvHomeTab';
import { CtvCommissionTab } from './tabs/CtvCommissionTab';
import { CtvTrackingTab } from './tabs/CtvTrackingTab';
import { CtvReferralsTab } from './tabs/CtvReferralsTab';
import { CtvMeTab } from './tabs/CtvMeTab';

type TabKey = 'home' | 'commission' | 'tracking' | 'referrals' | 'me';

const TABS: { key: TabKey; labelKey: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', labelKey: 'tabs.home', Icon: Home },
  { key: 'commission', labelKey: 'tabs.commission', Icon: Wallet },
  { key: 'tracking', labelKey: 'tabs.tracking', Icon: ListChecks },
  { key: 'referrals', labelKey: 'tabs.referrals', Icon: Users },
  { key: 'me', labelKey: 'tabs.me', Icon: User },
];

export default function CtvDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation('ctv');
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const [summary, setSummary] = useState<CtvCommissionSummary | null>(null);
  const [referrals, setReferrals] = useState<CtvReferral[]>([]);
  const [clients, setClients] = useState<CtvClientJourney[]>([]);
  const [me, setMe] = useState<{ id: string; name: string; email?: string; phone?: string; referral_code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sheet states
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [showCtvSheet, setShowCtvSheet] = useState(false);

  // Client form
  const [clientForm, setClientForm] = useState({ name: '', phone: '', lob: 'dental' as 'dental' | 'cosmetic', date: '' });
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSuccess, setClientSuccess] = useState(false);

  // CTV form
  const [ctvForm, setCtvForm] = useState({ name: '', phone: '', email: '', password: '', lobs: ['dental'] as string[] });
  const [ctvLoading, setCtvLoading] = useState(false);
  const [ctvError, setCtvError] = useState<string | null>(null);
  const [ctvSuccess, setCtvSuccess] = useState(false);

  const displayName = me?.name || user?.name || 'CTV';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, c, m] = await Promise.all([
        fetchCtvSummary(),
        fetchCtvReferrals(),
        fetchCtvClientJourneys().catch(() => ({ clients: [] })),
        fetchCtvMe(),
      ]);
      setSummary(s);
      setReferrals((r && (r as any).referrals) || []);
      setClients(c.clients || []);
      setMe(m);
    } catch (e: any) {
      console.error('[CtvDashboard] load failed:', e);
      setError(e?.message || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    if (!clientForm.name.trim() || !clientForm.phone.trim() || !clientForm.date.trim()) {
      setClientError(t('forms.referClient.required'));
      return;
    }
    setClientLoading(true);
    try {
      await createBooking({ name: clientForm.name, phone: clientForm.phone, lob: clientForm.lob, date: clientForm.date });
      setClientSuccess(true);
      setClientForm({ name: '', phone: '', lob: 'dental', date: '' });
      setTimeout(() => {
        setShowClientSheet(false);
        setClientSuccess(false);
        loadData();
      }, 1500);
    } catch (err: any) {
      if (err?.code === 'B_CLIENT_CLAIMED') {
        const structuredError = err?.body?.error || err?.body || {};
        const ownerName = structuredError.owner_name || structuredError.ownerName || 'unknown';
        const expiresAtValue = structuredError.expires_at || structuredError.expiresAt;
        const expiresAt = expiresAtValue
          ? new Date(expiresAtValue).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
          : 'unknown';
        setClientError(t('forms.referClient.errorClaimed', { owner: ownerName, expires: expiresAt }));
      } else {
        setClientError(err?.message || t('errors.generic'));
      }
    } finally {
      setClientLoading(false);
    }
  }

  async function handleCtvSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCtvError(null);
    if (!ctvForm.name.trim() || !ctvForm.phone.trim() || !ctvForm.email.trim() || !ctvForm.password.trim()) {
      setCtvError(t('forms.referClient.required'));
      return;
    }
    if (ctvForm.lobs.length === 0) {
      setCtvError(t('forms.recruitCtv.selectOne'));
      return;
    }
    setCtvLoading(true);
    try {
      await createCtv({ name: ctvForm.name, phone: ctvForm.phone, email: ctvForm.email, password: ctvForm.password, lob_scope: ctvForm.lobs });
      setCtvSuccess(true);
      setCtvForm({ name: '', phone: '', email: '', password: '', lobs: ['dental'] });
      setTimeout(() => {
        setShowCtvSheet(false);
        setCtvSuccess(false);
        loadData();
      }, 1500);
    } catch (err: any) {
      setCtvError(err?.message || t('errors.generic'));
    } finally {
      setCtvLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-white text-gray-900 pb-24 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/20">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-orange-100/90 font-medium">{t('header.brand')}</div>
              <div className="text-lg font-semibold tracking-tight">{t('header.title')}</div>
            </div>
            <button
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition"
            >
              <BellRing className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowClientSheet(true)}
              className="flex-1 py-3.5 px-4 bg-white text-orange-700 font-semibold rounded-2xl shadow-sm hover:bg-white/95 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('actions.referClient')}</span>
            </button>
            <button
              onClick={() => setShowCtvSheet(true)}
              className="flex-1 py-3.5 px-4 bg-white/20 text-white font-semibold rounded-2xl ring-1 ring-white/30 hover:bg-white/25 transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('actions.recruitCtv')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pt-5">
        {loading && activeTab !== 'tracking' && (
          <div className="text-center py-16 text-gray-500">
            <div className="mx-auto w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3" />
            {t('common:app.loading')}
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl mb-4 text-sm">
            ⚠️ {error}
            <button onClick={() => loadData()} className="ml-3 underline font-medium">{t('actions.reload')}</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'home' && <CtvHomeTab summary={summary} displayName={displayName} />}
            {activeTab === 'commission' && <CtvCommissionTab summary={summary} />}
            {activeTab === 'tracking' && (
              <CtvTrackingTab
                clients={clients}
                referrals={referrals}
                loading={loading}
                onReferClient={() => setShowClientSheet(true)}
              />
            )}
            {activeTab === 'referrals' && <CtvReferralsTab referrals={referrals} />}
            {activeTab === 'me' && <CtvMeTab me={me} />}
          </>
        )}
      </div>

      {/* Client Referral Sheet */}
      {showClientSheet && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur" onClick={() => setShowClientSheet(false)}>
          <div
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('forms.referClient.title')}</h2>
              <button onClick={() => setShowClientSheet(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {clientSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <span className="text-2xl text-emerald-600">✓</span>
                </div>
                <p className="text-lg font-semibold text-emerald-700">{t('forms.referClient.success')}</p>
              </div>
            ) : (
              <form onSubmit={handleClientSubmit} className="space-y-4">
                {clientError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{clientError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.referClient.name')}</label>
                  <input
                    type="text" value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={t('forms.referClient.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.referClient.phone')}</label>
                  <input
                    type="tel" value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={t('forms.referClient.phonePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.referClient.date')}</label>
                  <input
                    type="date" value={clientForm.date}
                    onChange={(e) => setClientForm({ ...clientForm, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.referClient.lob')}</label>
                  <div className="inline-flex bg-gray-100 ring-1 ring-gray-200 rounded-full p-1 w-full">
                    <button
                      type="button"
                      onClick={() => setClientForm({ ...clientForm, lob: 'dental' })}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        clientForm.lob === 'dental' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('forms.referClient.dental')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientForm({ ...clientForm, lob: 'cosmetic' })}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        clientForm.lob === 'cosmetic' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('forms.referClient.cosmetic')}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={clientLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.98]"
                >
                  {clientLoading ? t('forms.referClient.submitting') : t('forms.referClient.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CTV Signup Sheet */}
      {showCtvSheet && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur" onClick={() => setShowCtvSheet(false)}>
          <div
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('forms.recruitCtv.title')}</h2>
              <button onClick={() => setShowCtvSheet(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {ctvSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <span className="text-2xl text-emerald-600">✓</span>
                </div>
                <p className="text-lg font-semibold text-emerald-700">{t('forms.recruitCtv.success')}</p>
              </div>
            ) : (
              <form onSubmit={handleCtvSubmit} className="space-y-4">
                {ctvError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{ctvError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.recruitCtv.name')}</label>
                  <input type="text" value={ctvForm.name} onChange={(e) => setCtvForm({ ...ctvForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.recruitCtv.phone')}</label>
                  <input type="tel" value={ctvForm.phone} onChange={(e) => setCtvForm({ ...ctvForm, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.recruitCtv.email')}</label>
                  <input type="email" value={ctvForm.email} onChange={(e) => setCtvForm({ ...ctvForm, email: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('forms.recruitCtv.password')}</label>
                  <input type="password" value={ctvForm.password} onChange={(e) => setCtvForm({ ...ctvForm, password: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2.5">{t('forms.recruitCtv.lobs')}</label>
                  <div className="space-y-2">
                    {['dental', 'cosmetic'].map((lob) => (
                      <label key={lob} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ctvForm.lobs.includes(lob)}
                          onChange={(e) => {
                            if (e.target.checked) setCtvForm({ ...ctvForm, lobs: [...ctvForm.lobs, lob] });
                            else setCtvForm({ ...ctvForm, lobs: ctvForm.lobs.filter((l) => l !== lob) });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-700 capitalize">{lob}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={ctvLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.98]"
                >
                  {ctvLoading ? t('forms.recruitCtv.submitting') : t('forms.recruitCtv.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 shadow-[0_-2px_10px_rgba(249,115,22,0.05)]">
        <div className="max-w-md mx-auto flex">
          {TABS.map(({ key, labelKey, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-0.5 text-[11px] transition ${active ? 'text-orange-600' : 'text-gray-400'}`}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${active ? 'bg-orange-100' : ''}`}>
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                </div>
                <span className={active ? 'font-semibold' : 'font-medium'}>{t(labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
