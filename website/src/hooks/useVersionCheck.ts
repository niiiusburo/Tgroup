/**
 * Version Check Hook
 *
 * Polls for app updates and notifies when a new version is available.
 * This solves the browser cache problem by detecting when a new build is deployed.
 *
 * Features:
 * - Detects updates by semver AND git commit hash
 * - Supports two-tier severity: regular (snoozable) vs critical (forced)
 * - 24-hour snooze for regular updates (no permanent dismissal)
 * - Critical updates auto-reload after countdown
 * - Cross-tab sync via BroadcastChannel
 * - Preserves user's current route after reload
 *
 * @crossref:used-in[App, Layout, VersionDisplay]
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type UpdateSeverity = 'regular' | 'critical';

// Version info structure matching version.json
export interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit: string;
  gitBranch: string;
  environment?: string;
  severity?: UpdateSeverity;
  forceUpdate?: boolean;
  updateDeadline?: string;
}

interface UseVersionCheckOptions {
  /** Polling interval in milliseconds (default: 5 minutes) */
  pollInterval?: number;
  /** Enable/disable polling (default: true) */
  enabled?: boolean;
  /** Callback when update is available */
  onUpdateAvailable?: (current: VersionInfo, latest: VersionInfo) => void;
}

interface UseVersionCheckReturn {
  /** Current loaded version */
  currentVersion: VersionInfo | null;
  /** Latest version from server (if different) */
  latestVersion: VersionInfo | null;
  /** True when a newer version is available */
  isUpdateAvailable: boolean;
  /** Severity of the available update */
  updateSeverity: UpdateSeverity | null;
  /** True if current update is snoozed */
  isSnoozed: boolean;
  /** Seconds remaining for auto-reload countdown (critical updates) */
  countdownRemaining: number | null;
  /** True while checking for updates */
  isChecking: boolean;
  /** Last error if check failed */
  error: Error | null;
  /** Manually trigger a version check */
  checkForUpdates: () => Promise<void>;
  /** Apply the update by reloading the page */
  applyUpdate: () => Promise<void>;
  /** Dismiss (snooze) the update notification for 24 hours */
  snoozeUpdate: () => void;
  /** Legacy: dismiss/snooze the update notification (use snoozeUpdate) */
  dismissUpdate: () => void;
}

declare global {
  interface Window {
    __APP_VERSION__?: string;
    __APP_BUILD_TIME__?: string;
    __APP_GIT_COMMIT__?: string;
    __APP_GIT_BRANCH__?: string;
  }
}

// localStorage / sessionStorage keys
const DISMISSED_VERSION_KEY = 'tgclinic:dismissedVersion'; // legacy migration
const SNOOZE_UNTIL_KEY = 'tgclinic:updateSnoozeUntil';
const JUST_UPDATED_KEY = 'tgclinic:justUpdated';
const TARGET_VERSION_KEY = 'tgclinic:targetVersion';
const RETURN_PATH_KEY = 'tgclinic:updateReturnPath';
const ACCEPTED_VERSION_KEY = 'tgclinic:acceptedVersion'; // legacy - removed from active use

const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CRITICAL_AUTO_RELOAD_SECONDS = 10;
const JUST_UPDATED_GRACE_MS = 30000;

/** Broadcast channel name for cross-tab update sync */
const BROADCAST_CHANNEL_NAME = 'tgclinic:versionCheck';

type BroadcastMessage =
  | { type: 'updateAvailable'; version: VersionInfo }
  | { type: 'applyUpdate' }
  | { type: 'snoozed'; until: number };

/**
 * Check if we just completed an update (based on URL param or localStorage)
 */
function checkJustUpdated(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.has('_v')) {
    url.searchParams.delete('_v');
    window.history.replaceState({}, '', url.toString());
    localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());
    return true;
  }

  const justUpdated = localStorage.getItem(JUST_UPDATED_KEY);
  if (justUpdated) {
    const timeSinceUpdate = Date.now() - parseInt(justUpdated, 10);
    if (timeSinceUpdate < JUST_UPDATED_GRACE_MS) {
      return true;
    }
    localStorage.removeItem(JUST_UPDATED_KEY);
  }

  return false;
}

