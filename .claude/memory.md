# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-18 17:49:40  
> Project: Tgroup | Sessions tracked: 131

---

## 🔥 Recent Observations

- **[change]** Committed and Deployed CLAUDE.md Documentation Refactoring ()
  - The primary session committed and deployed the CLAUDE.md documentation refactoring to the TGroup repository. The commit 0df54bf5 with message "chore(docs): split CLAUDE.md into core + extended context for token budget" captures the 77% reduction in the main documentation file (498 to 116 lines) achi

- **[change]** Cleaned Up Unused Language Rules from Claude Configuration ()
  - The primary session cleaned up the Claude configuration directory by removing unused language-specific rule sets. The TGroup project only uses Python and TypeScript, making rule directories for six other languages (Go, Kotlin, PHP, Perl, C++, Swift) unnecessary overhead. Before deletion, all unused 

- **[refactor]** Refactored CLAUDE.md into Modular Context Files ()
  - The primary session completed a major documentation refactoring by decomposing the monolithic 498-line CLAUDE.md file into a modular structure. The main file was reduced by 76% to just 116 lines, retaining only essential quick-reference information: session memory instructions, release notes mandate

- **[change]** Extracted MCP Code Review Graph Documentation ()
  - The primary session created .claude/CONTEXT/mcp-code-review-graph.md extracting documentation about the MCP code-review-graph toolset integrated into the project. This documentation establishes a critical workflow principle: AI agents should always consult the knowledge graph first before falling ba

- **[change]** Extracted Reference Sites and API Endpoint Documentation ()
  - The primary session created .claude/CONTEXT/reference-sites.md extracting information about deployment environments and API endpoint specifications. This documentation provides quick reference for testing and development across three deployment targets: the original TG Clinic production system at ta

- **[change]** Extracted Modular Card Scrolling Pattern Documentation ()
  - The primary session created .claude/CONTEXT/modular-card-scrolling.md extracting documentation about the independent card scrolling pattern used in modular forms. This UI pattern solves the problem of modal forms where scrolling one section causes the entire modal to scroll, losing visibility of hea

- **[change]** Extracted Feature Status Documentation ()
  - The primary session created .claude/CONTEXT/feature-status.md extracting information about data integration status across the TGroup application. This documentation clearly delineates which features are connected to the real Postgres database versus which still use mock data, providing critical cont

- **[change]** Extracted Layout Lock Pattern to Context File ()
  - The primary session created .claude/CONTEXT/layout-lock.md extracting documentation about the Layout Lock pattern for AI agent collaboration. This pattern solves a recurring problem in AI-assisted development: when a user approves a UI design, subsequent AI agents often "helpfully" modify it by addi

- **[change]** Extracted Version System Documentation to Context File ()
  - The primary session created .claude/CONTEXT/version-system.md extracting version and deployment documentation from the main CLAUDE.md file. This continues the documentation modularization pattern by isolating information about the auto-update notification system. The version system solves the common

- **[change]** Extracted Database Documentation to Dedicated Context File ()
  - The primary session extracted database configuration and schema documentation from CLAUDE.md into a dedicated file at .claude/CONTEXT/database.md. This continues the documentation modularization effort by isolating database-specific information. The file highlights a critical architectural gotcha: t


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
