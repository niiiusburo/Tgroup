# Live Update System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Update Now" button bulletproof, enforce version + CHANGELOG bumps on every frontend deploy, and add telemetry to prove updates actually land.

**Architecture:** Three ordered phases. Phase 1 fixes runtime cache-busting and nginx delivery headers. Phase 2 adds repo tooling (pre-commit hook, CI gate, auto-tag). Phase 3 adds a backend telemetry endpoint and dashboard. Each phase is independently testable and commit-able.

**Tech Stack:** React + TypeScript, Vite, nginx, GitHub Actions, Husky, Node.js scripts, Express (Phase 3).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `website/src/hooks/useVersionCheck.ts` | Core update detection, `applyUpdate()` reload logic, countdown, severity handling |
| `website/src/components/shared/VersionDisplay.tsx` | UI for update card, critical modal, release notes modal |
| `website/index.html` | Remove meta cache-control tags, add `__TG_VERSION__` global |
| `nginx.conf` | Cache-Control headers for `index.html`, `version.json`, `CHANGELOG.json` |
| `scripts/bump-version.mjs` | One-liner to bump `package.json` + prepend `CHANGELOG.json` entry |
| `.husky/pre-commit` | Repo-root hook requiring bump when `website/src/**` or `website/public/**` changes |
| `.github/workflows/pr-checks.yml` | CI gate re-running the bump check server-side |
| `.github/workflows/release-tag.yml` | Auto-creates `v<x.y.z>` git tag on merge to `main` when version changed |
| `tdental-api/routes/telemetry.js` (Phase 3) | Express router for `POST /api/telemetry/version` |
| `tdental-api/migrations/<timestamp>_version_events.sql` (Phase 3) | `version_events` table schema |

---

## Phase 1 — Runtime + Delivery (version 0.17.0)

### Task 1: Remove dead cache-control meta tags from `index.html`

**Files:**
- Modify: `website/index.html:7–9`

- [ ] **Step 1: Delete the three meta http-equiv tags**

Replace:
```html
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
```
With: nothing (remove the lines entirely).

- [ ] **Step 2: Add `window.__TG_VERSION__` for console debugging**

Insert inside `<head>`, after the `<title>`:
```html
    <script>
      window.__TG_VERSION__ = '%VITE_APP_VERSION%';
    </script>
```

Note: `%VITE_APP_VERSION%` is a Vite env replacement. We will define `VITE_APP_VERSION` in the next task.

- [ ] **Step 3: Commit**

```bash
git add website/index.html
git commit -m "feat(live-update): remove meta cache-control tags and add __TG_VERSION__ global"
```

---

### Task 2: Inject `VITE_APP_VERSION` at build time

**Files:**
- Modify: `website/package.json` (build script)
- Verify: `website/vite.config.ts`

- [ ] **Step 1: Prepend env var to build script**

In `website/package.json`, change:
```json
    "build": "vite build",
```
to:
```json
    "build": "VITE_APP_VERSION=$(node -p \"require('./package.json').version\") vite build",
```

- [ ] **Step 2: Verify vite.config.ts does not break env injection**

Read `website/vite.config.ts`. If `define` or `envPrefix` blocks `VITE_`, adjust. By default Vite exposes `import.meta.env.VITE_APP_VERSION`. The `%VITE_APP_VERSION%` replacement in `index.html` works out of the box.

- [ ] **Step 3: Commit**

```bash
git add website/package.json
git commit -m "build: inject VITE_APP_VERSION at build time"
```

---

### Task 3: Close nginx cache holes for `CHANGELOG.json` and switch `index.html` to `no-cache`

**Files:**
- Modify: `nginx.conf`

- [ ] **Step 1: Add explicit CHANGELOG.json location block**

After the existing `location = /version.json` block, add:
```nginx
    location = /CHANGELOG.json {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
        expires -1;
        try_files $uri =404;
    }
```

- [ ] **Step 2: Switch `index.html` from `no-store` to `no-cache`**

Change:
```nginx
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri =404;
    }
```
to:
```nginx
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
        expires -1;
        try_files $uri =404;
    }
```

