/**
 * AuthContext - Global authentication state
 * @crossref:used-in[App, Layout, ProtectedRoute]
 * @crossref:uses[api.login, api.fetchMe]
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { AUTH_UNAUTHORIZED_EVENT } from '@/lib/api/core';
import {
  clearAuthToken,
  getAuthToken,
  getRememberMePreference,
  setAuthToken,
} from '@/lib/authToken';
import {
  login as apiLogin,
  fetchMe,
  type AuthUser,
  type AuthPermissions,
} from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  permissions: AuthPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasLocationAccess: (locationId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: null,
    isAuthenticated: false,
    isLoading: true,
  });

  function dispatchAuthChange(locations: { id: string; name: string }[] | null) {
    window.dispatchEvent(
      new CustomEvent('tgclinic:auth-change', { detail: locations ? { locations } : null })
    );
  }

  const clearSession = useCallback((clearRememberPreference = false) => {
    clearAuthToken(clearRememberPreference);
    setState({ user: null, permissions: null, isAuthenticated: false, isLoading: false });
    dispatchAuthChange(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearSession]);

  // On mount, validate existing token
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    fetchMe()
      .then((res) => {
        const activeToken = getAuthToken();
        if (activeToken && getRememberMePreference()) {
          setAuthToken(activeToken, true);
        }
        setState({
          user: res.user,
          permissions: res.permissions,
          isAuthenticated: true,
          isLoading: false,
        });
        dispatchAuthChange(res.permissions.locations);
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession]);

  const login = useCallback(async (identifier: string, password: string, rememberMe = false) => {
    const res = await apiLogin(identifier, password, rememberMe);
    setAuthToken(res.token, rememberMe);
    // Show the FeedbackWidget login hint once on each fresh login.
    sessionStorage.removeItem('tg_feedback_hint_dismissed');
    setState({
      user: res.user,
      permissions: res.permissions,
      isAuthenticated: true,
      isLoading: false,
    });
    dispatchAuthChange(res.permissions.locations);

    // CTV v2 hard redirect (D14): if is_ctv, never enter admin UI
    if (res.user?.is_ctv || res.user?.isCtv) {
      // hard redirect to guarantee clean CTV chrome (no Layout/sidebar flash)
      window.location.href = '/ctv';
      return;
    }
    // backend may also return redirectTo
    if (res.redirectTo === '/ctv') {
      window.location.href = '/ctv';
    }
  }, []);

  const logout = useCallback(() => {
    clearSession(true);
  }, [clearSession]);

  const hasPermission = useCallback(
    (permission: string) => {
      const perms = state.permissions?.effectivePermissions ?? [];
      // Wildcard * grants all permissions
      if (perms.includes('*')) return true;
      return perms.includes(permission);
    },
    [state.permissions]
  );

  const hasLocationAccess = useCallback(
    (locationId: string) => {
      if (!state.permissions) return false;
      if (locationId === 'all') return true;
      return state.permissions.locations.some((loc) => loc.id === locationId);
    },
    [state.permissions]
  );

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, hasPermission, hasLocationAccess }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
