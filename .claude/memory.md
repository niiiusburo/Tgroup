# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-05-07 00:41:39  
> Project: Tgroup | Sessions tracked: 169

---

## 🔥 Recent Observations

- **[discovery]** CSV quote parsing fixed by disabling quote handling with quote: false option ()
  - Resolved the CSV parsing failure by setting quote: false in the csv-parse configuration, which disables quote processing entirely. This allows the parser to treat all fields as unquoted, bypassing the malformed quote escaping present in Partners.csv line 37029 and AccountPayments.csv line 63050. Bot

- **[discovery]** Malformed quotes isolated to Partners.csv line 37029 and AccountPayments.csv line 63050 ()
  - Isolated the CSV parsing failures to two specific files: Partners.csv (line 37029) and AccountPayments.csv (line 63050). The other 5 tables parse successfully, including the large 37MB SaleOrderLines file, indicating that the csv-parse library configuration is correct but specific records in Partner

- **[bugfix]** Added defensive null-coalescing to source array accesses in selectClientRows ()
  - Fixed the test failure by adding null-coalescing operators to all source table array accesses in selectClientRows. The function previously assumed all 7 CSV tables would be present in the source object, causing TypeError when test fixtures provided only the necessary subset. Now defaults undefined t

- **[discovery]** TDental CSV export contains malformed quote escaping at line 37029 ()
  - First attempt to run the import script against real TDental CSV export data fails with a quote parsing error at line 37029. Despite using relax_quotes: true in the csv-parse configuration, the library cannot handle the specific quote escaping pattern in the export. The CSV files are production-size 

- **[refactor]** Centralized sale order line mapping and cleaned up timestamp formatting ()
  - Refactored Customers.tsx to eliminate duplicate sale order line mapping logic by using the centralized mapSaleOrderLineToCustomerService utility. This ensures consistent timezone handling across both the UI fetch path and the backend import path. Also improved timestamp formatting in the CSV parser 

- **[discovery]** Jest test fixture missing products and productcategories arrays ()
  - The Jest test for buildClientImportPlan fails because the test fixture only defines 4 of the 7 required source tables. The selectClientRows function attempts to filter products and productcategories arrays to build the full relational graph, but these arrays are undefined in the test fixture. The te

- **[feature]** TDental CSV import script with incremental sync and payment allocation ()
  - Created a TDental migration tool that addresses the data sync gaps discovered during customer T8250 validation. The script reads CSV exports from TDental, compares them against the existing PostgreSQL database to identify missing treatments and financial discrepancies, then applies incremental updat

- **[bugfix]** Fixed payment allocation UPDATE query parameter mismatch ()
  - Fixed a SQL query bug in upsertPaymentAllocations where the UPDATE statement declared 3 parameters but the array only contained 2 values (existingAlloc.rows[0].id, order.id, amount), causing a parameter binding error. The order.id was unused in the SET clause, so it was removed and the amount placeh

- **[feature]** Sale order line to customer service mapper with timezone normalization ()
  - Built a TypeScript mapper to transform database sale order line records into the customer service UI format. The normalizeServiceDate function addresses the timezone bug by extracting date-only portions (YYYY-MM-DD) from timestamps using the Asia/Ho_Chi_Minh timezone, preventing the -1 day shift cau

- **[discovery]** TDental to TG Clinic data sync gaps for customer T8250 ()
  - During pre-migration validation of TDental data downloaded to all Data-4-25 folder, comparison of customer T8250 revealed three categories of data quality issues. First, 4 recent treatments from April 2026 are missing in TG Clinic, causing a financial discrepancy of exactly 43.364.000 ₫ between syst


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
