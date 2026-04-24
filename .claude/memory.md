# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-23 23:31:24  
> Project: Tgroup | Sessions tracked: 152

---

## 🔥 Recent Observations

- **[discovery]** TG Clinic modal form architecture after FormShell refactoring ()
  - The TG Clinic codebase has undergone a refactoring to centralize modal form UI through the FormShell module. This module exports FormShell (modal wrapper with backdrop and animations), FormHeader (orange gradient header with icon/title/subtitle/close button), FormFooter (cancel/save buttons), and ot

- **[bugfix]** Customer add modal field population fix requested ()
  - The user has requested that the same fix pattern recently applied to the appointment edit modal (where Customer field was blank due to persistent component mount issues) be applied to the customer add module. The user also wants to see a comparison table showing the before and after state, similar t

- **[bugfix]** AppointmentFormShell remount forced via React key prop to fix stale form state ()
  - Investigation of BUG 2 (customer field appearing empty in edit mode) revealed that AppointmentFormShell component was being reused by React when switching between appointments or between create and edit modes. The useAppointmentForm hook initializes its state from the initialData prop during the use

- **[change]** Appointments CRUD route registration verified with TypeScript validation ()
  - After manually adding the APPOINTMENTS route constant and lazy import, an agent executor was dispatched to complete and verify the BUG 3 fix. The agent confirmed that pages/Appointments/index.tsx exports a named export `Appointments` rather than a default export, requiring the lazy import pattern `.

- **[bugfix]** Appointments CRUD page routed to /appointments path ending orphan state ()
  - QA browser verification identified that the Appointments CRUD page at pages/Appointments/index.tsx was unreachable via any URL because App.tsx line 314 routed /appointments to ReportsAppointments (a reports analytics page) instead of the migrated AppointmentFormShell-powered CRUD page, blocking TC5 

- **[bugfix]** CustomerProfile appointment list refresh wiring fixed ()
  - Browser QA testing identified that CustomerProfile appointment create and edit flows saved successfully (POST 201, PUT 200) but the appointment list did not refresh without page reload, forcing users to manually refresh to see changes. Investigation traced the issue to CustomerProfile.tsx line 614 w

- **[discovery]** AppointmentFormShell migration verification reveals 4 critical integration bugs across 6 flows ()
  - Browser-based QA verification of the AppointmentFormShell migration tested 6 user flows to confirm modal functionality and list refresh behavior. Testing used Playwright MCP tools to interact with the TG Clinic dashboard at http://127.0.0.1:5174, logging in as tg@clinic.vn and verifying each create/

- **[discovery]** Appointment edit modal structure mapped via browser inspection ()
  - During investigation of module refactoring consistency across the TG Clinic application, browser automation tools inspected the appointment edit modal to understand its form structure. The modal was successfully identified through its Update and Cancel buttons, revealing a comprehensive appointment 

- **[discovery]** Legacy appointment form components orphaned from production code ()
  - After migrating to the unified AppointmentFormShell architecture, the legacy AppointmentForm.tsx and EditAppointmentModal.tsx components are no longer used by any production code. Multiple comprehensive searches across the website/src directory confirmed that no non-test files import or render these

- **[discovery]** CustomerProfile still uses old AppointmentForm instead of unified AppointmentFormShell ()
  - Investigation traced modal click failure to architectural inconsistency where CustomerProfile component was not migrated to the unified appointment form system. While Calendar and QuickAddAppointmentButton use the new AppointmentFormShell that delegates to the FormShell module, CustomerProfile still


---

## 📋 Recent Session Summaries

### 
- **Request:** Commit and deploy CLAUDE.md documentation refactoring with modular context files
- **Completed:** Successfully committed CLAUDE.md refactoring as commit 0df54bf5 with 9 files changed (423 insertions, 405 deletions). Pushed commit to origin/ai-develop branch. Documentation now consists of lightweight 116-line CLAUDE.md index plus 8 modular context files: database.md (5.2KB), project-map.md (2.7KB
- **Next steps:** Primary session identified 14 uncommitted files from parallel work and suggested running wtstatus to audit dirty worktrees and creating checkpoint wip: commits to prevent work loss. Awaiting user deci

### 
- **Request:** Documentation refactoring: Split CLAUDE.md into modular context files and clean up unused language rules
- **Completed:** Successfully refactored CLAUDE.md from 498 lines to 116 lines (77% reduction) by extracting detailed sections into 8 focused context files in .claude/CONTEXT/: project-map.md (2.7KB), database.md (5.2KB), version-system.md (2.0KB), layout-lock.md (1.6KB), modular-card-scrolling.md (2.7KB), feature-s
- **Next steps:** Changes staged but not yet committed pending user review. Primary session awaiting decision on whether to commit with message "chore(docs): split CLAUDE.md into core + extended context for token budge

### 
- **Request:** Investigate and optimize Claude hook configuration showing 21 tools loading and excessive hook execution
- **Completed:** Created comprehensive reference documentation: updated ~/.claude/CLAUDE.md with enhanced safety guidelines (don't delete configs before verifying replacements) and new Section 9 for VPS deployment practices (SSH verification first, kill duplicates, document install paths). Created ~/.claude/rules/ll
- **Next steps:** Hook optimization complete. Final configuration: 14 global hooks + 4 project hooks = 18 total. Retained all active functionality including aline-ai integration, GSD workflow guards (needed for 6 activ

### Edit guards if not actively using GSD workflow, or (c) both.
- **Request:** Investigate Claude hook configuration showing 21 tools loading and identify source of verbose context messages
- **Completed:** Created documentation preventing future rediscovery: enhanced ~/.claude/CLAUDE.md with safety guidelines and VPS deployment section, created ~/.claude/rules/llm-provider-config.md with LLM backend recipes, created ~/.claude/rules/macos-platform.md documenting macOS-Linux differences. Confirmed verbo
- **Next steps:** Waiting for user decision on hook cleanup: (a) remove 5 dead superset-notify hooks, (b) audit and consolidate GSD Write

### Edit PreToolUse guards if not actively using GSD workflow, or (c) both. Verbose adaptive hints cannot be disabled through configuration.
- **Request:** Investigate Claude hook configuration showing 21 tools loading on every prompt and identify source of verbose context messages
- **Completed:** Created comprehensive documentation to prevent future rediscovery: updated ~/.claude/CLAUDE.md with enhanced safety guidelines (don't delete configs before verifying replacements) and new Section 9 for VPS deployment practices (SSH verification first, kill duplicates before restart, document install
- **Next steps:** Awaiting user decision on hook cleanup options: (a) remove 5 dead superset-notify hooks from global settings, (b) audit and potentially consolidate 4-5 GSD Write


---

> 💡 Tip: Run `./scripts/sync-claude-mem.sh` to refresh this file from the latest claude-mem data.
