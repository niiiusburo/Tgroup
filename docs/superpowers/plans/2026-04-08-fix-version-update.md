# Fix Version Update System - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Fix the version update system so that clicking "Update Now" actually loads the new version without logging the user out.

**Architecture:** The current system detects version changes but fails to actually load the new code. The fix involves properly clearing caches AND ensuring the browser fetches fresh assets.

**Tech Stack:** React, Vite, TypeScript, Playwright

---

## Problem Analysis

Current behavior:
1. Version detection works (shows "Update Available")
2. Clicking "Update Now" reloads the page
3. But user still sees old version (v0.0.0 instead of v0.1.4)
4. Sometimes user gets logged out

Root causes:
1. Browser aggressively caches index.html and JS chunks
2. `location.reload()` doesn't bypass cache
3. Cache-busting timestamp gets removed on reload
4. localStorage might be getting cleared incorrectly

## Solution

Use a multi-layered approach:
1. Service Worker cache clearing (if registered)
2. Cache API clearing
3. Navigation with hard reload
4. version.json fetched with no-cache headers
5. Meta tags to prevent caching

---

## Task 1: Enhance useVersionCheck Hook

**Files:**
- Modify: `src/hooks/useVersionCheck.ts`

**Changes:**
- Improve applyUpdate() to use multiple cache-clearing strategies
- Add proper error handling
- Add option to preserve login session

```typescript
const applyUpdate = useCallback(async () => {
  // 1. Unregister service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  }
  
  // 2. Clear Cache API
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
  
  // 3. Hard reload with cache bypass
  window.location.href = window.location.href.split('?')[0] + '?_v=' + Date.now();
}, []);
```

---

## Task 2: Add Cache-Busting Meta Tags

**Files:**
- Modify: `index.html`

**Changes:**
Add meta tags to prevent caching:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

---

## Task 3: Update Vite Config for Better Cache Control

**Files:**
- Modify: `vite.config.ts`

**Changes:**
- Ensure asset filenames include content hashes
- Add headers configuration for production

---

## Task 4: Create Playwright E2E Test for Version Update

**Files:**
- Create: `e2e/version-update.spec.ts`

**Test Scenario:**
1. Mock version.json to return v0.0.0 (current)
2. Load the app
3. Change mock to return v0.1.0 (new version)
4. Click "Check for updates"
5. Verify "Update Available" appears
6. Click "Update Now"
7. Verify page reloads
8. Verify new version is loaded

---

## Task 5: Fix Version Display Component

**Files:**
- Modify: `src/components/shared/VersionDisplay.tsx`

**Changes:**
- Ensure handleUpdate calls the improved applyUpdate
- Add visual feedback during update (loading state)
- Fix any localStorage clearing issues

---

## Verification Steps

After all tasks:
1. Run `npm run build`
2. Serve the dist folder: `npx serve dist -p 5174`
3. Change version.json version
4. Click "Update Now" in browser
5. Verify new version loads WITHOUT login
6. Run Playwright tests: `npx playwright test e2e/version-update.spec.ts`

---

## Success Criteria

- [ ] Version update detection works
- [ ] "Update Now" button clears caches properly
- [ ] New version loads after update
- [ ] User stays logged in after update
- [ ] Playwright tests pass
- [ ] No console errors during update process
