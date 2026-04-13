# PRD: Fix Force Update Mechanism

## Problem Statement

The current app update mechanism is not reliably forcing users to update when a new version is deployed. Users can indefinitely dismiss update notifications, and the system fails to detect updates when only the git commit changes but the semantic version remains the same. This causes users to stay on stale versions indefinitely, leading to:
- Stale JavaScript bundles being served from cache
- Client/server version mismatches causing API errors  
- Users missing critical bug fixes and security patches
- Support burden from users reporting already-fixed issues

## Solution

Implement a **mandatory update system** with the following characteristics:
1. **Two-tier update severity**: Regular updates (dismissible) vs Critical/Forced updates (non-dismissible, modal blocking UI)
2. **Commit-aware version detection**: Detect updates even when semver is identical but commit differs
3. **Snooze instead of dismiss**: Regular updates can be snoozed for 24 hours, not permanently dismissed
4. **Auto-reload for forced updates**: Critical updates automatically reload the page after a countdown
5. **Grace period fix**: Post-reload verification must properly detect if the update actually succeeded

## User Stories

1. As a clinic administrator, I want the app to automatically update when critical security patches are deployed, so that my patient data remains secure without me having to manually click buttons.

2. As a receptionist using the app daily, I want update notifications to reappear after a reasonable snooze period if I dismiss them, so that I don't accidentally stay on an outdated version forever.

3. As a developer deploying hotfixes, I want updates to be detected even when I forget to bump the patch version number, so that users receive the fix immediately via the git commit change detection.

4. As a clinic manager with limited technical knowledge, I want critical updates to clearly explain why I must update now with a countdown timer, so that I understand the urgency and don't lose unsaved work.

5. As a user working on an important task, I want non-critical updates to allow a 24-hour snooze option, so that I can finish my current workflow without immediate interruption.

6. As a support technician, I want to see both the semantic version and git commit in the version display, so that I can verify users are actually on the deployed version they claim to be.

7. As a system administrator, I want forced updates to preserve the user's current route and query parameters after reload, so that users return to exactly where they were working.

8. As a product manager, I want update severity to be configurable via the CHANGELOG.json metadata, so that we can designate certain releases as "critical" requiring forced updates.

9. As a QA engineer, I want the update mechanism to have comprehensive test coverage including simulated version mismatches, so that we can catch regressions in this critical system.

10. As a user on a slow connection, I want the update check to have a timeout and retry logic, so that temporary network issues don't break the update detection.

11. As a developer, I want the update grace period to correctly detect when a reload failed to fetch the new bundle, so that the update notification persists until the new version is actually loaded.

12. As a user with multiple tabs open, I want all tabs to receive the update notification simultaneously via BroadcastChannel, so that I'm not stuck with stale versions in background tabs.

## Implementation Decisions

### Module: useVersionCheck Hook Enhancement

**Interface Changes:**
- Add `severity: 'regular' | 'critical'` to `VersionInfo` returned from server
- Add `snoozeUpdate(): void` method that sets a 24-hour snooze in localStorage
- Add `isSnoozed: boolean` return value indicating if current update is snoozed
- Add `updateSeverity: 'regular' | 'critical' | null` return value
- Modify `dismissUpdate()` to be deprecated in favor of `snoozeUpdate()`

**Behavior Changes:**
- `isNewerVersion()` must compare BOTH semantic version AND git commit hash
- If `semver === 0` (identical versions) but `commit !== server.commit`, consider it an update
- `checkForUpdates()` during grace period must NOT suppress notifications if server version is newer
- `ACCEPTED_VERSION_KEY` mechanism should be removed — it causes false positives

### Module: VersionDisplay Component Enhancement

**UI States:**
1. **No update**: Current badge behavior (unchanged)
2. **Regular update**: Orange notification card with "Update Now" and "Snooze 24h" buttons
3. **Critical update**: Modal overlay blocking interaction with countdown timer (10s) then auto-reload

**Persistence:**
- Snooze state stored in `localStorage` with key `tgclinic:updateSnoozeUntil` (timestamp)
- Check snooze expiry on every `checkForUpdates()` call

### Module: Version Comparison Logic

**Algorithm:**
```
function hasUpdate(current: VersionInfo, server: VersionInfo): boolean {
  // Primary: semver comparison
  if (isSemverNewer(current.version, server.version)) return true;
  
  // Secondary: commit comparison (if same semver, different commit)
  if (current.version === server.version && 
      current.gitCommit !== server.gitCommit) return true;
      
  return false;
}
```

### Module: CHANGELOG.json Schema Extension

**New Fields:**
```json
{
  "version": "0.10.1",
  "severity": "critical", // "regular" | "critical"
  "forceUpdate": true,    // boolean
  "date": "2026-04-13",
  ...
}
```

### Module: BroadcastChannel Cross-Tab Sync

**Behavior:**
- On update detection, broadcast message to all tabs
- All tabs show update notification simultaneously
- When user clicks "Update Now" in one tab, all tabs reload

### API Contract: version.json

**Current Fields (unchanged):**
- `version`: string (semver)
- `buildTime`: ISO string
- `gitCommit`: short sha
- `gitBranch`: string

**New Optional Fields:**
- `severity`: "regular" | "critical"
- `forceUpdate`: boolean
- `updateDeadline`: ISO timestamp (after which force update triggers)

## Testing Decisions

**Testing Philosophy:**
- Test external behavior (user sees update, clicks button, page reloads)
- Mock `fetch()` for version.json responses
- Mock `localStorage` for persistence testing
- Do NOT test internal implementation details like ref values

**Test Scenarios:**
1. Server has newer semver → Update detected, regular notification shown
2. Server has same semver, different commit → Update detected
3. Update dismissed/snoozed → Notification hidden, reappears after snooze expiry
4. Critical update detected → Modal shown, countdown starts, auto-reload fires
5. Grace period after reload → Should verify actual version, suppress only if matched
6. Multiple tabs → BroadcastChannel syncs update state
7. Network failure → Retry with exponential backoff, show error state

**Prior Art:**
- `website/src/__tests__/useVersionCheck.test.ts` — Extend existing tests
- Use `@testing-library/react` for component tests
- Use `vi.useFakeTimers()` for countdown testing

## Out of Scope

- Offline update queueing (updates only checked when online)
- Delta/patch updates (always full page reload)
- Background service worker updates (keep current SW behavior)
- User-customizable snooze duration (fixed 24h)
- Partial/chunked update downloads (single-page app reload)

## Further Notes

### Migration Path
1. Phase 1: Fix `isNewerVersion()` to detect commit changes (immediate fix)
2. Phase 2: Replace dismiss with snooze mechanism
3. Phase 3: Add critical update severity with auto-reload
4. Phase 4: Add BroadcastChannel cross-tab sync

### Security Considerations
- `version.json` should be served with `Cache-Control: no-cache` headers (already implemented)
- Update mechanism should NOT auto-execute arbitrary code — only full page reload
- CHANGELOG.json should be sanitized to prevent XSS in release notes rendering

### Performance Considerations
- Polling every 5 minutes is acceptable (unchanged)
- Version check is lightweight (~500 bytes for version.json)
- BroadcastChannel fallback to `localStorage` events for older browsers

### Backward Compatibility
- `dismissUpdate()` remains functional but deprecated
- `version.json` without `severity` field defaults to "regular"
- Old dismissed versions in localStorage should be migrated to snooze format or cleared
