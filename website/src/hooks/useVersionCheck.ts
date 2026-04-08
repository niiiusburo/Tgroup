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

// Build-time injected version (fallback)
declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;
declare const __APP_GIT_COMMIT__: string;
declare const __APP_GIT_BRANCH__: string;

function getBuildTimeVersion(): VersionInfo {
  return {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    buildTime: typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : new Date().toISOString(),
    gitCommit: typeof __APP_GIT_COMMIT__ !== 'undefined' ? __APP_GIT_COMMIT__ : 'unknown',
    gitBranch: typeof __APP_GIT_BRANCH__ !== 'undefined' ? __APP_GIT_BRANCH__ : 'unknown',
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
 * Compare two versions to check if they're different
 */
function isNewerVersion(current: VersionInfo, latest: VersionInfo): boolean {
  // Compare by git commit first (most reliable)
  if (current.gitCommit !== latest.gitCommit && latest.gitCommit !== 'unknown') {
    return true;
  }
  
  // Fall back to version string comparison
  if (current.version !== latest.version) {
    return true;
  }
  
  // Fall back to build time
  return current.buildTime !== latest.buildTime;
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
  
  // Store dismissed version to prevent re-showing
  const dismissedVersionRef = useRef<string | null>(null);

  // Initialize with build-time version
  useEffect(() => {
    setCurrentVersion(getBuildTimeVersion());
  }, []);

  /**
   * Check for updates by fetching version.json
   */
  const checkForUpdates = useCallback(async () => {
    if (!enabled) return;
    
    setIsChecking(true);
    setError(null);
    
    try {
      const serverVersion = await fetchVersion();
      setLatestVersion(serverVersion);
      
      const current = currentVersion || getBuildTimeVersion();
      const hasUpdate = isNewerVersion(current, serverVersion);
      
      // Check if this version was already dismissed
      const wasDismissed = dismissedVersionRef.current === serverVersion.gitCommit + serverVersion.buildTime;
      
      if (hasUpdate && !wasDismissed) {
        setIsUpdateAvailable(true);
        
        if (onUpdateAvailable && !hasNotifiedRef.current) {
          onUpdateAvailable(current, serverVersion);
          hasNotifiedRef.current = true;
        }
      } else {
        setIsUpdateAvailable(false);
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
   * Dismiss the update notification
   */
  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
    hasNotifiedRef.current = false;
    
    // Remember this version was dismissed
    if (latestVersion) {
      dismissedVersionRef.current = latestVersion.gitCommit + latestVersion.buildTime;
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
