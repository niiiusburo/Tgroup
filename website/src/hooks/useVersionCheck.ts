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
import {
  ACCEPTED_VERSION_KEY,
  BROADCAST_CHANNEL_NAME,
  CRITICAL_AUTO_RELOAD_SECONDS,
  JUST_UPDATED_KEY,
  RETURN_PATH_KEY,
  SNOOZE_DURATION_MS,
  TARGET_VERSION_KEY,
} from './useVersionCheck/constants';
import {
  checkJustUpdated,
  clearSnooze,
  consumeReturnPath,
  getSnoozeUntil,
  migrateLegacyDismissal,
  setSnoozeUntil,
} from './useVersionCheck/storage';
import { flushPendingTelemetry, queueVersionTelemetry } from './useVersionCheck/telemetry';
import type {
  BroadcastMessage,
  UpdateSeverity,
  UseVersionCheckOptions,
  UseVersionCheckReturn,
  VersionInfo,
} from './useVersionCheck/types';
import {
  clearAllCaches,
  fetchVersion,
  getBuildTimeVersion,
  getUpdateSeverity,
  hasUpdate,
} from './useVersionCheck/versionUtils';

export { consumeReturnPath } from './useVersionCheck/storage';
export { getBuildTimeVersion, hasUpdate } from './useVersionCheck/versionUtils';
export type { UpdateSeverity, VersionInfo } from './useVersionCheck/types';

declare global {
  interface Window {
    __APP_VERSION__?: string;
    __APP_BUILD_TIME__?: string;
    __APP_GIT_COMMIT__?: string;
    __APP_GIT_BRANCH__?: string;
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

    // Flush any queued telemetry from previous sessions
    void flushPendingTelemetry();

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
        if (targetVersion === buildVersion.version) {
          queueVersionTelemetry({
            event: 'version_update_succeeded',
            from: targetVersion,
            to: buildVersion.version,
            trigger: 'button',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          });
        } else {
          queueVersionTelemetry({
            event: 'version_update_failed',
            from: targetVersion,
            to: buildVersion.version,
            trigger: 'button',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          });
        }
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
    queueVersionTelemetry(event);

    // Wipe storage only on critical updates (Q2 decision)
    if (updateSeverity === 'critical') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Re-preserve the minimal keys needed for the reload mechanism
        sessionStorage.setItem(RETURN_PATH_KEY, currentPath);
        localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());
        if (latestVersion) {
          localStorage.setItem(TARGET_VERSION_KEY, latestVersion.version);
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