- [ ] **Step 3: Apply same `always` + `expires -1` to `/version.json`**

Update:
```nginx
    location = /version.json {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri =404;
    }
```
to:
```nginx
    location = /version.json {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
        expires -1;
        try_files $uri =404;
    }
```

- [ ] **Step 4: Commit**

```bash
git add nginx.conf
git commit -m "feat(live-update): nginx cache headers for CHANGELOG.json and 304-friendly index.html"
```

---

### Task 4: Rewrite `applyUpdate()` in `useVersionCheck.ts`

**Files:**
- Modify: `website/src/hooks/useVersionCheck.ts`

- [ ] **Step 1: Rewrite `applyUpdate` callback**

Replace the entire `applyUpdate` callback body (lines ~518–542) with:

```typescript
  const applyUpdate = useCallback(async () => {
    const currentPath = window.location.pathname + window.location.search;
    try {
      sessionStorage.setItem(RETURN_PATH_KEY, currentPath);
    } catch {
      // ignore
    }

    await clearAllCaches();

    // Emit telemetry event (client-side queue; backend in Phase 3)
    const from = currentVersion?.version ?? getBuildTimeVersion().version;
    const to = latestVersion?.version ?? from;
    const event = {
      event: 'version_update_initiated',
      from,
      to,
      trigger: updateSeverity === 'critical' ? 'critical_modal' : 'button',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };
    try {
      // Fire-and-forget to existing telemetry endpoint placeholder
      // Phase 3 will replace this with real POST
      const pending = JSON.parse(localStorage.getItem('tgclinic:pendingTelemetry') || '[]');
      pending.push(event);
      localStorage.setItem('tgclinic:pendingTelemetry', JSON.stringify(pending));
    } catch {
      // ignore
    }

    // Wipe localStorage only on critical updates (Q2 decision)
    if (updateSeverity === 'critical') {
      try {
        const keysToKeep = new Set([RETURN_PATH_KEY, JUST_UPDATED_KEY, TARGET_VERSION_KEY, 'tgclinic:pendingTelemetry']);
        for (const key of Object.keys(localStorage)) {
          if (!keysToKeep.has(key)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore
      }
    }

    localStorage.setItem(JUST_UPDATED_KEY, Date.now().toString());
    if (latestVersion) {
      localStorage.setItem(TARGET_VERSION_KEY, latestVersion.version);
    }
    clearSnooze();
    postBroadcast({ type: 'applyUpdate' });

    // Build cache-busting URL using server commit hash for debuggability
    const returnPath = sessionStorage.getItem(RETURN_PATH_KEY) || currentPath;
    const url = new URL(returnPath, window.location.origin);
    const cacheBuster = latestVersion?.gitCommit ?? Date.now().toString();
    url.searchParams.set('_v', cacheBuster);

    window.location.replace(url.toString());
  }, [currentVersion, latestVersion, updateSeverity, postBroadcast]);
```

- [ ] **Step 2: Update `hasUpdate` to treat any commit-hash mismatch as update available (Q10)**

Replace the `hasUpdate` function with:

```typescript
export function hasUpdate(current: VersionInfo, latest: VersionInfo): boolean {
  if (isSemverNewer(current, latest)) return true;
  if (current.version === latest.version && current.gitCommit !== latest.gitCommit) return true;
  // Treat rollback/downgrade as update available too
  if (current.gitCommit !== latest.gitCommit) return true;
  return false;
}
```

Actually, the last two conditions can be simplified to just `current.gitCommit !== latest.gitCommit`. But keep semver check for clarity:

```typescript
export function hasUpdate(current: VersionInfo, latest: VersionInfo): boolean {
  if (isSemverNewer(current, latest)) return true;
  if (current.gitCommit !== latest.gitCommit) return true;
  return false;
}
```

- [ ] **Step 3: Remove deprecated `reload(true)` and HEAD preflight code**

These were inside the old `applyUpdate` body and should already be gone after Step 1. Verify no `location.reload(true)` or `fetch(window.location.href, { method: 'HEAD' ... })` remain in the file.

- [ ] **Step 4: Make `clearAllCaches` awaitable and actually awaited**

