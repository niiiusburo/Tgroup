/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/investor route in App.tsx]
 * @crossref:uses[fetchInvestorClients, InvestorAuthContext]
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Loader2, LogOut } from 'lucide-react';
import { useInvestorAuth } from '@/contexts/InvestorAuthContext';
import { fetchInvestorClients, type InvestorClient } from '@/lib/api/investor';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

export function InvestorDashboard() {
  const { t } = useTranslation('investor');
  const { investor, logout, isAuthenticated, isLoading: authLoading } = useInvestorAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<InvestorClient[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/investor/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    fetchInvestorClients()
      .then((res) => {
        setClients(res.items);
        setTotalItems(res.totalItems);
      })
      .catch(() => setError(t('dashboard.errors.fetchFailed')))
      .finally(() => setLoading(false));
  }, [isAuthenticated, t]);

  function handleLogout() {
    logout();
    navigate('/investor/login', { replace: true });
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{t('dashboard.title')}</h1>
              <p className="text-sm text-slate-500">
                {investor?.investor_name || investor?.email}
                {' · '}
                {t(`dashboard.lob.${investor?.lob || 'dental'}`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            {t('dashboard.signOut')}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-8">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-700">
            <p className="font-medium">{error}</p>
            <p className="text-sm mt-1">{t('dashboard.errors.retryHint')}</p>
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
            <p className="text-lg font-medium text-slate-800">{t('dashboard.empty.title')}</p>
            <p className="text-sm text-slate-500 mt-2">{t('dashboard.empty.message')}</p>
          </div>
        )}

        {!loading && !error && clients.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
              {t('dashboard.clientCount', { count: totalItems })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('dashboard.columns.name')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('dashboard.columns.gender')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('dashboard.columns.appointments')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('dashboard.columns.orders')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('dashboard.columns.deposit')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('dashboard.columns.outstanding')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('dashboard.columns.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
                      <td className="px-4 py-3 text-slate-600">{client.gender || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.appointment_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.order_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(client.deposit_balance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(client.outstanding_balance)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t(`dashboard.status.${client.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}