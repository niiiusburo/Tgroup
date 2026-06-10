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
    return localStorage.getItem(REMEMBER_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setRememberMePreference(rememberMe: boolean): void {
  try {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_PREF_KEY, '1');
    } else {
      localStorage.removeItem(REMEMBER_PREF_KEY);
    }
  } catch {
    // Ignore storage errors
  }
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
      localStorage.removeItem(REMEMBER_PREF_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}