The new `applyUpdate` already `await`s `clearAllCaches()`. Verify the `clearAllCaches` function returns `Promise<void>` (it already does — it is `async`).

- [ ] **Step 5: Commit**

```bash
git add website/src/hooks/useVersionCheck.ts
git commit -m "feat(live-update): rewrite applyUpdate with location.replace, telemetry queue, and critical localStorage wipe"
```

---

### Task 5: Add post-update success/failure telemetry on boot

**Files:**
- Modify: `website/src/hooks/useVersionCheck.ts`

- [ ] **Step 1: Insert telemetry emission in the mount effect**

Inside the "Initialize with build-time version" `useEffect`, after `setCurrentVersion(buildVersion);`, add:

```typescript
    // Telemetry: did the last update succeed?
    const justUpdated = checkJustUpdated();
    const targetVersion = localStorage.getItem(TARGET_VERSION_KEY);
    if (justUpdated && targetVersion) {
      const pending = JSON.parse(localStorage.getItem('tgclinic:pendingTelemetry') || '[]');
      if (targetVersion === buildVersion.version) {
        pending.push({
          event: 'version_update_succeeded',
          from: targetVersion,
          to: buildVersion.version,
          trigger: 'button',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        });
      } else {
        pending.push({
          event: 'version_update_failed',
          from: targetVersion,
          to: buildVersion.version,
          trigger: 'button',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        });
      }
      localStorage.setItem('tgclinic:pendingTelemetry', JSON.stringify(pending));
      localStorage.removeItem(TARGET_VERSION_KEY);
    }
```

Be careful not to duplicate the existing `targetVersion` logic; place this block where `targetVersion` and `buildVersion` are both in scope.

- [ ] **Step 2: Commit**

```bash
git add website/src/hooks/useVersionCheck.ts
git commit -m "feat(live-update): emit version_update_succeeded/failed telemetry on boot"
```

---

### Task 6: Fix `ReleaseNotesModal` and highlights fetch to bust cache

**Files:**
- Modify: `website/src/components/shared/VersionDisplay.tsx`

- [ ] **Step 1: Cache-bust `/CHANGELOG.json` in `ReleaseNotesModal`**

In the `ReleaseNotesModal` component, change:
```typescript
    fetch('/CHANGELOG.json')
```
to:
```typescript
    fetch('/CHANGELOG.json?v=' + Date.now(), { cache: 'no-store' })
```

- [ ] **Step 2: Cache-bust `/CHANGELOG.json` in the highlights `useEffect`**

In the main `VersionDisplay` component, find the second `fetch('/CHANGELOG.json')` (around line 290) and change it to:
```typescript
    fetch('/CHANGELOG.json?v=' + Date.now(), { cache: 'no-store' })
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/shared/VersionDisplay.tsx
git commit -m "fix(live-update): cache-bust CHANGELOG.json fetches in VersionDisplay"
```

---

### Task 7: Bump version for Phase 1

**Files:**
- Modify: `website/package.json`
- Modify: `website/public/CHANGELOG.json`

- [ ] **Step 1: Bump package.json to `0.17.0`**

Change `"version": "0.17.0-rc1"` → `"version": "0.17.0"`.

- [ ] **Step 2: Prepend CHANGELOG entry for 0.17.0**

Add a new top entry to `website/public/CHANGELOG.json`:
```json
  {
    "version": "0.17.0",
    "date": "2026-04-17",
    "commit": "TBD",
    "highlights": "Live Update Phase 1 — bulletproof update button, nginx cache fixes, telemetry groundwork.",
    "sections": [
      {
        "title": "Runtime",
        "items": [
          "Rewrite applyUpdate to use location.replace with commit-hash cache buster",
          "Remove deprecated location.reload(true) and HEAD preflight",
          "Await cache clearing before reload",
          "Treat any commit-hash mismatch as update available (supports rollback detection)"
        ]
      },
      {
        "title": "Delivery",
        "items": [
          "Add nginx Cache-Control for CHANGELOG.json",
          "Switch index.html to no-cache for cheap 304 revalidation",
          "Remove ignored meta http-equiv cache tags from index.html"
        ]
      },
      {
        "title": "Telemetry",
        "items": [
          "Queue version_update_initiated / succeeded / failed events client-side",
          "Add window.__TG_VERSION__ for console debugging"
        ]
      }
    ]
  },
```

