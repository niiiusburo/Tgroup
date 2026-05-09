const TOKEN_KEY = 'tgclinic_token';
const REMEMBER_KEY = 'tgclinic_remember';

export type TokenStorageMode = 'remember' | 'session';

export function getRememberMeEnabled(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
}

export function setRememberMeEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // ignore
  }
}

export function setAuthToken(token: string, mode: TokenStorageMode): void {
  try {
    if (mode === 'remember') {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

