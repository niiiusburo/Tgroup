import { vi } from 'vitest';
import type { VersionInfo } from '@/hooks/useVersionCheck';

export const mockV1: VersionInfo = {
  version: '0.8.4',
  buildTime: '2026-04-13T10:00:00Z',
  gitCommit: 'abc1234',
  gitBranch: 'main',
};

export const mockV2SameSemver: VersionInfo = {
  version: '0.8.4',
  buildTime: '2026-04-13T11:00:00Z',
  gitCommit: 'def5678',
  gitBranch: 'main',
};

export const mockV3NewerSemver: VersionInfo = {
  version: '0.10.1',
  buildTime: '2026-04-13T12:00:00Z',
  gitCommit: 'ghi9012',
  gitBranch: 'main',
  severity: 'regular',
};

export const mockV4Critical: VersionInfo = {
  version: '0.10.2',
  buildTime: '2026-04-13T13:00:00Z',
  gitCommit: 'jkl3456',
  gitBranch: 'main',
  severity: 'critical',
  forceUpdate: true,
};

export function setupFakeFetch(response: VersionInfo) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => response,
  } as Response);
}

export function setupFakeFetchSequence(responses: VersionInfo[]) {
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
