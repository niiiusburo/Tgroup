/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/investor/login route in App.tsx]
 * @crossref:uses[InvestorAuthContext, i18n investor namespace]
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Loader2 } from 'lucide-react';
import { useInvestorAuth } from '@/contexts/InvestorAuthContext';
import { ApiError } from '@/lib/api/core';

export function InvestorLogin() {
  const { t } = useTranslation('investor');
  const { login } = useInvestorAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate('/investor', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError(t('login.errors.rateLimited'));
        else if (err.code === 'S_INVESTOR_DEACTIVATED') setError(t('login.errors.deactivated'));
        else setError(t('login.errors.invalidCredentials'));
      } else {
        setError(t('login.errors.invalidCredentials'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">{t('login.title')}</h1>
            <p className="text-sm text-slate-500 text-center">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="investor-email" className="block text-sm font-medium text-slate-700 mb-1">
                {t('login.email')}
              </label>
              <input
                id="investor-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="investor-password" className="block text-sm font-medium text-slate-700 mb-1">
                {t('login.password')}
              </label>
              <input
                id="investor-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t('login.rememberMe')}
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link to="/investor/reset-password" className="text-sm text-amber-700 hover:underline">
                {t('login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('login.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}