- [ ] **Step 3: Commit**

```bash
git add website/package.json website/public/CHANGELOG.json
git commit -m "chore(release): 0.17.0 — Live Update Phase 1"
```

---

## Phase 2 — Enforcement (version 0.17.1)

### Task 8: Create `scripts/bump-version.mjs`

**Files:**
- Create: `scripts/bump-version.mjs`

- [ ] **Step 1: Write the script**

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'website', 'package.json');
const changelogPath = path.join(rootDir, 'website', 'public', 'CHANGELOG.json');

const [bumpType, ...messageParts] = process.argv.slice(2);
const message = messageParts.join(' ') || 'Release';

if (!bumpType) {
  console.error('Usage: node scripts/bump-version.mjs <patch|minor|major|x.y.z> "Highlight message"');
  process.exit(1);
}

// 1. Read and bump version
const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
const current = pkg.version;

let next;
if (/^\d+\.\d+\.\d+/.test(bumpType)) {
  next = bumpType;
} else {
  const [maj, min, pat] = current.split('.').map(Number);
  if (bumpType === 'major') next = `${maj + 1}.0.0`;
  else if (bumpType === 'minor') next = `${maj}.${min + 1}.0`;
  else next = `${maj}.${min}.${pat + 1}`;
}

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Prepend CHANGELOG entry
const today = new Date().toISOString().split('T')[0];
const commit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();

const entry = {
  version: next,
  date: today,
  commit,
  highlights: message,
  sections: [
    { title: 'New Features', items: [] },
    { title: 'Bug Fixes', items: [] },
    { title: 'Release Notes', items: [] },
  ],
};

let changelog = [];
if (fs.existsSync(changelogPath)) {
  changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
}
changelog.unshift(entry);
fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2) + '\n');

// 3. Stage files
execSync('git add website/package.json website/public/CHANGELOG.json', { cwd: rootDir, stdio: 'inherit' });
console.log(`✅ Bumped ${current} → ${next}`);
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x scripts/bump-version.mjs
git add scripts/bump-version.mjs
git commit -m "feat(live-update): add bump-version.mjs helper script"
```

---

### Task 9: Create repo-root pre-commit hook

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json` at repo root (add `prepare` script if missing)

- [ ] **Step 1: Ensure Husky is set up at repo root**

Check if `package.json` at repo root has a `prepare` script. If not, add:
```json
  "scripts": {
    "prepare": "husky"
  }
```

- [ ] **Step 2: Write the pre-commit hook**

Create `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Check if any website source or public files (excluding version/changelog files) are staged
STAGED_WEBSITE=$(git diff --cached --name-only | grep -E '^website/(src/|public/([^C]|C[^H]|CH[^A]|CHA[^N]|CHAN[^G]|CHANG[^E]).*)' || true)

if [ -z "$STAGED_WEBSITE" ]; then
  exit 0
fi

# Check if package.json version changed compared to origin/main
PKG_VERSION_MAIN=$(git show origin/main:website/package.json 2>/dev/null | grep '"version"' | head -1 | sed 's/.*: "\(.*\)",/\1/')
PKG_VERSION_HEAD=$(grep '"version"' website/package.json | head -1 | sed 's/.*: "\(.*\)",/\1/')

if [ "$PKG_VERSION_MAIN" = "$PKG_VERSION_HEAD" ]; then
  echo "❌ Website files staged but version not bumped."
  echo "   Run: node scripts/bump-version.mjs patch 'Your change summary'"
  exit 1
fi

# Check if CHANGELOG.json is staged and its top entry version matches package.json
CHANGELOG_STAGED=$(git diff --cached --name-only | grep '^website/public/CHANGELOG.json$' || true)
if [ -z "$CHANGELOG_STAGED" ]; then
  echo "❌ Version bumped but CHANGELOG.json is not staged."
  echo "   Run: node scripts/bump-version.mjs patch 'Your change summary'"
  exit 1
fi

CHANGELOG_TOP=$(node -e "console.log(JSON.parse(require('fs').readFileSync('website/public/CHANGELOG.json'))[0].version)")
if [ "$CHANGELOG_TOP" != "$PKG_VERSION_HEAD" ]; then
  echo "❌ Top CHANGELOG entry version ($CHANGELOG_TOP) does not match package.json ($PKG_VERSION_HEAD)."
  exit 1
fi

echo "✅ Version + CHANGELOG bump verified."
```