/** Get snooze expiry timestamp from localStorage */
function getSnoozeUntil(): number {
  try {
    const raw = localStorage.getItem(SNOOZE_UNTIL_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/** Set snooze expiry timestamp in localStorage */
function setSnoozeUntil(until: number): void {
  try {
    localStorage.setItem(SNOOZE_UNTIL_KEY, until.toString());
  } catch {
    // ignore
  }
}

/** Clear snooze */
function clearSnooze(): void {
  try {
    localStorage.removeItem(SNOOZE_UNTIL_KEY);
  } catch {
    // ignore
  }
}

/** Migrate legacy permanent dismissal to new snooze format */
function migrateLegacyDismissal(): void {
  try {
    if (localStorage.getItem(DISMISSED_VERSION_KEY)) {
      localStorage.removeItem(DISMISSED_VERSION_KEY);
    }
  } catch {
    // ignore
  }
}

export function getBuildTimeVersion(): VersionInfo {
  const version = (globalThis as Record<string, unknown>).__APP_VERSION__ as string | undefined ?? '0.0.0-dev';
  const buildTime = (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ as string | undefined ?? new Date().toISOString();
  const gitCommit = (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ as string | undefined ?? 'unknown';
  const gitBranch = (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ as string | undefined ?? 'unknown';

  return { version, buildTime, gitCommit, gitBranch };
}

/**
 * Fetches version.json with cache-busting and timeout
 */
async function fetchVersion(): Promise<VersionInfo> {
  const cacheBuster = `?t=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`/version.json${cacheBuster}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Parse semver string to comparable parts */
function parseVersion(version: string): { major: number; minor: number; patch: number; prerelease: string } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return { major: 0, minor: 0, patch: 0, prerelease: '' };
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
  };
}

/**
 * Check if `latest` semver is strictly newer than `current`.
 */
function isSemverNewer(current: VersionInfo, latest: VersionInfo): boolean {
  const cv = parseVersion(current.version);
  const lv = parseVersion(latest.version);

  if (lv.major > cv.major) return true;
  if (lv.major < cv.major) return false;
  if (lv.minor > cv.minor) return true;
  if (lv.minor < cv.minor) return false;
  if (lv.patch > cv.patch) return true;
  if (lv.patch < cv.patch) return false;
  return false;
}

/**
 * Determine if there's an update.
 * Primary: semver newer.
 * Secondary: same semver but different commit hash.
 */
export function hasUpdate(current: VersionInfo, latest: VersionInfo): boolean {
  if (isSemverNewer(current, latest)) return true;
  if (current.gitCommit !== latest.gitCommit) return true;
  return false;
}

/** Determine update severity from server version info */
function getUpdateSeverity(serverVersion: VersionInfo): UpdateSeverity {
  if (serverVersion.forceUpdate) return 'critical';
  if (serverVersion.severity === 'critical') return 'critical';
  return 'regular';
}

/** Clear all browser caches comprehensively */
async function clearAllCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch {
      // ignore
    }
  }

  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch {
      // ignore
    }
  }
}

/** Restore path after reload */
export function consumeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    sessionStorage.removeItem(RETURN_PATH_KEY);
    return path;
  } catch {
    return null;
  }
}

