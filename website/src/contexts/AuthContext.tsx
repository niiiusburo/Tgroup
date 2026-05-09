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
  login as apiLogin,
  fetchMe,
  type AuthUser,
  type AuthPermissions,
} from '@/lib/api';
import {
  clearAuthToken,
  getAuthToken,
  getRememberMeEnabled,
  setAuthToken,
  setRememberMeEnabled,
} from '@/lib/authTokenStorage';

interface AuthState {
  user: AuthUser | null;
  permissions: AuthPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
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

  const clearSession = useCallback((clearRemember = false) => {
    if (clearRemember) {
      setRememberMeEnabled(false);
    }
    clearAuthToken();
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
        // Backend refreshes JWT TTL for remember-me sessions
        if (res.token) {
          setAuthToken(res.token, getRememberMeEnabled() ? 'remember' : 'session');
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

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const res = await apiLogin(email, password, rememberMe);
    setRememberMeEnabled(rememberMe);
    setAuthToken(res.token, rememberMe ? 'remember' : 'session');
    setState({
      user: res.user,
      permissions: res.permissions,
      isAuthenticated: true,
      isLoading: false,
    });
    dispatchAuthChange(res.permissions.locations);
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