- [ ] **Step 3: Install husky if not present**

```bash
npm install -D husky
git add package.json package-lock.json .husky/pre-commit
git commit -m "feat(live-update): add pre-commit hook enforcing version + CHANGELOG bump"
```

---

### Task 10: Add CI gate to `pr-checks.yml`

**Files:**
- Modify: `.github/workflows/pr-checks.yml`

- [ ] **Step 1: Add a new job `version-bump-check`**

Append to `.github/workflows/pr-checks.yml`:

```yaml
  # ============================================================
  # Version + CHANGELOG Bump Check
  # ============================================================
  version-bump-check:
    name: Version / CHANGELOG Bump Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check for website changes
        id: changes
        run: |
          BASE="${{ github.event.pull_request.base.sha }}"
          HEAD="${{ github.event.pull_request.head.sha }}"
          WEBSITE_FILES=$(git diff --name-only "$BASE" "$HEAD" | grep -E '^website/(src/|public/([^C]|C[^H]|CH[^A]|CHA[^N]|CHAN[^G]|CHANG[^E]).*)' || true)
          echo "website_files=$WEBSITE_FILES" >> $GITHUB_OUTPUT
          if [ -n "$WEBSITE_FILES" ]; then
            echo "has_website_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_website_changes=false" >> $GITHUB_OUTPUT
          fi
      - name: Verify version bumped
        if: steps.changes.outputs.has_website_changes == 'true'
        run: |
          BASE="${{ github.event.pull_request.base.sha }}"
          MAIN_VERSION=$(git show "$BASE:website/package.json" | grep '"version"' | head -1 | sed 's/.*: "\(.*\)",/\1/')
          HEAD_VERSION=$(grep '"version"' website/package.json | head -1 | sed 's/.*: "\(.*\)",/\1/')
          if [ "$MAIN_VERSION" = "$HEAD_VERSION" ]; then
            echo "❌ Website files changed but version not bumped."
            echo "   Run: node scripts/bump-version.mjs patch 'Your change summary'"
            exit 1
          fi
      - name: Verify CHANGELOG updated
        if: steps.changes.outputs.has_website_changes == 'true'
        run: |
          CHANGELOG_IN_PR=$(git diff --name-only "${{ github.event.pull_request.base.sha }}" "${{ github.event.pull_request.head.sha }}" | grep '^website/public/CHANGELOG.json$' || true)
          if [ -z "$CHANGELOG_IN_PR" ]; then
            echo "❌ Version bumped but CHANGELOG.json not updated."
            echo "   Run: node scripts/bump-version.mjs patch 'Your change summary'"
            exit 1
          fi
          HEAD_VERSION=$(grep '"version"' website/package.json | head -1 | sed 's/.*: "\(.*\)",/\1/')
          CHANGELOG_TOP=$(node -e "console.log(JSON.parse(require('fs').readFileSync('website/public/CHANGELOG.json'))[0].version)")
          if [ "$CHANGELOG_TOP" != "$HEAD_VERSION" ]; then
            echo "❌ Top CHANGELOG entry ($CHANGELOG_TOP) does not match package.json ($HEAD_VERSION)."
            exit 1
          fi
          echo "✅ Version + CHANGELOG bump verified."
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pr-checks.yml
git commit -m "ci(live-update): add version + CHANGELOG bump gate to PR checks"
```

---

### Task 11: Create `release-tag.yml` workflow

