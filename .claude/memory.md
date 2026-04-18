# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-18 10:44:22  
> Project: Tgroup | Sessions tracked: 130

---

## 🔥 Recent Observations

- **[change]** Removed 5 dead superset-notify hooks from global configuration ()
  - Cleaned up global hooks configuration at ~/.claude/settings.json by surgically removing 5 dead superset-notify hooks that only execute when SUPERSET_HOME_DIR environment variable is set, which it isn't on this system. Used Python script to filter out hooks containing 'SUPERSET_HOME_DIR' string while

- **[discovery]** GSD workflow actively used across 6 projects with planning directories ()
  - Before removing GSD-related hooks, audited actual GSD (Get Stuff Done) workflow usage across the Documents directory. Search revealed 6 active .planning/ directories and corresponding ROADMAP.md/PROJECT.md planning files in Tgroup, TGmonitor, quietRS, tv2, voice_flow, and Poly projects, confirming t

- **[change]** Enhanced global CLAUDE.md with safety and VPS deployment guidelines ()
  - Updated the global CLAUDE.md behavioral rules file with enhanced safety practices and a new deployment section. The safety section now explicitly warns against deleting or rewriting existing configurations before verifying replacements work, recommending staging and verification workflows instead. A

- **[change]** Created LLM provider and macOS platform reference documentation ()
  - Created two comprehensive reference guides in ~/.claude/rules/ to capture platform and tooling knowledge from multiple rediscovery cycles. The llm-provider-config.md file documents known-good configuration patterns for running Claude Code, Hermes, and Pi coding agent with alternate LLM backends (Kim

- **[discovery]** Comprehensive global hooks configuration with 19 hook entries across 7 event types (Edit operations; context monitoring for multiple tool types; session state management that runs on SessionStart; and Obsidian vault auto-save functionality. PreToolUse hooks act as validation guards checking operations before execution with 5-10 second timeouts, while PostToolUse hooks monitor and log after tool execution. The configuration also includes conditional Superset notification hooks that execute only when SUPERSET_HOME_DIR environment variable is set. This extensive hook system explains the high number of automated actions triggered during Claude Code operations.)
  - Inspection of global hooks configuration revealed an extensive automation system with 19 hook entries across 7 different event types. The hooks include aline-ai integration for stop, user prompt submit, and permission request events using Python hooks; a GSD (Get Stuff Done) workflow system with Jav

- **[discovery]** Identified 21 Playwright tools in global permissions allowlist ()
  - Inspection of Claude Code configuration revealed that the global settings file contains an extensive permissions allowlist with 21 Playwright browser automation tools pre-approved (all prefixed with mcp__plugin_playwright_playwright__browser_). These MCP tools are loaded and available in every sessi

- **[bugfix]** Completed sourceId edit form bug fix and deployed to production ()
  - Successfully resolved the bug where customer source selection appeared blank when editing existing service records. The root cause was a missing field in the initialData object passed to ServiceForm in edit mode. The fix required three coordinated changes: adding sourceId to the CustomerProfile edit

- **[change]** Build successful after sourceId type fixes ()
  - Successfully built the application after resolving the TypeScript type errors related to the sourceId field. The build process completed cleanly with all modules compiled and bundled into optimized chunks. The Customers module containing the fixed sourceId mapping compiled to 113.35 kB, and the over

- **[bugfix]** Added sourceId to CustomerService type and mapping in Customers.tsx ()
  - Resolved the TypeScript compilation error by completing the type safety chain for the sourceId field. Added the sourceId property to the CustomerService interface as an optional nullable string, following the same pattern used for other optional identifiers like assistantId and dentalAideId. Updated

- **[discovery]** Located CustomerService interface definition needing sourceId field ( null), which matches the pattern needed for sourceId. Adding sourceId and sourceName as optional fields will align the type definition with the actual data structure and resolve the TypeScript compilation error.)
  - Located the CustomerService interface definition that needs to be augmented with source tracking fields. The interface is well-structured with 24 fields covering service identification, staffing (doctorId, assistantId, dentalAideId), financial data (cost, paidAmount, residual), and metadata (orderNa


---

## 📋 Recent Session Summaries

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

### User needs to hard refresh browser (Cmd+Shift+R) on port 5174 to clear Vite's module cache and see the fix in action. The previously-saved source selection should now display correctly when reopening Edit Service forms.
- **Request:** Fix bug where saved customer source (sourceId) appears blank when reopening Edit Service form from CustomerProfile
- **Completed:** Fixed three files and deployed version 0.20.8 to production: added sourceId: editingService.sourceId to CustomerProfile.tsx line 706 edit initialData, added readonly sourceId?: string 
- **Next steps:**  null to CustomerService interface in types/customer.ts line 136, and added sourceId: r.sourceId to Customers.tsx line 584 saleServices mapping. Updated package.json to v0.20.8, added CHANGELOG entry,

### 
- **Request:** Review and refine proposed additions to global CLAUDE.md based on usage insights
- **Completed:** Assessment completed identifying VPS deployment rules as genuine gap, scope discipline as duplicate of existing Goal Discipline section, and LLM/platform configs as misplaced candidates better suited for dedicated rules files
- **Next steps:** Awaiting user approval to apply two minimal global CLAUDE.md changes (new VPS & Deployment section, extended Safety rule) and create two separate rules files for Kimi config and macOS platform notes


---

> 💡 Tip: Run `./scripts/sync-claude-mem.sh` to refresh this file from the latest claude-mem data.
