import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  shouldReportError,
  tryRecoverStaleChunk,
  type ErrorReport,
} from './errorReporter';

function makeReport(message: string, overrides: Partial<ErrorReport> = {}): ErrorReport {
  return {
    error_type: 'Global',
    message,
    stack: '',
    route: '/',
    ...overrides,
  };
}

describe('errorReporter noise and stale chunk recovery', () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('DEV', false);
    sessionStorage.clear();
    reloadMock.mockReset();
    vi.spyOn(window, 'setTimeout').mockImplementation((fn) => {
      if (typeof fn === 'function') fn();
      return 0 as ReturnType<typeof setTimeout>;
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadMock,
        pathname: '/',
        search: '',
        hash: '',
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('suppresses MetaMask and React DOM reconciliation noise', () => {
    expect(shouldReportError(makeReport('Failed to connect to MetaMask'))).toBe(false);
    expect(shouldReportError(makeReport("Failed to execute 'insertBefore' on 'Node'"))).toBe(false);
    expect(shouldReportError(makeReport("Failed to execute 'removeChild' on 'Node'"))).toBe(false);
  });

  it('reloads once for stale dynamic import chunks and skips telemetry', () => {
    const report = makeReport(
      'Uncaught TypeError: Failed to fetch dynamically imported module: https://tmv.2checkin.com/assets/Overview.js',
    );

    expect(shouldReportError(report)).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('tg_chunk_reload_attempted')).toBe('1');
    expect(tryRecoverStaleChunk(report)).toBe(false);
  });

  it('does not reload stale chunks twice in the same session', () => {
    const report = makeReport('Failed to fetch dynamically imported module: /assets/Customers.js');
    sessionStorage.setItem('tg_chunk_reload_attempted', '1');

    expect(tryRecoverStaleChunk(report)).toBe(false);
    expect(shouldReportError(report)).toBe(true);
  });
});