# TG Clinic Auto-Update Version System

## Overview

This system automatically detects when a new version of the app is deployed and prompts users to refresh. It solves the browser cache problem where old code continues running after deployment.

## How It Works

1. **Build-time Version Injection**: Vite injects version info (git commit, build time, version number) into the app
2. **Version File Generation**: A `version.json` file is created in the dist folder with the same info
3. **Polling**: The app periodically fetches `version.json` from the server (every 5 minutes)
4. **Comparison**: If the server version differs from the running version, an update notification appears
5. **Auto-refresh**: User clicks "Update Now" to reload with the latest code

## Files

| File | Purpose |
|------|---------|
| `scripts/generate-version.js` | Generates version.json with git info |
| `src/hooks/useVersionCheck.ts` | Hook that polls for updates |
| `src/components/shared/VersionDisplay.tsx` | UI component showing version + update prompt |
| `src/types/version.d.ts` | TypeScript declarations for global version vars |
| `public/version.json` | Dev version file (served during development) |
| `dist/version.json` | Production version file (auto-generated on build) |

## Usage

### Development

```bash
# Start dev server
npm run dev

# View version info
Click the version text in the sidebar footer

# Manually check for updates
Click the version text - it will fetch the latest version.json
```

### Production Build

```bash
# Build with version generation
npm run build

# Or explicitly
npm run version  # Generates version.json
npm run build    # Builds app and copies version.json
```

### Version Display

The version display appears in:
- **Sidebar footer**: Shows `v0.0.0 (e04c461)` 
- **Hover tooltip**: Shows detailed build info
- **Update notification**: Orange toast when new version available

## Configuration

### Change Polling Interval

```typescript
// In your component
const version = useVersionCheck({
  pollInterval: 60 * 1000, // Check every minute (default: 5 min)
  enabled: true,
});
```

### Disable Auto-Check

```typescript
const version = useVersionCheck({
  enabled: false, // Manual checking only
});

// Then manually check:
<button onClick={version.checkForUpdates}>Check for Updates</button>
```

## Version JSON Format

```json
{
  "version": "0.0.0",
  "buildTime": "2026-04-08T04:20:31.248Z",
  "gitCommit": "e04c461e",
  "gitBranch": "ai-develop",
  "environment": "production"
}
```

## Cache Busting Strategy

1. **version.json**: Always fetched with `?t={timestamp}` to bypass cache
2. **JS/CSS chunks**: Vite adds content hashes to filenames
3. **Index.html**: Should be served with `Cache-Control: no-cache` on your web server

## Troubleshooting

### Version not showing
- Check that `public/version.json` exists
- Check browser console for fetch errors
- Ensure the server is serving `version.json`

### Update not detected
- Verify `version.json` was updated after deployment
- Check that git commit or version changed
- Clear browser cache and try again

### False positives
- The system compares by git commit first, then version, then build time
- Make sure your build process includes the git commit

## Integration with CI/CD

For automatic version updates in your deployment pipeline:

```bash
# In your CI/CD script
npm ci
npm run build  # This generates version.json automatically
# Deploy dist/ folder to your server
```

The version will automatically reflect:
- Package.json version
- Git commit hash
- Git branch name
- Build timestamp

## User Experience

When an update is available:
1. User sees an orange notification in the bottom-right corner
2. Notification says "Update Available" with "Update Now" / "Later" buttons
3. Clicking "Update Now" reloads the page with new code
4. Clicking "Later" dismisses until the next version check (5 minutes)

During normal operation:
- Version shows as `v0.0.0 (abc1234)` in sidebar footer
- Green checkmark indicates app is up-to-date
- Hover to see detailed build info
- Click to manually check for updates
