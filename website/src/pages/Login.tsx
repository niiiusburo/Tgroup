/**
 * Login Page - TG Clinic authentication screen
 * @crossref:used-in[App]
 * @crossref:uses[AuthContext.login]
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const LOGIN_STORAGE_KEY = 'tgclinic_saved_login';
const LEGACY_EMAIL_STORAGE_KEY = 'tgclinic_saved_email';

function getSavedLogin(): string {
  try {
    return localStorage.getItem(LOGIN_STORAGE_KEY) || localStorage.getItem(LEGACY_EMAIL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveLogin(identifier: string): void {
  try {
    localStorage.setItem(LOGIN_STORAGE_KEY, identifier);
  } catch {
    // Ignore storage errors
  }
}

function clearSavedLogin(): void {
  try {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_EMAIL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function Login() {
  const { t } = useTranslation('auth');
  const { login } = useAuth();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [identifier, setIdentifier] = useState(() => getSavedLogin());
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identifier, password);

      if (!mountedRef.current) return;

      // Only save login identifier (not password) for prefill convenience.
      saveLogin(identifier);

      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      if (err instanceof Error) {
        setError(err.message.includes('401') ? t('errors.invalidCredentials') : err.message);
      } else {
        setError(t('errors.invalidCredentials'));
      }
      clearSavedLogin();
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">TD</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">
                {t('title')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{t('signIn')}</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-identifier" className="text-sm font-medium text-gray-700">
                {t('loginIdentifier')}
              </label>
              <input
                id="login-identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('loginIdentifierPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full h-12 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm hover:shadow-purple-500/40"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('signIn')}…
                </>
              ) : (
                t('signIn')
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/60 mt-6">
          TG Clinic Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
