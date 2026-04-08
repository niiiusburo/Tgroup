/**
 * Login Page - TDental authentication screen
 * @crossref:used-in[App]
 * @crossref:uses[AuthContext.login]
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'tdental_remember';
const STORAGE_DAYS = 60; // Save for 60 days

interface RememberedCredentials {
  email: string;
  password: string;
  expiry: number;
}

function getRememberedCredentials(): RememberedCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: RememberedCredentials = JSON.parse(stored);
    if (Date.now() > data.expiry) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveCredentials(email: string, password: string): void {
  const data: RememberedCredentials = {
    email,
    password,
    expiry: Date.now() + (STORAGE_DAYS * 24 * 60 * 60 * 1000),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [error, setError] = useState('');

  // Load remembered credentials on mount (auto-login)
  useEffect(() => {
    const remembered = getRememberedCredentials();
    if (remembered) {
      setEmail(remembered.email);
      setPassword(remembered.password);
      setHasSavedCredentials(true);
      
      // Auto-login with saved credentials
      setIsLoading(true);
      login(remembered.email, remembered.password)
        .then(() => navigate('/', { replace: true }))
        .catch(() => {
          // Saved credentials failed, clear them
          clearCredentials();
          setHasSavedCredentials(false);
          setIsLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      
      // Automatically save credentials on successful login
      saveCredentials(email, password);
      setHasSavedCredentials(true);
      
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.includes('401') ? 'Invalid email or password.' : err.message);
      } else {
        setError('Login failed. Please try again.');
      }
      // Clear saved credentials if login failed
      clearCredentials();
      setHasSavedCredentials(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">TD</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                TDental
              </h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
            </div>
          </div>

          {/* Saved credentials notice */}
          {hasSavedCredentials && !isLoading && (
            <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Signed in with saved credentials
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tdental.vn"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Auto-save notice */}
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Credentials saved automatically for {STORAGE_DAYS} days
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/60 mt-6">
          TDental Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
