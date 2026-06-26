/**
 * @crossref:domain[auth]
 * @crossref:used-in[AuthContext, api/core, exports, errorReporter]
 * @crossref:uses[product-map/domains/auth.yaml]
 */

export const TOKEN_KEY = 'tgclinic_token';
export const REMEMBER_PREF_KEY = 'tgclinic_remember_pref';
export const REMEMBER_SESSION_KEY = 'tgclinic_remember';

export function getRememberMePreference(): boolean {
  try {
    const stored = localStorage.getItem(REMEMBER_PREF_KEY);
    if (stored === null) return true;
    return stored === '1';
  } catch {
    return true;
  }
}

export function setRememberMePreference(rememberMe: boolean): void {
  try {
    localStorage.setItem(REMEMBER_PREF_KEY, rememberMe ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isAuthTokenExpired(token: string, skewMs = 30_000): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return true;
  return exp * 1000 <= Date.now() + skewMs;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string, rememberMe: boolean): void {
  try {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_SESSION_KEY, '1');
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthToken(clearRememberPreference = false): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_SESSION_KEY);
    if (clearRememberPreference) {
      localStorage.setItem(REMEMBER_PREF_KEY, '0');
    }
  } catch {
    // Ignore storage errors
  }
}