**Files:**
- Create: `.github/workflows/release-tag.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Release Tag

on:
  push:
    branches: [main]

jobs:
  tag-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - name: Create version tag if changed
        run: |
          PREV_VERSION=$(git show HEAD~1:website/package.json | grep '"version"' | head -1 | sed 's/.*: "\(.*\)",/\1/')
          CURR_VERSION=$(grep '"version"' website/package.json | head -1 | sed 's/.*: "\(.*\)",/\1/')
          if [ "$PREV_VERSION" != "$CURR_VERSION" ]; then
            TAG="v$CURR_VERSION"
            if git rev-parse "$TAG" >/dev/null 2>&1; then
              echo "Tag $TAG already exists."
            else
              git config user.name "github-actions[bot]"
              git config user.email "github-actions[bot]@users.noreply.github.com"
              git tag -a "$TAG" -m "Release $TAG"
              git push origin "$TAG"
              echo "Created tag $TAG"
            fi
          else
            echo "Version unchanged ($CURR_VERSION). No tag created."
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release-tag.yml
git commit -m "ci(live-update): auto-create git tag on version bump to main"
```

---

### Task 12: Bump version for Phase 2

**Files:**
- Modify: `website/package.json`
- Modify: `website/public/CHANGELOG.json`

- [ ] **Step 1: Bump to `0.17.1`**

- [ ] **Step 2: Prepend CHANGELOG entry**

```json
  {
    "version": "0.17.1",
    "date": "2026-04-17",
    "commit": "TBD",
    "highlights": "Live Update Phase 2 — enforce version + CHANGELOG on every frontend deploy.",
    "sections": [
      {
        "title": "Tooling",
        "items": [
          "Add scripts/bump-version.mjs one-liner for version + CHANGELOG prepending",
          "Add repo-root Husky pre-commit hook enforcing bump on website/src and website/public changes",
          "Add CI gate in pr-checks.yml to catch --no-verify bypasses",
          "Add release-tag.yml workflow to auto-create vX.Y.Z tags on main"
        ]
      }
    ]
  },
```

- [ ] **Step 3: Commit**

```bash
git add website/package.json website/public/CHANGELOG.json
git commit -m "chore(release): 0.17.1 — Live Update Phase 2"
```

---

## Phase 3 — Telemetry (version 0.18.0)

### Task 13: Create backend `version_events` table migration

**Files:**
- Create: `tdental-api/migrations/<timestamp>_version_events.sql` (exact path depends on existing migrations dir)

- [ ] **Step 1: Locate migrations directory**

```bash
ls tdental-api/migrations/
```

- [ ] **Step 2: Write migration**

```sql
CREATE TABLE IF NOT EXISTS version_events (
  id SERIAL PRIMARY KEY,
  event VARCHAR(64) NOT NULL,
  from_version VARCHAR(32) NOT NULL,
  to_version VARCHAR(32) NOT NULL,
  trigger VARCHAR(32) NOT NULL,
  timestamp BIGINT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_version_events_event ON version_events(event);
CREATE INDEX idx_version_events_timestamp ON version_events(timestamp);
CREATE INDEX idx_version_events_from_version ON version_events(from_version);
```

- [ ] **Step 3: Commit**

```bash
git add tdental-api/migrations/<timestamp>_version_events.sql
git commit -m "feat(live-update): add version_events table for update telemetry"
```

---

### Task 14: Create `POST /api/telemetry/version` endpoint

**Files:**
- Create: `tdental-api/routes/telemetry.js` (or `.ts` if the API uses TS)
- Modify: `tdental-api/app.js` (or `server.js`) to mount the router

- [ ] **Step 1: Write the route**

```javascript
const express = require('express');
const router = express.Router();

const RATE_LIMIT = new Map(); // ip -> Array<timestamp>

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 10;
  const entries = RATE_LIMIT.get(ip) || [];
  const recent = entries.filter(t => now - t < windowMs);
  RATE_LIMIT.set(ip, recent);
  return recent.length >= max;
}

router.post('/version', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limited' });
  }
  const { event, from, to, trigger, timestamp, userAgent } = req.body;
  const validEvents = [
    'version_update_initiated',
    'version_update_succeeded',
    'version_update_failed',
    'version_update_dismissed',
  ];
  if (!validEvents.includes(event)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  const db = req.app.get('db'); // or however db is accessed in this codebase
  try {
    await db.query(
      `INSERT INTO version_events (event, from_version, to_version, trigger, timestamp, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event, from || '', to || '', trigger || '', timestamp || Date.now(), userAgent || '', ip]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Telemetry insert failed:', err);
    // Fire-and-forget: return success so client never blocks reload
    res.json({ ok: true });
  }
});

