/**
 * CtvDashboard.tsx — Mobile-first 4-tab CTV experience (v2 Phase 3 + orange brand repaint).
 *
 * Repaint 2026-05-21: switched from hardcoded blue/pink hex to the warm
 * orange primary token (#F97316) used everywhere else in the app, per
 * DESIGN.md §"Warm but restrained orange accent system" and
 * MODULE_CONSISTENCY_AUDIT.md §"Orange gradient header" pattern. The
 * dental vs cosmetic split bar still keeps two distinct hues but both
 * sit in the warm spectrum (orange + rose) instead of blue + pink.
 *
 * Bypasses admin Layout/sidebar completely.
 */

import { useEffect, useState } from 'react';
import { Home, Wallet, Users, User, LogOut, Sparkles, Stethoscope, BellRing, ChevronRight, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCtvSummary, fetchCtvReferrals, fetchCtvMe, createCtv, createBooking, type CtvCommissionSummary, type CtvReferral } from '@/lib/api/ctv';

type Tab = 'home' | 'commission' | 'referrals' | 'me';
type CommissionSub = 'pending' | 'paid';

// Warm split: dental = primary orange, cosmetic = warm rose. Both stay
// on-brand; neither cools the palette.
const DENTAL_COLOR = '#F97316'; // primary orange-500
const COSMETIC_COLOR = '#FB7185'; // rose-400 (warm complement)

