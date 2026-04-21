/**
 * TDD Tests for useVersionCheck
 * Covers commit-aware updates, snooze mechanism, critical updates with countdown,
 * grace period behavior, BroadcastChannel sync, and return path preservation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  getBuildTimeVersion,
  hasUpdate,
  useVersionCheck,
  consumeReturnPath,
  type VersionInfo,
} from '@/hooks/useVersionCheck';

const mockV1: VersionInfo = {
  version: '0.8.4',
  buildTime: '2026-04-13T10:00:00Z',
  gitCommit: 'abc1234',
  gitBranch: 'main',
};

const mockV2SameSemver: VersionInfo = {
  version: '0.8.4',
  buildTime: '2026-04-13T11:00:00Z',
  gitCommit: 'def5678',
  gitBranch: 'main',
};

const mockV3NewerSemver: VersionInfo = {
  version: '0.10.1',
  buildTime: '2026-04-13T12:00:00Z',
  gitCommit: 'ghi9012',
  gitBranch: 'main',
  severity: 'regular',
};

const mockV4Critical: VersionInfo = {
  version: '0.10.2',
  buildTime: '2026-04-13T13:00:00Z',
  gitCommit: 'jkl3456',
  gitBranch: 'main',
  severity: 'critical',
  forceUpdate: true,
};

function setupFakeFetch(response: VersionInfo) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => response,
  } as Response);
}

function setupFakeFetchSequence(responses: VersionInfo[]) {
  let call = 0;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    const res = responses[call] ?? responses[responses.length - 1];
    call += 1;
    return Promise.resolve({
      ok: true,
      json: async () => res,
    } as Response);
  });
}

describe('useVersionCheck utilities', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).__APP_VERSION__ = '0.8.4';
    (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ = '2026-04-13T10:00:00Z';
    (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ = 'abc1234';
    (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ = 'main';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getBuildTimeVersion', () => {
    it('should read version from globalThis.__APP_VERSION__', () => {
      const result = getBuildTimeVersion();
      expect(result.version).toBe('0.8.4');
    });

    it('should fallback to 0.0.0-dev when globalThis.__APP_VERSION__ is undefined', () => {
      (globalThis as Record<string, unknown>).__APP_VERSION__ = undefined;
      const result = getBuildTimeVersion();
      expect(result.version).toBe('0.0.0-dev');
    });

    it('should read all build metadata from globalThis', () => {
      const result = getBuildTimeVersion();
      expect(result).toEqual({
        version: '0.8.4',
        buildTime: '2026-04-13T10:00:00Z',
        gitCommit: 'abc1234',
        gitBranch: 'main',
      });
    });
  });

  describe('hasUpdate', () => {
    it('returns true when semver is newer', () => {
      expect(hasUpdate(mockV1, mockV3NewerSemver)).toBe(true);
    });

    it('returns true when semver is same but commit differs', () => {
      expect(hasUpdate(mockV1, mockV2SameSemver)).toBe(true);
    });

    it('returns false when both semver and commit match', () => {
      expect(hasUpdate(mockV1, { ...mockV1 })).toBe(false);
    });

    it('returns true when semver is older but commit differs (rollback detected)', () => {
      expect(hasUpdate(mockV3NewerSemver, mockV1)).toBe(true);
    });
  });

  describe('consumeReturnPath', () => {
    it('returns and clears stored return path', () => {
      sessionStorage.setItem('tgclinic:updateReturnPath', '/customers?id=123');
      expect(consumeReturnPath()).toBe('/customers?id=123');
      expect(sessionStorage.getItem('tgclinic:updateReturnPath')).toBeNull();
    });

    it('returns null when no path stored', () => {
      expect(consumeReturnPath()).toBeNull();
    });
  });
});

describe('useVersionCheck hook', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    (globalThis as Record<string, unknown>).__APP_VERSION__ = '0.8.4';
    (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ = '2026-04-13T10:00:00Z';
    (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ = 'abc1234';
    (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ = 'main';

    localStorage.clear();
    sessionStorage.clear();

    // Clean URL
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('initializes with build-time version', () => {
    const { result } = renderHook(() => useVersionCheck({ enabled: false }));

    expect(result.current.currentVersion).toEqual({
      version: '0.8.4',
      buildTime: '2026-04-13T10:00:00Z',
      gitCommit: 'abc1234',
      gitBranch: 'main',
    });
  });

  it('detects update when newer semver is available', async () => {
    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
      expect(result.current.latestVersion?.version).toBe('0.10.1');
      expect(result.current.updateSeverity).toBe('regular');
    });
  });

  it('detects update when same semver but different commit', async () => {
    setupFakeFetch(mockV2SameSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
      expect(result.current.latestVersion?.gitCommit).toBe('def5678');
    });
  });

  it('does not show update when versions match exactly', async () => {
    setupFakeFetch(mockV1);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(false);
    });
  });

  it('snooze hides update for 24 hours', async () => {
    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => expect(result.current.isUpdateAvailable).toBe(true));

    act(() => {
      result.current.snoozeUpdate();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isSnoozed).toBe(true);

    // Check again immediately — should stay hidden
    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => expect(result.current.isUpdateAvailable).toBe(false));
  });

  it('shows update again after snooze expires', async () => {
    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });
    await waitFor(() => expect(result.current.isUpdateAvailable).toBe(true));

    act(() => {
      result.current.snoozeUpdate();
    });

    // Advance 25 hours
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
      expect(result.current.isSnoozed).toBe(false);
    });
  });

  it('dismissUpdate acts as alias for snoozeUpdate', async () => {
    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });
    await waitFor(() => expect(result.current.isUpdateAvailable).toBe(true));

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isSnoozed).toBe(true);
  });

  it('critical updates bypass snooze and show immediately', async () => {
    setupFakeFetch(mockV4Critical);

    // Set a future snooze
    localStorage.setItem('tgclinic:updateSnoozeUntil', (Date.now() + 24 * 60 * 60 * 1000).toString());

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
      expect(result.current.updateSeverity).toBe('critical');
    });
  });

  it('starts countdown for critical updates', async () => {
    setupFakeFetch(mockV4Critical);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.countdownRemaining).not.toBeNull();
    });

    expect((result.current.countdownRemaining ?? 0) > 0).toBe(true);
  });

  it('auto-applies critical update when countdown reaches zero', async () => {
    const replaceFn = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        href: 'http://localhost:5175/',
        pathname: '/',
        search: '',
        origin: 'http://localhost:5175',
        replace: replaceFn,
        reload: vi.fn(),
      },
    });
    setupFakeFetch(mockV4Critical);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => expect(result.current.countdownRemaining).not.toBeNull());

    // Fast-forward past the 10s countdown
    vi.advanceTimersByTime(12000);

    await waitFor(() => {
      expect(replaceFn).toHaveBeenCalled();
    }, { timeout: 3000 });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('preserves return path when applying update', async () => {
    const replaceFn = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        href: 'http://localhost:5175/appointments?date=2026-04-13',
        pathname: '/appointments',
        search: '?date=2026-04-13',
        origin: 'http://localhost:5175',
        replace: replaceFn,
        reload: vi.fn(),
      },
    });

    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await act(async () => {
      await result.current.applyUpdate();
    });

    await waitFor(() => {
      expect(sessionStorage.getItem('tgclinic:updateReturnPath')).toBe('/appointments?date=2026-04-13');
    });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('grace period suppresses UI but still fetches version', async () => {
    // Simulate a recent reload
    localStorage.setItem('tgclinic:justUpdated', Date.now().toString());

    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    // Poll effect on mount triggers grace-period fetch
    await waitFor(() => {
      expect(result.current.latestVersion?.version).toBe('0.10.1');
      expect(result.current.isUpdateAvailable).toBe(false);
    });
  });

  it('force check after grace period shows update', async () => {
    localStorage.setItem('tgclinic:justUpdated', Date.now().toString());

    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates(true);
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
    });
  });

  it('clears update state when server version matches current', async () => {
    // Mount will auto-check once, so sequence needs one extra entry
    const fetchSpy = setupFakeFetchSequence([mockV3NewerSemver, mockV3NewerSemver, mockV1]);

    const { result } = renderHook(() => useVersionCheck());

    // First explicit check: update available
    await act(async () => {
      await result.current.checkForUpdates();
    });
    await waitFor(() => expect(result.current.isUpdateAvailable).toBe(true));

    // Second explicit check: now up to date
    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(false);
      expect(result.current.updateSeverity).toBeNull();
    });

    fetchSpy.mockRestore();
  });

  it('notifies callback when update becomes available', async () => {
    const onUpdateAvailable = vi.fn();
    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() =>
      useVersionCheck({ onUpdateAvailable })
    );

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(onUpdateAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ version: '0.8.4' }),
        expect.objectContaining({ version: '0.10.1' })
      );
    });
  });

  it('handles network errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('Network failure');
      expect(result.current.isChecking).toBe(false);
    });
  });

  it('migrates legacy dismissedVersion key on mount', async () => {
    localStorage.setItem('tgclinic:dismissedVersion', '0.8.4|abc1234');

    renderHook(() => useVersionCheck({ enabled: false }));

    expect(localStorage.getItem('tgclinic:dismissedVersion')).toBeNull();
  });
});

describe('useVersionCheck BroadcastChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (globalThis as Record<string, unknown>).__APP_VERSION__ = '0.8.4';
    (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ = 'abc1234';
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('syncs updateAvailable across tabs', async () => {
    const postMessageSpy = vi.fn();
    const closeSpy = vi.fn();

    class FakeBroadcastChannel {
      name = 'tgclinic:versionCheck';
      onmessage: ((ev: MessageEvent) => void) | null = null;
      postMessage = postMessageSpy;
      close = closeSpy;
    }

    (globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
      FakeBroadcastChannel as unknown as typeof BroadcastChannel;

    setupFakeFetch(mockV3NewerSemver);

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'updateAvailable', version: expect.objectContaining({ version: '0.10.1' }) })
      );
    });
  });
});
