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
const DISMISSED_VERSION_KEY = 'tdental:dismissedVersion';
// const LAST_UPDATE_CHECK_KEY = 'tdental:lastUpdateCheck';
const JUST_UPDATED_KEY = 'tdental:justUpdated';

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
    localStorage.removeItem(JUST_UPDATED_KEY);
  } catch {
    // Ignore
  }
}

function getBuildTimeVersion(): VersionInfo {
  // Try to get from Vite's define (window first, then fallback)
  const version = window.__APP_VERSION__ ?? '0.0.0';
  const buildTime = window.__APP_BUILD_TIME__ ?? new Date().toISOString();
  const gitCommit = window.__APP_GIT_COMMIT__ ?? 'unknown';
  const gitBranch = window.__APP_GIT_BRANCH__ ?? 'unknown';
  
  console.log('[VersionCheck] Build-time version loaded:', { version, gitCommit });
  
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
  console.log('[VersionCheck] Clearing all caches...');
  
  // 1. Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          console.log('[VersionCheck] Unregistering service worker:', reg.scope);
          await reg.unregister();
        })
      );
    } catch (err) {
      console.warn('[VersionCheck] Failed to unregister service workers:', err);
    }
  }
  
  // 2. Clear Cache API
  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(
        names.map(async (name) => {
          console.log('[VersionCheck] Deleting cache:', name);
          await caches.delete(name);
        })
      );
    } catch (err) {
      console.warn('[VersionCheck] Failed to clear caches:', err);
    }
  }
  
  // 3. Clear localStorage items that might cache version info (but NOT auth)
  // We intentionally do NOT clear localStorage here to preserve login session
  console.log('[VersionCheck] Preserving localStorage (auth session kept)');
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

  // Initialize with build-time version
  useEffect(() => {
    setCurrentVersion(getBuildTimeVersion());
  }, []);

  /**
   * Check for updates by fetching version.json
   */
  const checkForUpdates = useCallback(async () => {
    if (!enabled) return;
    
    // Skip check if we just updated (give it 30 seconds grace period)
    if (justUpdatedRef.current) {
      console.log('[VersionCheck] Skipping check - just updated');
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
      
      console.log('[VersionCheck] Check result:', {
        current: current.version,
        server: serverVersion.version,
        hasUpdate,
        wasDismissed,
      });
      
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
      console.error('[VersionCheck] Failed to check for updates:', err);
    } finally {
      setIsChecking(false);
    }
  }, [enabled, currentVersion, onUpdateAvailable]);

  /**
   * Apply the update by clearing all caches and reloading
   * Preserves login session by NOT clearing localStorage
   */
  const applyUpdate = useCallback(async () => {
    console.log('[VersionCheck] Applying update...');
    
    // Clear all caches comprehensively
    await clearAllCaches();
    
    // Mark that we're about to update (cleared on successful load of new version)
    localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());
    
    // Clear dismissed version so we don't carry it over
    clearDismissedVersion();
    
    // Force reload with cache-busting timestamp
    // Use replace() to remove current URL from history, then set new URL
    const timestamp = Date.now();
    const baseUrl = window.location.href.split('?')[0];
    const newUrl = `${baseUrl}?_v=${timestamp}`;
    
    console.log('[VersionCheck] Reloading to:', newUrl);
    
    // Small delay to let cache clearing complete
    setTimeout(() => {
      window.location.replace(newUrl);
    }, 100);
  }, []);

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
      console.log('[VersionCheck] Update dismissed:', versionKey);
    }
  }, [latestVersion]);

  // Set up polling
  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkForUpdates();

    // Set up interval
    const intervalId = setInterval(checkForUpdates, pollInterval);

    // Also check when user comes back to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, pollInterval, checkForUpdates]);

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
