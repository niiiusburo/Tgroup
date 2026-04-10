/**
 * Version Check Hook
 *
 * Polls for app updates and notifies when a new version is available.
 * This solves the browser cache problem by detecting when a new build is deployed.
 *
 * @crossref:used-in[App, Layout, VersionDisplay]
 *
 * Usage:
 *   const { currentVersion, latestVersion, isUpdateAvailable, checkForUpdates, applyUpdate } = useVersionCheck();
 *
 * How it works:
 * 1. On mount, fetches /version.json to get current deployed version
 * 2. Polls every 5 minutes (configurable) for changes
 * 3. When version changes, sets isUpdateAvailable = true
 * 4. User can click "Update" to reload the page with new code
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Version info structure matching version.json
export interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit: string;
  gitBranch: string;
  environment?: string;
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
  /** True while checking for updates */
  isChecking: boolean;
  /** Last error if check failed */
  error: Error | null;
  /** Manually trigger a version check */
  checkForUpdates: () => Promise<void>;
  /** Apply the update by reloading the page */
  applyUpdate: () => Promise<void>;
  /** Dismiss the update notification (until next check) */
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

// localStorage keys
const DISMISSED_VERSION_KEY = 'tgclinic:dismissedVersion';
// const LAST_UPDATE_CHECK_KEY = 'tgclinic:lastUpdateCheck';
const JUST_UPDATED_KEY = 'tgclinic:justUpdated';
const TARGET_VERSION_KEY = 'tgclinic:targetVersion'; // Version we're trying to update to

/**
 * Check if we just completed an update (based on URL param or localStorage)
 */
function checkJustUpdated(): boolean {
  // Check URL param first
  const url = new URL(window.location.href);
  if (url.searchParams.has('_v')) {
    // Clean up the URL param
    url.searchParams.delete('_v');
    window.history.replaceState({}, '', url.toString());
    // Mark as just updated in localStorage with timestamp
    localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());
    return true;
  }

  // Check localStorage for recent update (within last 30 seconds)
  const justUpdated = localStorage.getItem(JUST_UPDATED_KEY);
  if (justUpdated) {
    const timeSinceUpdate = Date.now() - parseInt(justUpdated, 10);
    if (timeSinceUpdate < 30000) {
      return true;
    }
    // Clear stale marker
    localStorage.removeItem(JUST_UPDATED_KEY);
  }

  return false;
}

/**
 * Get dismissed version from localStorage
 */
function getDismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Save dismissed version to localStorage
 */
function setDismissedVersion(versionKey: string): void {
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, versionKey);
  } catch {
    // Ignore localStorage errors (private mode, etc.)
  }
}

/**
 * Clear dismissed version
 */
function clearDismissedVersion(): void {
  try {
    localStorage.removeItem(DISMISSED_VERSION_KEY);
    // NOTE: do NOT remove JUST_UPDATED_KEY here — it has its own
    // 30-second expiry in checkJustUpdated() and is needed for the
    // post-reload grace period.
  } catch {
    // Ignore
  }
}

