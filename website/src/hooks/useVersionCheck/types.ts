export type UpdateSeverity = 'regular' | 'critical';

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

export interface UseVersionCheckOptions {
  pollInterval?: number;
  enabled?: boolean;
  onUpdateAvailable?: (current: VersionInfo, latest: VersionInfo) => void;
}

export interface UseVersionCheckReturn {
  currentVersion: VersionInfo | null;
  latestVersion: VersionInfo | null;
  isUpdateAvailable: boolean;
  updateSeverity: UpdateSeverity | null;
  isSnoozed: boolean;
  countdownRemaining: number | null;
  isChecking: boolean;
  error: Error | null;
  checkForUpdates: (forceCheck?: boolean) => Promise<void>;
  applyUpdate: () => Promise<void>;
  snoozeUpdate: () => void;
  dismissUpdate: () => void;
}

export type BroadcastMessage =
  | { type: 'updateAvailable'; version: VersionInfo }
  | { type: 'applyUpdate' }
  | { type: 'snoozed'; until: number };
