import type { UpdateSeverity, VersionInfo } from './types';

export function getBuildTimeVersion(): VersionInfo {
  const version = (globalThis as Record<string, unknown>).__APP_VERSION__ as string | undefined ?? '0.0.0-dev';
  const buildTime = (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ as string | undefined ?? new Date().toISOString();
  const gitCommit = (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ as string | undefined ?? 'unknown';
  const gitBranch = (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ as string | undefined ?? 'unknown';

  return { version, buildTime, gitCommit, gitBranch };
}

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

export function hasUpdate(current: VersionInfo, latest: VersionInfo): boolean {
  if (isSemverNewer(current, latest)) return true;
  return current.gitCommit !== latest.gitCommit;
}

export function getUpdateSeverity(serverVersion: VersionInfo): UpdateSeverity {
  if (serverVersion.forceUpdate) return 'critical';
  if (serverVersion.severity === 'critical') return 'critical';
  return 'regular';
}

export async function fetchVersion(): Promise<VersionInfo> {
  const cacheBuster = `?t=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`/api/version.json${cacheBuster}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
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

export async function clearAllCaches(): Promise<void> {
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