export function getBuildTimeVersion(): VersionInfo {
  // Use globalThis because Vite's define plugin replaces globalThis.__APP_VERSION__
  // at build time, but does NOT replace window.__APP_VERSION__.
  const version = (globalThis as Record<string, unknown>).__APP_VERSION__ as string | undefined ?? '0.0.0';
  const buildTime = (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ as string | undefined ?? new Date().toISOString();
  const gitCommit = (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ as string | undefined ?? 'unknown';
  const gitBranch = (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ as string | undefined ?? 'unknown';

  return {
    version,
    buildTime,
    gitCommit,
    gitBranch,
  };
}

/**
 * Fetches version.json with cache-busting
 */
async function fetchVersion(): Promise<VersionInfo> {
  // Add cache-busting query param to prevent browser caching
  const cacheBuster = `?t=${Date.now()}`;
  const response = await fetch(`/version.json${cacheBuster}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch version: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parse semantic version string to comparable parts
 * Handles versions like "0.1.7", "1.2.3-beta", "2.0.0-rc.1"
 */
function parseVersion(version: string): { major: number; minor: number; patch: number; prerelease: string } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, prerelease: '' };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
  };
}

/**
 * Compare two versions to check if latest is actually newer than current
 */
function isNewerVersion(current: VersionInfo, latest: VersionInfo): boolean {
  // Parse version numbers for comparison
  const currentV = parseVersion(current.version);
  const latestV = parseVersion(latest.version);

  // Compare version numbers first (semantic versioning)
  if (latestV.major > currentV.major) return true;
  if (latestV.major < currentV.major) return false;
  if (latestV.minor > currentV.minor) return true;
  if (latestV.minor < currentV.minor) return false;
  if (latestV.patch > currentV.patch) return true;
  if (latestV.patch < currentV.patch) return false;

  // Same version number - no update needed
  // (dev server restarts change git commit but not version)
  return false;
}

/**
 * Clear all browser caches comprehensively
 */
async function clearAllCaches(): Promise<void> {
  // 1. Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch {
      // Ignore service worker errors
    }
  }

  // 2. Clear Cache API
  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch {
      // Ignore cache API errors
    }
  }

  // 3. Clear localStorage items that might cache version info (but NOT auth)
  // We intentionally do NOT clear localStorage here to preserve login session
}

export function useVersionCheck(options: UseVersionCheckOptions = {}): UseVersionCheckReturn {
  const {
    pollInterval = 5 * 60 * 1000, // 5 minutes
    enabled = true,
    onUpdateAvailable,
  } = options;

  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track if we've shown the update notification
  const hasNotifiedRef = useRef(false);

  // Store dismissed version to prevent re-showing (persisted in localStorage)
  const dismissedVersionRef = useRef<string | null>(getDismissedVersion());

  // Track if we just completed an update (grace period to avoid immediate re-check)
  const justUpdatedRef = useRef<boolean>(checkJustUpdated());

  // Periodically refresh justUpdatedRef from localStorage (to handle reload cases)
  // Without this, justUpdatedRef.current stays true forever after reload
  useEffect(() => {
    const intervalId = setInterval(() => {
      const isStillRecent = checkJustUpdated();
      if (!isStillRecent && justUpdatedRef.current) {
        justUpdatedRef.current = false;
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Initialize with build-time version
  // BUT: if we just reloaded after an update and the build version doesn't match
  // what's on the server, use the server version to avoid an infinite update loop.
  useEffect(() => {
    const buildVersion = getBuildTimeVersion();

    // Check if we just completed an update
    const justUpdated = checkJustUpdated();
    const targetVersion = localStorage.getItem(TARGET_VERSION_KEY);

    if (justUpdated && targetVersion && targetVersion !== buildVersion.version) {
      setCurrentVersion({
        version: targetVersion,
        buildTime: buildVersion.buildTime,
        gitCommit: buildVersion.gitCommit,
        gitBranch: buildVersion.gitBranch,
      });
      // Clean up
      localStorage.removeItem(TARGET_VERSION_KEY);
    } else {
      setCurrentVersion(buildVersion);
    }
  }, []);

  /**
   * Check for updates by fetching version.json
   *
   * IMPORTANT: After a reload (applyUpdate), this MUST run to verify the update
   * actually took effect. The justUpdatedRef grace period is only for the initial
   * polling to avoid showing "update available" immediately after reloading.
   */
  const checkForUpdates = useCallback(async (forceCheck = false) => {
    if (!enabled) return;

    // Skip check if we just updated (give it 30 seconds grace period)
    // EXCEPT if forceCheck is true (used to verify update after reload)
    if (justUpdatedRef.current && !forceCheck) {
      // Still fetch version to verify we got the update (but don't show notification)
      try {
        const serverVersion = await fetchVersion();
        const current = currentVersion || getBuildTimeVersion();
        // If versions match, we successfully updated!
        if (!isNewerVersion(current, serverVersion)) {
          setIsUpdateAvailable(false);
          clearDismissedVersion();
          hasNotifiedRef.current = false;
        } else {
          // Versions still don't match after reload — the JS bundle wasn't actually updated.
          // Accept the server version as truth (we intentionally reloaded) to avoid
          // an infinite update loop. This happens in dev mode when version.json
          // was updated but the dev server wasn't restarted.
          setCurrentVersion(serverVersion);
          setLatestVersion(serverVersion);
          setIsUpdateAvailable(false);
          clearDismissedVersion();
          hasNotifiedRef.current = false;
        }
      } catch {
        // Ignore grace period check failures
      }

      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const serverVersion = await fetchVersion();
      setLatestVersion(serverVersion);

      const current = currentVersion || getBuildTimeVersion();
      const hasUpdate = isNewerVersion(current, serverVersion);

      // Check if this version was already dismissed (from ref or localStorage)
      const versionKey = `${serverVersion.version}|${serverVersion.gitCommit}`;
      const wasDismissed = dismissedVersionRef.current === versionKey ||
                          getDismissedVersion() === versionKey;

      if (hasUpdate && !wasDismissed) {
        setIsUpdateAvailable(true);

        if (onUpdateAvailable && !hasNotifiedRef.current) {
          onUpdateAvailable(current, serverVersion);
          hasNotifiedRef.current = true;
        }
      } else {
        setIsUpdateAvailable(false);
        // Clear dismissed version if we're now up to date
        if (!hasUpdate) {
          clearDismissedVersion();
          dismissedVersionRef.current = null;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsChecking(false);
    }
  }, [enabled, currentVersion, onUpdateAvailable]);

  // Ref to hold the latest checkForUpdates without re-triggering polling effect
  const checkRef = useRef(checkForUpdates);
  useEffect(() => { checkRef.current = checkForUpdates; }, [checkForUpdates]);

  /**
   * Apply the update by clearing all caches and reloading
   * Preserves login session by NOT clearing localStorage
   *
   * IMPORTANT: This requires a NEW DEPLOYMENT first!
   * If the server hasn't been deployed with new code, this will just reload
   * the same version. The update detection works by comparing version.json.
   */
  const applyUpdate = useCallback(async () => {
    // Clear all caches comprehensively
    await clearAllCaches();

    // Mark that we're about to update (cleared on successful load of new version)
    localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());

    // Store the target version we're trying to update to
    if (latestVersion) {
      localStorage.setItem(TARGET_VERSION_KEY, latestVersion.version);
    }

    // Clear dismissed version so we don't carry it over
    clearDismissedVersion();

    // Force reload with cache-busting timestamp
    // Use replace() to remove current URL from history, then set new URL
    const timestamp = Date.now();
    const baseUrl = window.location.href.split('?')[0];
    const newUrl = `${baseUrl}?_v=${timestamp}`;

    // Small delay to let cache clearing complete
    setTimeout(() => {
      window.location.replace(newUrl);
    }, 100);
  }, [latestVersion]);

  /**
   * Dismiss the update notification (persists in localStorage)
   */
  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
    hasNotifiedRef.current = false;

    // Remember this version was dismissed (in both ref and localStorage)
    if (latestVersion) {
      const versionKey = `${latestVersion.version}|${latestVersion.gitCommit}`;
      dismissedVersionRef.current = versionKey;
      setDismissedVersion(versionKey);
    }
  }, [latestVersion]);

  // Set up polling — uses checkRef to avoid timer thrashing when checkForUpdates changes
  useEffect(() => {
    if (!enabled) return;

    // Initial check (will skip due to grace period, but verifies version)
    checkRef.current();

    // Schedule a FORCE check 31 seconds after load (after grace period ends)
    // This ensures we verify the update actually took effect
    const forceCheckTimeout = setTimeout(() => {
      justUpdatedRef.current = false; // Explicitly clear the ref
      checkRef.current(true); // Force check to verify version
    }, 31000);

    // Set up regular polling interval
    const intervalId = setInterval(() => checkRef.current(), pollInterval);

    // Also check when user comes back to the page
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
  }, [enabled, pollInterval]); // checkForUpdates removed — uses checkRef instead

  return {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    isChecking,
    error,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
  };
}

export default useVersionCheck;
