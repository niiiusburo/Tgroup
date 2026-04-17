# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-17 23:21:03  
> Project: Tgroup | Sessions tracked: 129

---

## 🔥 Recent Observations

- **[discovery]** Launched Add/Edit parity audits for Customers and Appointments modules ()
  - After fixing a critical bug where editing appointments dropped assistant and dental aide selections due to missing fields in the API response-to-UI-state mapping, two comprehensive parity audits were launched to find similar issues across the application. Research agents are analyzing the Customers 

- **[change]** Created MODULES worktree for parallel development ()
  - A new git worktree was created to enable parallel development work on the modules-audit branch. The worktree is located at /Users/thuanle/Documents/TamTMV/Tgroup-MODULES, branched from ai-develop at commit 5f05b62b. To avoid duplicating node_modules and conserve disk space, a symbolic link was creat

- **[discovery]** Calendar day view timezone inconsistencies identified ()
  - Investigation revealed that the calendar day view bug stems from inconsistent timezone handling across date parsing and formatting. The utcToLocalDateStr utility hardcodes Asia/Ho_Chi_Minh timezone instead of respecting the user's selected timezone. Additionally, new Date(currentDateStr) parses ISO 

- **[change]** Docker deployment logs show successful web container rebuild and restart ()
  - Deployment logs from background task bvnqpyu8r confirm successful Docker-based deployment of v0.19.8 to production. The Docker build process completed image construction with multiple layer exports, producing final manifest e3a0fecbd7a71a95b068a5bfa01cef357dc9ba435f97c717f2de66b104c2a3bd and tagging

- **[change]** VPS deployment completed successfully ()
  - Production deployment of v0.19.8 completed successfully. A monitoring process tracked the SSH deployment task by checking for the sshpass process targeting the VPS at 76.13.16.68, polling every 5 seconds until the process terminated. The "DEPLOY DONE" confirmation indicates the full deployment seque

- **[change]** Version 0.19.8 committed, pushed to GitHub, and deploying to production VPS ()
  - Version 0.19.8 successfully committed and deployed through the full release pipeline. The commit follows conventional commit format with "feat(calendar)" prefix and detailed multi-line body explaining both the staff display (assistantName and dentalAideName with Users icons) and equal-height card la

- **[change]** Version 0.19.8 changelog completed and files staged for commit ()
  - Release documentation finalized for v0.19.8 with complete changelog describing both aspects of the staff display feature: the visual presentation of assistant and dental aide names with Users icons, and the equal-height card layout preventing visual inconsistency when some appointments have multiple

- **[change]** Version bumped to 0.19.8 with changelog entry for staff display feature ()
  - Version and release documentation prepared for v0.19.8 deployment. The package.json version field was incremented from 0.19.7 to 0.19.8, and a new CHANGELOG.json entry was created at the top of the release history. The changelog entry documents the staff display feature under "New Features" with one

- **[discovery]** Current version is 0.19.7 with sidebar routing fix ()
  - Pre-deployment review shows the application is currently at version 0.19.7, which was released today fixing a sidebar routing issue where the service catalog link incorrectly pointed to the website CMS. The previous release (0.19.6, same day) addressed staff assistant and dental aide data persistenc

- **[discovery]** Parallel development across three worktrees revealed ()
  - Git worktree inspection reveals three parallel development streams at different stages of completion. The I18 branch (Tgroup-I18 worktree) contains extensive internationalization work with 73 modified files covering the entire application stack - from UI components to locale translation files for bo


---

## 📋 Recent Session Summaries

### 
- **Request:** Cleanup worktree after completing ServicesTab work
- **Completed:** Pruned stale git worktree entry for the deleted ServicesTab directory. Deleted the local `ai-develop` branch. Two worktrees remain active: `/Tgroup` on branch `+` (main work with v0.19.8 shipped) and `/Tgroup-I18` on branch `I18` (in-progress translation work).
- **Next steps:** Awaiting user clarification on the intended cleanup action: delete the local `+` branch while keeping the directory, remove the `/Tgroup-I18` worktree instead, or confirm deletion of the main `/Tgroup

### 
- **Request:** Investigating why VPS is not loading calendar appointments and assessing repository state
- **Completed:** Repository state assessment completed; identified that recent work includes calendar day-view fixes, assistant/dental-aide features, and navigation bug fixes
- **Next steps:** Reading .claude/memory.md to understand what work has already been completed between sessions and what issues remain open before investigating the VPS appointment loading problem

### 
- **Request:** Resume calendar timezone bug investigation after rate limit interruption and identify current worktree state
- **Completed:** No code changes completed - only repository state inspection. The calendar timezone bug diagnosis was interrupted mid-investigation with no fixes applied. Identified that utcToLocalDateStr hardcodes Asia/Ho_Chi_Minh timezone and new Date(currentDateStr) parses as UTC causing date string mismatches i
- **Next steps:** Need to decide between: (A) reviewing and merging the stranded Live Update feature commits from live-update worktree to main, (B) resuming the calendar timezone bug investigation and implementing fixe

### 
- **Request:** Deploy uncommitted calendar staff display feature as version 0.19.8 to production
- **Completed:** Successfully shipped version 0.19.8 to production. Bumped package.json version from 0.19.7 to 0.19.8. Created comprehensive CHANGELOG.json entry documenting staff display and equal-height card features. Staged exactly 4 files (DayView.tsx, WeekView.tsx, package.json, CHANGELOG.json) while leaving .m
- **Next steps:** Version 0.19.8 deployment is complete and verified in production. The session may continue with other uncommitted changes (.mcp.json, CLAUDE.md) or new feature work.

### 
- **Request:** Locate missing staff display feature on calendar appointment cards
- **Completed:** Located the uncommitted staff display implementation spanning 66 lines across two calendar view components. Verified the changes are clean, focused, and ready for deployment.
- **Next steps:** Awaiting user decision on whether to commit and deploy the staff display feature as v0.19.8, which would include bumping package.json version, adding CHANGELOG entry, committing the calendar files, an


---

> 💡 Tip: Run `./scripts/sync-claude-mem.sh` to refresh this file from the latest claude-mem data.
