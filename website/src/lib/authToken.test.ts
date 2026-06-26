import { describe, it, expect, beforeEach } from 'vitest';
import {
  TOKEN_KEY,
  REMEMBER_PREF_KEY,
  REMEMBER_SESSION_KEY,
  clearAuthToken,
  getAuthToken,
  getRememberMePreference,
  isAuthTokenExpired,
  setAuthToken,
  setRememberMePreference,
} from './authToken';

describe('authToken', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores remembered sessions in localStorage', () => {
    setAuthToken('remembered-token', true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('remembered-token');
    expect(localStorage.getItem(REMEMBER_SESSION_KEY)).toBe('1');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe('remembered-token');
  });

  it('stores non-remembered sessions in sessionStorage only', () => {
    setAuthToken('session-token', false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('session-token');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe('session-token');
  });

  it('defaults remember-me preference to true for first-time visitors', () => {
    expect(getRememberMePreference()).toBe(true);
  });

  it('persists remember-me checkbox preference separately from active session', () => {
    setRememberMePreference(true);
    expect(getRememberMePreference()).toBe(true);
    clearAuthToken(false);
    expect(getRememberMePreference()).toBe(true);
    clearAuthToken(true);
    expect(getRememberMePreference()).toBe(false);
  });

  it('detects expired JWT payloads', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const expired = `${header}.${payload}.sig`;
    expect(isAuthTokenExpired(expired)).toBe(true);

    const freshPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const fresh = `${header}.${freshPayload}.sig`;
    expect(isAuthTokenExpired(fresh)).toBe(false);
  });
});