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
import {
  login as apiLogin,
  fetchMe,
  type AuthUser,
  type AuthPermissions,
} from '@/lib/api';

const TOKEN_KEY = 'tdental_token';

interface AuthState {
  user: AuthUser | null;
  permissions: AuthPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
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
      new CustomEvent('tdental:auth-change', { detail: locations ? { locations } : null })
    );
  }

  // On mount, validate existing token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    fetchMe()
      .then((res) => {
        setState({
          user: res.user,
          permissions: res.permissions,
          isAuthenticated: true,
          isLoading: false,
        });
        dispatchAuthChange(res.permissions.locations);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, permissions: null, isAuthenticated: false, isLoading: false });
        dispatchAuthChange(null);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    setState({
      user: res.user,
      permissions: res.permissions,
      isAuthenticated: true,
      isLoading: false,
    });
    dispatchAuthChange(res.permissions.locations);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, permissions: null, isAuthenticated: false, isLoading: false });
    dispatchAuthChange(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      return state.permissions?.effectivePermissions.includes(permission) ?? false;
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
