/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/investor/reset-password route]
 * @crossref:uses[investor API password reset endpoints]
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Loader2 } from 'lucide-react';
import { requestInvestorPasswordReset, confirmInvestorPasswordReset } from '@/lib/api/investor';
import { ApiError } from '@/lib/api/core';

type Step = 'request' | 'confirm';

export function InvestorResetPassword() {
  const { t } = useTranslation('investor');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [step, setStep] = useState<Step>(tokenFromUrl ? 'confirm' : 'request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await requestInvestorPasswordReset(email.trim());
      setMessage(res.message);
      if (res.token) {
        setToken(res.token);
        setStep('confirm');
      }
    } catch {
      setError(t('reset.errors.requestFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmInvestorPasswordReset(token.trim(), password, confirmPassword);
      navigate('/investor/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'U_WEAK_PASSWORD') setError(t('reset.errors.weakPassword'));
        else if (err.code === 'U_RESET_TOKEN_INVALID') setError(t('reset.errors.invalidToken'));
        else setError(t('reset.errors.confirmFailed'));
      } else {
        setError(t('reset.errors.confirmFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">{t('reset.title')}</h1>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <p className="text-sm text-slate-500">{t('reset.requestHint')}</p>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-1">
                  {t('login.email')}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg"
                />
              </div>
              {message && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{message}</p>}
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('reset.sendLink')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <p className="text-sm text-slate-500">{t('reset.confirmHint')}</p>
              <div>
                <label htmlFor="reset-token" className="block text-sm font-medium mb-1">
                  {t('reset.token')}
                </label>
                <input
                  id="reset-token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-1">
                  {t('reset.newPassword')}
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                  {t('reset.confirmPassword')}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg"
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('reset.setPassword')}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm">
            <Link to="/investor/login" className="text-amber-700 hover:underline">
              {t('reset.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}