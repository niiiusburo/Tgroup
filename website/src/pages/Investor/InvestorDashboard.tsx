/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/investor route in App.tsx]
 * @crossref:uses[fetchInvestorPortfolio, InvestorAuthContext]
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Briefcase, CalendarDays, Download, Loader2, LogOut, Users, Wallet } from 'lucide-react';
import { useInvestorAuth } from '@/contexts/InvestorAuthContext';
import { fetchInvestorPortfolio, type InvestorPortfolioResponse } from '@/lib/api/investor';
import { formatVND as formatCurrency } from '@/lib/formatting';
import { InvestorPortfolioTables } from './InvestorPortfolioTables';
import { downloadInvestorPortfolioCsv } from './investorPortfolioExport';

function todayInVietnam(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidPortfolioRange(dateFrom: string, dateTo: string): boolean {
  const start = Date.parse(`${dateFrom}T00:00:00Z`);
  const end = Date.parse(`${dateTo}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return false;
  }
  const daySpan = Math.floor((end - start) / 86400000);
  return daySpan <= 366;
}

export function InvestorDashboard() {
  const { t } = useTranslation('investor');
  const { investor, logout, isAuthenticated, isLoading: authLoading } = useInvestorAuth();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState(() => todayInVietnam());
  const [dateTo, setDateTo] = useState(() => todayInVietnam());
  const [portfolio, setPortfolio] = useState<InvestorPortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/investor/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isValidPortfolioRange(dateFrom, dateTo)) {
      setLoading(false);
      setError(t('dashboard.errors.invalidDateRange'));
      return;
    }
    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    fetchInvestorPortfolio({ dateFrom, dateTo })
      .then((res) => {
        if (isCurrentRequest) setPortfolio(res);
      })
      .catch(() => {
        if (isCurrentRequest) setError(t('dashboard.errors.fetchFailed'));
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [dateFrom, dateTo, isAuthenticated, t]);

  const clients = portfolio?.clients ?? [];

  const stats = useMemo(() => {
    const overview = portfolio?.overview;
    return [
      {
        id: 'clients',
        label: t('dashboard.overview.clients'),
        value: String(overview?.client_count ?? 0),
        icon: Users,
        tint: 'bg-sky-50 text-sky-700',
      },
      {
        id: 'appointments',
        label: t('dashboard.overview.appointments'),
        value: String(overview?.appointment_count ?? 0),
        icon: CalendarDays,
        tint: 'bg-violet-50 text-violet-700',
      },
      {
        id: 'service-total',
        label: t('dashboard.overview.serviceTotal'),
        value: formatCurrency(overview?.service_total ?? 0),
        icon: BarChart3,
        tint: 'bg-emerald-50 text-emerald-700',
      },
      {
        id: 'outstanding',
        label: t('dashboard.overview.outstanding'),
        value: formatCurrency(overview?.outstanding_total ?? 0),
        icon: Wallet,
        tint: 'bg-amber-50 text-amber-700',
      },
    ];
  }, [portfolio?.overview, t]);

  function handleExportCsv() {
    if (!portfolio) return;
    downloadInvestorPortfolioCsv(portfolio);
  }

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

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              <span className="mb-1 block text-xs uppercase text-slate-500">{t('dashboard.filters.from')}</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span className="mb-1 block text-xs uppercase text-slate-500">{t('dashboard.filters.to')}</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!portfolio || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t('dashboard.exportCsv')}
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-700">
            <p className="font-medium">{error}</p>
            {error !== t('dashboard.errors.invalidDateRange') && (
              <p className="text-sm mt-1">{t('dashboard.errors.retryHint')}</p>
            )}
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
            <p className="text-lg font-medium text-slate-800">{t('dashboard.empty.title')}</p>
            <p className="text-sm text-slate-500 mt-2">{t('dashboard.empty.message')}</p>
          </div>
        )}

        {!loading && !error && clients.length > 0 && (
          <div className="space-y-5">
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                {t('dashboard.sections.overview')}
              </div>
            <div className="grid gap-3 md:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${stat.tint}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium uppercase text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{stat.value}</p>
                  </div>
                );
              })}
            </div>
            </section>

            {portfolio && <InvestorPortfolioTables portfolio={portfolio} clients={clients} />}
            </div>
        )}
      </main>
    </div>
  );
}
