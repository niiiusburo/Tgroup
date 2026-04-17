# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-18 00:11:00  
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
- **Request:** Complete Add/Edit parity bug audit for TGroup clinic dashboard with synthesis of all findings, root cause analysis, and prioritized fix batches for deployment
- **Completed:** **Full audit cycle complete with synthesized deliverables:**

### 
- **Request:** 

### 
- **Request:** ✓ 6 detailed audit reports (.audit/*.md files)

### 
- **Request:** ✓ Root cause pattern analysis identifying 5 structural anti-patterns

### 
- **Request:** ✓ Severity-ranked bug inventory (7 CRITICAL, 15 HIGH, 18+ MEDIUM/LOW)

### 
- **Request:** ✓ Three-tier fix plan with concrete action items:

### 
- **Request:** 

### 
- **Request:** **Batch A (CRITICAL - v0.19.9):** 7 fixes

### 
- **Request:** 1. AppointmentForm: forward assistantId/dentalAideId/color/estimatedDuration in all 3 Add paths

### 
- **Request:** 2. EditAppointmentModal: send `time` on save

### 
- **Request:** 3. Appointments: store serviceId/productid as column not notes text

### 
- **Request:** 4. Locations: wire Add to createCompany, Edit to updateCompany

### 
- **Request:** 5. Locations mapper: read address/operatingHours/manager from API

### 
- **Request:** 6. CustomerDeposits: add rawMethod field, seed Edit from it

### 
- **Request:** 7. MonthlyPlan: replace fake customerId with real CustomerSelector

### 
- **Request:** 

### 
- **Request:** **Batch B (HIGH - v0.20.0):** 15 additional fixes including role detection, gender coercion, missing field mappings, selector injection, deposit fields, MonthlyPlan edit path, TimePicker improvements

### 
- **Request:** 

### 
- **Request:** **Batch C (MEDIUM/LOW):** Field contracts, mapper consolidation, timezone utilities, schema cleanup

### 
- **Request:** 

### 
- **Request:** All fixes have identified file locations, line numbers, and understood patterns.
- **Completed:** Awaiting user decision on deployment strategy:

### 
- **Request:** - Option A: Ship Batch A only (7 CRITICAL fixes) as v0.19.9 - 1-2 hours fix work, tight diff, minimal risk

### 
- **Request:** - Option B: Ship Batch A + B (22 fixes) as v0.20.0 - larger release, more risk, fewer deploy cycles

### 
- **Request:** - Option C: User selects specific subset of fixes

### 
- **Request:** 

### 
- **Request:** Primary session is ready to spin up parallel fix teams (one per item) once user chooses approach. No work starting until direction confirmed.

### 
- **Request:** Add/Edit parity bug audit for TGroup React/TypeScript clinic dashboard - systematic examination of field consistency between create and update flows across all modules
- **Completed:** 5 of 6 audit reports complete with detailed findings:

### 
- **Request:** - .audit/customers.md

### 
- **Request:** - .audit/services.md

### 
- **Request:** - .audit/employees.md

### 
- **Request:** - .audit/appointments.md

### 
- **Request:** - .audit/payment.md

### 
- **Request:** 

### 
- **Request:** Running totals across completed modules:

### 
- **Request:** - 5 CRITICAL bugs (permanent data loss/corruption)

### 
- **Request:** - 11+ HIGH bugs (field drops, missing edit paths)

### 
- **Request:** - 13+ MEDIUM/LOW bugs (UX inconsistencies, type gaps)

### 
- **Request:** 

### 
- **Request:** Verified calendarUtils.ts correctly maps assistantId/dentalAideId, confirming bug is in form initialization layers.
- **Completed:** Awaiting final audit report from Team 6 (Locations + shared Selectors), then synthesize all 6 reports into:

### 
- **Request:** 1. Master bug list ranked by severity (CRITICAL → LOW)

### 
- **Request:** 2. File locations and line numbers for each issue

### 
- **Request:** 3. Root cause classification (display-label leakage, missing read-back mappers, TypeScript type gaps, greedy pattern matching)

### 
- **Request:** 4. Recommended fix strategy prioritized by impact and risk

### 
- **Request:** 

### 
- **Request:** Primary session will generate actionable fix plan once all data collected.

### 
- **Request:** Add/Edit parity bug audit for TGroup React/TypeScript clinic dashboard - identifying fields that are present in Add flows but missing or incorrectly initialized in Edit flows, starting with known assi
- **Completed:** 4 of 6 audit reports completed and findings documented:

### 
- **Request:** - .audit/customers.md

### 
- **Request:** - .audit/services.md  

### 
- **Request:** - .audit/employees.md

### 
- **Request:** - .audit/appointments.md (most critical findings)

### 
- **Request:** 

### 
- **Request:** Verified calendarUtils.ts mapApiAppointmentToCalendar correctly maps assistantId/dentalAideId, ruling out calendar utility as bug source.
- **Completed:** Waiting for final 2 audit agents to complete (Payment module, Locations+Selectors), then synthesize all 6 reports into prioritized bug list with:

### 
- **Request:** - Severity rankings (CRITICAL/HIGH/MEDIUM/LOW)

### 
- **Request:** - Specific file locations and line numbers

### 
- **Request:** - Root cause analysis

### 
- **Request:** - Recommended fixes prioritized by impact

### 
- **Request:** 

### 
- **Request:** Primary session is holding synthesis until all teams report to ensure comprehensive coverage.

### 
- **Request:** Add/Edit parity audit across six modules of TGroup clinic dashboard - investigating field-drop bugs where Edit forms fail to pre-populate fields that exist in Add forms
- **Completed:** - Launched 6 background audit agents (5 module-specific + 1 cross-cutting selectors audit)

### 
- **Request:** - Primary session completed deep-dive file reads across payment, location, selector, and form architecture

### 
- **Request:** - One audit report file created (.audit/REPORTS_AUDIT.md), five module reports pending

### 
- **Request:** - Identified MonthlyPlan as create-only (no edit form = guaranteed parity since edit doesn't exist)
- **Completed:** Waiting for remaining 5 audit reports to complete writing to `.audit/` directory (customers.md, appointments.md, services.md, employees.md, locations-and-selectors.md). Once all reports land, will synthesize findings into prioritized bug list, focusing on:

### 
- **Request:** - Field-drop bugs in read-back mappers (the assistantId pattern)

### 
- **Request:** - Missing Edit modes (MonthlyPlan)

### 
- **Request:** - Selector pre-fill failures

### 
- **Request:** - Payment source breakdown Edit support

### 
- **Request:** - DatePicker/TimePicker timezone/value handling

### 
- **Request:** 

### 
- **Request:** Agents are read-only; no code changes until audit synthesis complete. Estimated 5-15min total agent runtime.

### 
- **Request:** Cleanup worktree after completing ServicesTab work
- **Completed:** Pruned stale git worktree entry for the deleted ServicesTab directory. Deleted the local `ai-develop` branch. Two worktrees remain active: `/Tgroup` on branch `+` (main work with v0.19.8 shipped) and `/Tgroup-I18` on branch `I18` (in-progress translation work).
- **Next steps:** Awaiting user clarification on the intended cleanup action: delete the local `+` branch while keeping the directory, remove the `/Tgroup-I18` worktree instead, or confirm deletion of the main `/Tgroup


---

> 💡 Tip: Run `./scripts/sync-claude-mem.sh` to refresh this file from the latest claude-mem data.
