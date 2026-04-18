# Version System

**Current Version:** `0.1.6` - Fixed React hooks error in VersionDisplay, version update working correctly

Auto-update notification system solves browser cache issues:

| Component | Location | Purpose |
|-----------|----------|---------|
| `VersionDisplay` | `components/shared/VersionDisplay.tsx` | Shows version in sidebar + update notifications |
| `useVersionCheck` | `hooks/useVersionCheck.ts` | Polls for updates every 5 minutes |
| `version.json` | `public/version.json` | Build metadata (version, git commit, build time) |
| `generate-version.js` | `scripts/generate-version.js` | Creates version.json at build time |

## CRITICAL: Update Version on Every Change

To ensure the auto-update system works and users get the latest code, you MUST update the version number in `website/package.json` every time you make changes:

```bash
# Before building, update the version
# Open website/package.json and change:
# "version": "0.0.0" → "version": "0.0.1" (or higher)

# Semantic versioning guide:
# - Patch (0.0.1 → 0.0.2): Bug fixes, small tweaks
# - Minor (0.0.2 → 0.1.0): New features, components
# - Major (0.1.0 → 1.0.0): Breaking changes, architecture shifts
```

## Build Process

```bash
cd website

# 1. Update version in package.json
# 2. Build (automatically generates version.json with git info)
npm run build

# 3. Deploy dist/ folder
```

## How Users Get Updates

1. User has version `v0.0.1 (abc1234)` running
2. You deploy version `v0.0.2 (def5678)`
3. App detects version change within 5 minutes
4. Sidebar shows: "Update Available" + "Update Now" button
5. User clicks button → page reloads with new code
6. No more "hard refresh" or "clear cache" needed!

## Features

- Version shows as `v0.0.0 (abc1234)` in sidebar footer
- Green checkmark = up to date
- Orange notification = update available
- Hover for detailed build info (timestamp, git branch)
- Click version to manually check for updates