export function CtvDashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [commissionSub, setCommissionSub] = useState<CommissionSub>('pending');
  const [summary, setSummary] = useState<CtvCommissionSummary | null>(null);
  const [referrals, setReferrals] = useState<CtvReferral[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signup sheet states
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [showCtvSheet, setShowCtvSheet] = useState(false);

  // Client sheet state
  const [clientForm, setClientForm] = useState({ name: '', phone: '', lob: 'dental' as 'dental' | 'cosmetic', date: '' });
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSuccess, setClientSuccess] = useState(false);

  // CTV sheet state
  const [ctvForm, setCtvForm] = useState({ name: '', phone: '', email: '', password: '', lobs: ['dental'] });
  const [ctvLoading, setCtvLoading] = useState(false);
  const [ctvError, setCtvError] = useState<string | null>(null);
  const [ctvSuccess, setCtvSuccess] = useState(false);

  const displayName = me?.name || user?.name || 'CTV';

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, r, m] = await Promise.all([
          fetchCtvSummary(),
          fetchCtvReferrals(),
          fetchCtvMe(),
        ]);
        setSummary(s as any);
        setReferrals((r && (r as any).referrals) || []);
        setMe(m);
      } catch (e: any) {
        console.error('[CtvDashboard] LIVE fetch failed (real cross-DB data path):', e);
        setError(e?.message || 'Failed to load live CTV data from dental + cosmetic DBs.');
        setSummary(null);
        setReferrals([]);
        setMe(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const pending = summary?.totals?.pending || 0;
  const paid = summary?.totals?.paid || 0;
  const dentalP = summary?.totals?.dentalPending || 0;
  const cosP = summary?.totals?.cosmeticPending || 0;
  const totalP = dentalP + cosP || pending;
  const dentalPct = totalP > 0 ? Math.round((dentalP / totalP) * 100) : 62;
  const cosPct = 100 - dentalPct;

  function formatVnd(n: number) {
    return (n || 0).toLocaleString('vi-VN') + ' ₫';
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    if (!clientForm.name.trim() || !clientForm.phone.trim() || !clientForm.date.trim()) {
      setClientError('Name, phone, and date are required');
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
      }, 1500);
    } catch (err: any) {
      // Handle B_CLIENT_CLAIMED error
      if (err?.code === 'B_CLIENT_CLAIMED') {
        const ownerName = err?.body?.owner_name || 'unknown';
        const expiresAt = err?.body?.expires_at ? new Date(err.body.expires_at).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'unknown';
        setClientError(`Khách hàng này đã được đăng ký bởi ${ownerName}. Hết hạn: ${expiresAt}`);
      } else {
        setClientError(err?.message || 'Failed to create booking');
      }
    } finally {
      setClientLoading(false);
    }
  }

  async function handleCtvSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCtvError(null);
    if (!ctvForm.name.trim() || !ctvForm.phone.trim() || !ctvForm.email.trim() || !ctvForm.password.trim()) {
      setCtvError('All fields are required');
      return;
    }
    if (ctvForm.lobs.length === 0) {
      setCtvError('Select at least one LOB');
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
      }, 1500);
    } catch (err: any) {
      setCtvError(err?.message || 'Failed to create CTV');
    } finally {
      setCtvLoading(false);
    }
  }

  function Pill({ lob }: { lob: 'dental' | 'cosmetic' | string }) {
    const isDen = lob === 'dental' || lob === 'den';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
          isDen
            ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
        }`}
      >
        {isDen ? <Stethoscope className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
        {isDen ? 'Dental' : 'Cosmetic'}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-white text-gray-900 pb-24 font-sans">
      {/* Top bar — orange gradient brand header with signup pills */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/20">
        <div className="max-w-md mx-auto px-5 py-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-orange-100/90 font-medium">TG Clinic</div>
              <div className="text-lg font-semibold tracking-tight">CTV Portal</div>
            </div>
            <button
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition"
            >
              <BellRing className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
            </button>
          </div>
          {/* Signup pills row */}
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowClientSheet(true)}
              className="flex-1 py-3.5 px-4 bg-white text-orange-700 font-semibold rounded-2xl shadow-sm hover:bg-white/95 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Client</span>
            </button>
            <button
              onClick={() => setShowCtvSheet(true)}
              className="flex-1 py-3.5 px-4 bg-white/20 text-white font-semibold rounded-2xl ring-1 ring-white/30 hover:bg-white/25 transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ CTV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content per tab */}
      <div className="max-w-md mx-auto px-4 pt-5">
        {loading && (
          <div className="text-center py-16 text-gray-500">
            <div className="mx-auto w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3" />
            Loading your earnings…
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl mb-4 text-sm">
            ⚠️ {error}
            <button onClick={() => window.location.reload()} className="ml-3 underline font-medium">Reload</button>
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && !loading && (
          <>
            <div className="text-2xl font-semibold tracking-tight mb-1">Hi, {displayName} <span className="inline-block animate-[wave_1s_ease-in-out_2]">👋</span></div>
            <div className="text-sm text-gray-600 mb-5">Your referral commissions across dental &amp; cosmetic</div>

            {/* PENDING COMMISSION TILE */}
            <div className="bg-white rounded-3xl shadow-sm shadow-orange-500/5 ring-1 ring-gray-100 p-5 mb-4">
              <div className="uppercase tracking-[0.15em] text-[11px] font-semibold text-orange-600 mb-1">Pending commission</div>
              <div className="text-[2.5rem] leading-none font-bold tabular-nums tracking-tight text-gray-900 mb-4">{formatVnd(pending)}</div>

              {/* Split bar */}
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex mb-3">
                <div style={{ width: `${dentalPct}%`, background: DENTAL_COLOR }} className="h-full transition-all duration-500" />
                <div style={{ width: `${cosPct}%`, background: COSMETIC_COLOR }} className="h-full transition-all duration-500" />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: DENTAL_COLOR }} />
                  <span className="text-gray-600">Dental</span>
                  <span className="font-semibold tabular-nums">{formatVnd(dentalP)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COSMETIC_COLOR }} />
                  <span className="text-gray-600">Cosmetic</span>
                  <span className="font-semibold tabular-nums">{formatVnd(cosP)}</span>
                </div>
              </div>
            </div>

            {/* THIS MONTH */}
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 p-5 mb-4">
              <div className="uppercase tracking-[0.15em] text-[11px] font-semibold text-gray-500 mb-3">This month</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary?.counts?.pending || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Referrals</div>
                </div>
                <div className="border-x border-gray-100">
                  <div className="text-2xl font-bold text-gray-900">{summary?.counts?.paid || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Services</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600 tabular-nums">{formatVnd(paid).replace(/\s+₫$/, '')}</div>
                  <div className="text-xs text-gray-500 mt-1">Paid (₫)</div>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="uppercase tracking-[0.15em] text-[11px] font-semibold text-gray-500">Recent activity</div>
                <button onClick={() => setActiveTab('commission')} className="text-orange-600 text-xs font-semibold flex items-center gap-0.5">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {(summary?.recent || []).slice(0, 5).map((act, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Pill lob={act.lob} />
                      <span className="font-medium truncate">{act.client_name}</span>
                    </div>
                    <div className={`font-semibold tabular-nums shrink-0 ${parseFloat(String(act.amount)) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {parseFloat(String(act.amount)) < 0 ? '' : '+'}{formatVnd(Math.abs(act.amount))}
                    </div>
                  </div>
                ))}
                {(!summary?.recent || summary.recent.length === 0) && (
                  <div className="text-gray-400 text-sm py-4 text-center">No recent activity yet.<br />Refer clients to start earning.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* COMMISSION TAB */}
        {activeTab === 'commission' && !loading && (
          <>
            <div className="text-xl font-semibold tracking-tight mb-4">My Commission</div>

            {/* Segmented control */}
            <div className="inline-flex bg-orange-50 ring-1 ring-orange-100 rounded-full p-1 mb-5">
              <button
                onClick={() => setCommissionSub('pending')}
                className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  commissionSub === 'pending'
                    ? 'bg-white text-orange-700 shadow-sm shadow-orange-500/20'
                    : 'text-orange-600/70 hover:text-orange-700'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setCommissionSub('paid')}
                className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  commissionSub === 'paid'
                    ? 'bg-white text-orange-700 shadow-sm shadow-orange-500/20'
                    : 'text-orange-600/70 hover:text-orange-700'
                }`}
              >
                Paid
              </button>
            </div>

            {commissionSub === 'pending' ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-5 shadow-lg shadow-orange-500/25">
                  <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-orange-100/90">Total pending</div>
                  <div className="text-3xl font-bold tabular-nums mt-1">{formatVnd(pending)}</div>
                  <div className="text-sm text-orange-100/90 mt-1">{summary?.counts?.pending || 0} services across {summary?.pendingList?.length || 0} clients</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2 px-1">By service</div>
                  {(summary?.pendingList || summary?.recent || []).filter(r => r.status === 'pending').map((row: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-2xl p-4 mb-2 ring-1 ring-gray-100 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Pill lob={row.lob} />
                        <span className="font-medium truncate">{row.client_name}</span>
                      </div>
                      <div className="font-semibold tabular-nums shrink-0">{formatVnd(row.amount)}</div>
                    </div>
                  ))}
                  {(!summary?.pendingList || summary.pendingList.length === 0) && <div className="text-gray-400 px-2 py-2 text-sm">No pending commissions.</div>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-3xl p-5 ring-1 ring-gray-100 shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500">Total paid out</div>
                  <div className="text-3xl font-bold tabular-nums text-gray-900 mt-1">{formatVnd(paid)}</div>
                  <div className="text-sm text-gray-500 mt-1">{summary?.counts?.paid || 0} payout cycles</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2 px-1">Payout cycles</div>
                  {(summary?.paidList || []).slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-2xl ring-1 ring-gray-100 mb-2 flex justify-between items-center">
                      <div className="text-sm">2026-0{i+2} <span className="text-emerald-600 font-medium ml-1">· Paid</span></div>
                      <div className="font-semibold tabular-nums">{formatVnd(p.amount)}</div>
                    </div>
                  ))}
                  {(!summary?.paidList || summary.paidList.length === 0) && (
                    <div className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 text-sm text-gray-500">
                      Payout batch history will appear here after admin runs payouts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* REFERRALS TAB */}
        {activeTab === 'referrals' && !loading && (
          <>
            <div className="text-xl font-semibold tracking-tight mb-4">My Referrals</div>
            <div className="space-y-2">
              {referrals.length === 0 && (
                <div className="bg-white rounded-3xl p-6 ring-1 ring-gray-100 text-center">
                  <div className="text-gray-400 text-sm">No referred clients yet.</div>
                </div>
              )}
              {referrals.map((ref, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {ref.lobs.map((l, li) => <Pill key={li} lob={l} />)}
                    <span className="font-semibold ml-auto sm:ml-0">{ref.name}</span>
                  </div>
                  {ref.phone && <div className="text-sm text-gray-500">{ref.phone}</div>}
                  <div className="mt-2 flex justify-between items-center text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        ref.status === 'earning'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      }`}
                    >
                      {ref.status}
                    </span>
                    <span className="text-gray-600">{ref.earned_count} svc · <span className="font-semibold text-gray-900 tabular-nums">{formatVnd(ref.total_earned)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ME TAB */}
        {activeTab === 'me' && !loading && (
          <div className="pt-2">
            <div className="bg-white rounded-3xl p-6 ring-1 ring-gray-100 shadow-sm text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl text-white shadow-lg shadow-orange-500/25 mb-3">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xl font-semibold tracking-tight">{displayName}</div>
              <div className="text-xs text-orange-600 uppercase tracking-[0.15em] font-semibold mt-1">CTV partner</div>
              <div className="text-sm text-gray-600 mt-3">{me?.email || user?.email || '—'}</div>
              {me?.phone && <div className="text-sm text-gray-600">{me.phone}</div>}
            </div>

            <div className="bg-white rounded-3xl ring-1 ring-gray-100 mt-4 divide-y divide-gray-50 text-sm">
              <div className="flex justify-between items-center px-5 py-3.5">
                <span className="text-gray-600">Language</span>
                <span className="font-medium text-gray-900">VI</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3.5">
                <span className="text-gray-600">Notifications</span>
                <span className="font-medium text-emerald-600">On</span>
              </div>
            </div>

            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-semibold shadow-lg shadow-orange-500/25 active:opacity-90 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        )}
      </div>

      {/* CLIENT REFERRAL SHEET */}
      {showClientSheet && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur" onClick={() => setShowClientSheet(false)}>
          <div
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Refer a Client</h2>
              <button onClick={() => setShowClientSheet(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {clientSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-lg font-semibold text-emerald-700">Client referred!</p>
              </div>
            ) : (
              <form onSubmit={handleClientSubmit} className="space-y-4">
                {clientError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                    {clientError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Client name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Appointment Date</label>
                  <input
                    type="date"
                    value={clientForm.date}
                    onChange={(e) => setClientForm({ ...clientForm, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Line of Business</label>
                  <div className="inline-flex bg-gray-100 ring-1 ring-gray-200 rounded-full p-1 w-full">
                    <button
                      type="button"
                      onClick={() => setClientForm({ ...clientForm, lob: 'dental' })}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        clientForm.lob === 'dental'
                          ? 'bg-white text-orange-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Dental
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientForm({ ...clientForm, lob: 'cosmetic' })}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        clientForm.lob === 'cosmetic'
                          ? 'bg-white text-rose-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Cosmetic
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={clientLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.98]"
                >
                  {clientLoading ? 'Submitting…' : 'Refer Client'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CTV SIGNUP SHEET */}
      {showCtvSheet && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur" onClick={() => setShowCtvSheet(false)}>
          <div
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recruit a CTV Partner</h2>
              <button onClick={() => setShowCtvSheet(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {ctvSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-lg font-semibold text-emerald-700">CTV created!</p>
              </div>
            ) : (
              <form onSubmit={handleCtvSubmit} className="space-y-4">
                {ctvError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                    {ctvError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={ctvForm.name}
                    onChange={(e) => setCtvForm({ ...ctvForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={ctvForm.phone}
                    onChange={(e) => setCtvForm({ ...ctvForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={ctvForm.email}
                    onChange={(e) => setCtvForm({ ...ctvForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={ctvForm.password}
                    onChange={(e) => setCtvForm({ ...ctvForm, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Secure password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2.5">Lines of Business</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ctvForm.lobs.includes('dental')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCtvForm({ ...ctvForm, lobs: [...ctvForm.lobs, 'dental'] });
                          } else {
                            setCtvForm({ ...ctvForm, lobs: ctvForm.lobs.filter((l) => l !== 'dental') });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 cursor-pointer"
                      />
                      <span className="text-gray-700">Dental</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ctvForm.lobs.includes('cosmetic')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCtvForm({ ...ctvForm, lobs: [...ctvForm.lobs, 'cosmetic'] });
                          } else {
                            setCtvForm({ ...ctvForm, lobs: ctvForm.lobs.filter((l) => l !== 'cosmetic') });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-rose-500 cursor-pointer"
                      />
                      <span className="text-gray-700">Cosmetic</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ctvLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.98]"
                >
                  {ctvLoading ? 'Creating…' : 'Create CTV Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM NAV — orange active state, rounded pills */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 shadow-[0_-2px_10px_rgba(249,115,22,0.05)]">
        <div className="max-w-md mx-auto flex">
          {[
            { key: 'home', label: 'Home', Icon: Home },
            { key: 'commission', label: 'Comm', Icon: Wallet },
            { key: 'referrals', label: 'Refs', Icon: Users },
            { key: 'me', label: 'Me', Icon: User },
          ].map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as Tab)}
                className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-0.5 text-[11px] transition ${
                  active ? 'text-orange-600' : 'text-gray-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div
                  className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                    active ? 'bg-orange-100' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                </div>
                <span className={active ? 'font-semibold' : 'font-medium'}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default CtvDashboard;