export function useVersionCheck(options: UseVersionCheckOptions = {}): UseVersionCheckReturn {
  const {
    pollInterval = 5 * 60 * 1000,
    enabled = true,
    onUpdateAvailable,
  } = options;

  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateSeverity, setUpdateSeverity] = useState<UpdateSeverity | null>(null);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasNotifiedRef = useRef(false);
  const justUpdatedRef = useRef<boolean>(checkJustUpdated());
  const bcRef = useRef<BroadcastChannel | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Migrate legacy dismissed state on mount
  useEffect(() => {
    migrateLegacyDismissal();
  }, []);

  // Periodically refresh justUpdatedRef from localStorage
  useEffect(() => {
    const intervalId = setInterval(() => {
      const isStillRecent = checkJustUpdated();
      if (!isStillRecent && justUpdatedRef.current) {
        justUpdatedRef.current = false;
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // Set up BroadcastChannel for cross-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        const msg = event.data;
        if (msg.type === 'updateAvailable' && msg.version) {
          setLatestVersion(msg.version);
          setUpdateSeverity(getUpdateSeverity(msg.version));
          setIsUpdateAvailable(true);
        } else if (msg.type === 'applyUpdate') {
          // Another tab triggered update - follow along
          void applyUpdate();
        } else if (msg.type === 'snoozed') {
          setIsSnoozed(msg.until > Date.now());
        }
      };
      bcRef.current = bc;
      return () => bc.close();
    } catch {
      // ignore unsupported BroadcastChannel
    }
  }, []);

  // Initialize with build-time version
  useEffect(() => {
    const buildVersion = getBuildTimeVersion();

    const justUpdated = checkJustUpdated();
    const targetVersion = localStorage.getItem(TARGET_VERSION_KEY);

    if (targetVersion && targetVersion !== buildVersion.version && justUpdated) {
      // We reloaded but didn't get the new bundle. Accept server as truth
      // to avoid infinite loop, but preserve suspicion that update failed.
      // Next check will handle it.
      setCurrentVersion(buildVersion);
    } else if (targetVersion && targetVersion === buildVersion.version) {
      localStorage.removeItem(TARGET_VERSION_KEY);
      sessionStorage.removeItem(ACCEPTED_VERSION_KEY);
      setCurrentVersion(buildVersion);
    } else {
      localStorage.removeItem(TARGET_VERSION_KEY);
      sessionStorage.removeItem(ACCEPTED_VERSION_KEY);
      setCurrentVersion(buildVersion);
    }

    // Telemetry: did the last update succeed?
    if (justUpdated && targetVersion) {
      try {
        const pending = JSON.parse(localStorage.getItem('tgclinic:pendingTelemetry') || '[]');
        if (targetVersion === buildVersion.version) {
          pending.push({
            event: 'version_update_succeeded',
            from: targetVersion,
            to: buildVersion.version,
            trigger: 'button',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          });
        } else {
          pending.push({
            event: 'version_update_failed',
            from: targetVersion,
            to: buildVersion.version,
            trigger: 'button',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          });
        }
        localStorage.setItem('tgclinic:pendingTelemetry', JSON.stringify(pending));
      } catch {
        // ignore
      }
      localStorage.removeItem(TARGET_VERSION_KEY);
    }

    // Attempt to restore return path if we just updated
    if (justUpdated) {
      const returnPath = consumeReturnPath();
      if (returnPath && returnPath !== window.location.pathname + window.location.search) {
        try {
          // Prevent replacing state if already on correct path
          window.history.replaceState({}, '', returnPath);
        } catch {
          // ignore cross-origin or jsdom security errors
        }
      }
    }
  }, []);

  // Countdown logic for critical updates
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (isUpdateAvailable && updateSeverity === 'critical' && !isSnoozed) {
      let remaining = CRITICAL_AUTO_RELOAD_SECONDS;
      setCountdownRemaining(remaining);

      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdownRemaining(remaining);
        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          void applyUpdate();
        }
      }, 1000);
    } else {
      setCountdownRemaining(null);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isUpdateAvailable, updateSeverity, isSnoozed]);

  const postBroadcast = useCallback((msg: BroadcastMessage) => {
    try {
      bcRef.current?.postMessage(msg);
    } catch {
      // ignore
    }
  }, []);

  const clearUpdateState = useCallback(() => {
    setIsUpdateAvailable(false);
    setUpdateSeverity(null);
    hasNotifiedRef.current = false;
    clearSnooze();
    setIsSnoozed(false);
  }, []);

  const checkForUpdates = useCallback(async (forceCheck = false) => {
    if (!enabled) return;

    const snoozeUntil = getSnoozeUntil();
    const isSnoozedNow = snoozeUntil > Date.now();
    setIsSnoozed(isSnoozedNow);

    if (justUpdatedRef.current && !forceCheck) {
      // During grace period, verify without showing UI
      try {
        const serverVersion = await fetchVersion();
        setLatestVersion(serverVersion);
        const current = currentVersion || getBuildTimeVersion();
        const hasNewVersion = hasUpdate(current, serverVersion);

        if (!hasNewVersion) {
          clearUpdateState();
          justUpdatedRef.current = false;
        } else {
          // Still not updated after reload — clear grace to allow next check to show it
          justUpdatedRef.current = false;
        }
      } catch {
        // ignore
      }
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const serverVersion = await fetchVersion();
      setLatestVersion(serverVersion);

      const current = currentVersion || getBuildTimeVersion();
      const hasNewVersion = hasUpdate(current, serverVersion);
      const severity = getUpdateSeverity(serverVersion);
      setUpdateSeverity(severity);

      if (hasNewVersion) {
        if (severity === 'critical' || !isSnoozedNow) {
          setIsUpdateAvailable(true);
          postBroadcast({ type: 'updateAvailable', version: serverVersion });

          if (onUpdateAvailable && !hasNotifiedRef.current) {
            onUpdateAvailable(current, serverVersion);
            hasNotifiedRef.current = true;
          }
        } else {
          // Snoozed regular update - keep hidden
          setIsUpdateAvailable(false);
        }
      } else {
        clearUpdateState();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsChecking(false);
    }
  }, [enabled, currentVersion, onUpdateAvailable, clearUpdateState, postBroadcast]);

  const checkRef = useRef(checkForUpdates);
  useEffect(() => { checkRef.current = checkForUpdates; }, [checkForUpdates]);

  const applyUpdate = useCallback(async () => {
    const currentPath = window.location.pathname + window.location.search;
    try {
      sessionStorage.setItem(RETURN_PATH_KEY, currentPath);
    } catch {
      // ignore
    }

    await clearAllCaches();

    // Emit telemetry event (client-side queue; backend in Phase 3)
    const from = currentVersion?.version ?? getBuildTimeVersion().version;
    const to = latestVersion?.version ?? from;
    const event = {
      event: 'version_update_initiated',
      from,
      to,
      trigger: updateSeverity === 'critical' ? 'critical_modal' : 'button',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };
    try {
      const pending = JSON.parse(localStorage.getItem('tgclinic:pendingTelemetry') || '[]');
      pending.push(event);
      localStorage.setItem('tgclinic:pendingTelemetry', JSON.stringify(pending));
    } catch {
      // ignore
    }

    // Wipe localStorage only on critical updates (Q2 decision)
    if (updateSeverity === 'critical') {
      try {
        const keysToKeep = new Set([RETURN_PATH_KEY, JUST_UPDATED_KEY, TARGET_VERSION_KEY, 'tgclinic:pendingTelemetry']);
        for (const key of Object.keys(localStorage)) {
          if (!keysToKeep.has(key)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore
      }
    }

    localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());
    if (latestVersion) {
      localStorage.setItem(TARGET_VERSION_KEY, latestVersion.version);
    }
    clearSnooze();
    postBroadcast({ type: 'applyUpdate' });

    // Build cache-busting URL using server commit hash for debuggability
    const returnPath = sessionStorage.getItem(RETURN_PATH_KEY) || currentPath;
    const url = new URL(returnPath, window.location.origin);
    const cacheBuster = latestVersion?.gitCommit ?? Date.now().toString();
    url.searchParams.set('_v', cacheBuster);

    window.location.replace(url.toString());
  }, [currentVersion, latestVersion, updateSeverity, postBroadcast]);
  // expose stable applyUpdate ref for bc callback
  const applyUpdateRef = useRef(applyUpdate);
  useEffect(() => { applyUpdateRef.current = applyUpdate; }, [applyUpdate]);

  const snoozeUpdate = useCallback(() => {
    const until = Date.now() + SNOOZE_DURATION_MS;
    setSnoozeUntil(until);
    setIsUpdateAvailable(false);
    setIsSnoozed(true);
    hasNotifiedRef.current = false;
    postBroadcast({ type: 'snoozed', until });
  }, [postBroadcast]);

  const dismissUpdate = useCallback(() => {
    snoozeUpdate();
  }, [snoozeUpdate]);

  // Polling setup
  useEffect(() => {
    if (!enabled) return;

    checkRef.current();

    const forceCheckTimeout = setTimeout(() => {
      justUpdatedRef.current = false;
      checkRef.current(true);
    }, 31000);

    const intervalId = setInterval(() => checkRef.current(), pollInterval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkRef.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(forceCheckTimeout);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, pollInterval]);

  return {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    updateSeverity,
    isSnoozed,
    countdownRemaining,
    isChecking,
    error,
    checkForUpdates,
    applyUpdate,
    snoozeUpdate,
    dismissUpdate,
  };
}

export default useVersionCheck;