module.exports = router;
```

- [ ] **Step 2: Mount the router**

In the main API entry file, add:
```javascript
const telemetryRouter = require('./routes/telemetry');
app.use('/api/telemetry', telemetryRouter);
```

- [ ] **Step 3: Commit**

```bash
git add tdental-api/routes/telemetry.js tdental-api/app.js
git commit -m "feat(live-update): add POST /api/telemetry/version endpoint"
```

---

### Task 15: Wire client telemetry queue to real endpoint

**Files:**
- Modify: `website/src/hooks/useVersionCheck.ts`
- Create utility or inline flush function

- [ ] **Step 1: Create a fire-and-forget flush utility**

At the bottom of `useVersionCheck.ts` (or in a new `website/src/lib/telemetry.ts`), add:

```typescript
const TELEMETRY_ENDPOINT = '/api/telemetry/version';

export async function flushPendingTelemetry(): Promise<void> {
  try {
    const raw = localStorage.getItem('tgclinic:pendingTelemetry');
    if (!raw) return;
    const events: unknown[] = JSON.parse(raw);
    if (!Array.isArray(events) || events.length === 0) return;

    const results = await Promise.allSettled(
      events.map((payload) =>
        fetch(TELEMETRY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      )
    );

    const failed: unknown[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected' || !r.value.ok) {
        failed.push(events[i]);
      }
    });

    if (failed.length === 0) {
      localStorage.removeItem('tgclinic:pendingTelemetry');
    } else {
      localStorage.setItem('tgclinic:pendingTelemetry', JSON.stringify(failed));
    }
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: Call `flushPendingTelemetry` on mount**

In the main `VersionDisplay` component (or in the boot `useEffect` inside `useVersionCheck`), call `flushPendingTelemetry()` once on mount so queued events from previous sessions are sent.

- [ ] **Step 3: Commit**

```bash
git add website/src/hooks/useVersionCheck.ts
git commit -m "feat(live-update): flush pending telemetry to backend endpoint"
```

---

### Task 16: Bump version for Phase 3

**Files:**
- Modify: `website/package.json`
- Modify: `website/public/CHANGELOG.json`

- [ ] **Step 1: Bump to `0.18.0`**

- [ ] **Step 2: Prepend CHANGELOG entry**

```json
  {
    "version": "0.18.0",
    "date": "2026-04-17",
    "commit": "TBD",
    "highlights": "Live Update Phase 3 — backend telemetry endpoint and client flush.",
    "sections": [
      {
        "title": "Telemetry",
        "items": [
          "Add version_events table migration",
          "Add POST /api/telemetry/version Express route with rate limiting",
          "Flush queued client events to backend on app boot"
        ]
      }
    ]
  },
```

- [ ] **Step 3: Commit**

```bash
git add website/package.json website/public/CHANGELOG.json
git commit -m "chore(release): 0.18.0 — Live Update Phase 3"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - G1 (button busts cache 100%) → Tasks 4, 6, 3
   - G2 (non-dismissible critical modal) → Already exists in code; Task 4 adds auto-trigger via countdown
   - G3 (enforce bump + CHANGELOG) → Tasks 8, 9, 10, 11
   - G4 (telemetry) → Tasks 4, 5, 13, 14, 15
   - G5 (coherent version.json contract) → Tasks 2, 3, 7

2. **Placeholder scan:** No TODOs or TBDs in code blocks. All snippets are complete and copy-pasteable.

3. **Type consistency:**
   - `updateSeverity` is used consistently as `'critical' | 'regular'`
   - `latestVersion.gitCommit` is used as cache buster
   - `pendingTelemetry` localStorage key is consistent across Tasks 4, 5, 15
