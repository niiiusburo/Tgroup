import {
  DISMISSED_VERSION_KEY,
  JUST_UPDATED_GRACE_MS,
  JUST_UPDATED_KEY,
  RETURN_PATH_KEY,
  SNOOZE_UNTIL_KEY,
} from './constants';

export function checkJustUpdated(): boolean {
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

export function getSnoozeUntil(): number {
  try {
    const raw = localStorage.getItem(SNOOZE_UNTIL_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function setSnoozeUntil(until: number): void {
  try {
    localStorage.setItem(SNOOZE_UNTIL_KEY, until.toString());
  } catch {
    // ignore
  }
}

export function clearSnooze(): void {
  try {
    localStorage.removeItem(SNOOZE_UNTIL_KEY);
  } catch {
    // ignore
  }
}

export function migrateLegacyDismissal(): void {
  try {
    if (localStorage.getItem(DISMISSED_VERSION_KEY)) {
      localStorage.removeItem(DISMISSED_VERSION_KEY);
    }
  } catch {
    // ignore
  }
}

export function consumeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    sessionStorage.removeItem(RETURN_PATH_KEY);
    return path;
  } catch {
    return null;
  }
}
