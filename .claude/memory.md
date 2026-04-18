# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-18 09:35:33  
> Project: Tgroup | Sessions tracked: 130

---

## 🔥 Recent Observations

- **[bugfix]** Completed sourceId edit form bug fix and deployed to production ()
  - Successfully resolved the bug where customer source selection appeared blank when editing existing service records. The root cause was a missing field in the initialData object passed to ServiceForm in edit mode. The fix required three coordinated changes: adding sourceId to the CustomerProfile edit

- **[change]** Build successful after sourceId type fixes ()
  - Successfully built the application after resolving the TypeScript type errors related to the sourceId field. The build process completed cleanly with all modules compiled and bundled into optimized chunks. The Customers module containing the fixed sourceId mapping compiled to 113.35 kB, and the over

- **[bugfix]** Added sourceId to CustomerService type and mapping in Customers.tsx ()
  - Resolved the TypeScript compilation error by completing the type safety chain for the sourceId field. Added the sourceId property to the CustomerService interface as an optional nullable string, following the same pattern used for other optional identifiers like assistantId and dentalAideId. Updated

- **[discovery]** Located CustomerService interface definition needing sourceId field ( null), which matches the pattern needed for sourceId. Adding sourceId and sourceName as optional fields will align the type definition with the actual data structure and resolve the TypeScript compilation error.)
  - Located the CustomerService interface definition that needs to be augmented with source tracking fields. The interface is well-structured with 24 fields covering service identification, staffing (doctorId, assistantId, dentalAideId), financial data (cost, paidAmount, residual), and metadata (orderNa

- **[discovery]** TypeScript build error: CustomerService type missing sourceId property ()
  - Build process revealed a TypeScript type safety issue after adding sourceId to the edit service initialData. While the runtime code references editingService.sourceId, the CustomerService type definition does not declare this property, causing a compilation error. The version generation script succe

- **[bugfix]** Fixed sourceId not loading in CustomerProfile edit service form ()
  - Fixed a bug where the customer source field was not pre-populated when editing an existing service record from the CustomerProfile component. The ServiceForm component was already designed to handle sourceId through its initialData prop, but CustomerProfile.tsx was constructing the edit initialData 

- **[discovery]** ServiceForm manages sourceId state but CustomerProfile does not provide it in edit initialData ()
  - Traced the sourceId data flow through the ServiceForm component and identified a critical inconsistency. The ServiceForm component properly manages sourceId in its state (line 93) and is designed to receive it via initialData prop. When used in the Services page, the entire ServiceRecord object (whi

- **[discovery]** ServiceForm component usage patterns across the application ()
  - Mapped the usage patterns of ServiceForm throughout the application to understand how it operates in different contexts. The form follows a standard create/edit pattern where the isEdit prop controls behavior and initialData provides pre-filled values for editing. It's used in two primary locations:

- **[discovery]** Edit service modal missing sourceId in initialData mapping ()
  - Identified a gap in the edit service flow where sourceId and sourceName fields are not being passed to the ServiceForm component. When a user edits an existing service in CustomerProfile, the component maps 14 fields from editingService to the form's initialData prop, but sourceId and sourceName are

- **[discovery]** Verified source tracking data exists in production database ()
  - Verified that source tracking is already implemented in the production database by querying the SaleOrders API. The authentication flow uses email/password to obtain a JWT Bearer token, which is then used to retrieve sale order records. The API returns sourceid and sourcename fields in lowercase for


---

## 📋 Recent Session Summaries

### User needs to hard refresh browser (Cmd+Shift+R) on port 5174 to clear Vite's module cache and see the fix in action. The previously-saved source selection should now display correctly when reopening Edit Service forms.
- **Request:** Fix bug where saved customer source (sourceId) appears blank when reopening Edit Service form from CustomerProfile
- **Completed:** Fixed three files and deployed version 0.20.8 to production: added sourceId: editingService.sourceId to CustomerProfile.tsx line 706 edit initialData, added readonly sourceId?: string 
- **Next steps:**  null to CustomerService interface in types/customer.ts line 136, and added sourceId: r.sourceId to Customers.tsx line 584 saleServices mapping. Updated package.json to v0.20.8, added CHANGELOG entry,

### 
- **Request:** Review and refine proposed additions to global CLAUDE.md based on usage insights
- **Completed:** Assessment completed identifying VPS deployment rules as genuine gap, scope discipline as duplicate of existing Goal Discipline section, and LLM/platform configs as misplaced candidates better suited for dedicated rules files
- **Next steps:** Awaiting user approval to apply two minimal global CLAUDE.md changes (new VPS & Deployment section, extended Safety rule) and create two separate rules files for Kimi config and macOS platform notes

### 
- **Request:** Generated shareable usage insights report from Claude Code session data
- **Completed:** HTML insights report generated and saved to ~/.claude/usage-data/report.html, ready for viewing and sharing
- **Next steps:** User reviewing the generated report and considering whether to explore specific sections or implement suggested improvements from the insights

### 
- **Request:** Verify sourceId end-to-end functionality and identify deployment gap between code and running container
- **Completed:** Three complete bugfix releases committed and pushed to main: v0.20.5 (ServiceForm title + API COALESCE), v0.20.6 (customer profile tags + assignments header), v0.20.7 (sourceId relay chain + form label). End-to-end API verification confirmed PATCH /SaleOrders/:id correctly updates and returns source
- **Next steps:** Deployment decision needed: either direct user to port 5174 (Vite dev with all fixes) or rebuild Docker tgroup-web container to include commits ed851261, 2f683d89, and 66dc1ecf. Session appears to be 

### Three bugfix sessions complete (v0.20.5 service form + API COALESCE, v0.20.6 customer profile tags + assignments, v0.20.7 sourceId relay chain). All work appears finished and deployed
- **Request:** Fix customer source field being dropped during service create/edit and restore missing label
- **Completed:** Version 0.20.7 (commit 66dc1ecf) shipped with complete sourceId relay chain fix: added sourceId?: string 
- **Next steps:**  null to CustomerProfile.tsx onCreateService/onUpdateService prop types and both onSubmit relay calls; added sourceId to Customers.tsx handleCreateService/handleUpdateService type signatures and both 


---

> 💡 Tip: Run `./scripts/sync-claude-mem.sh` to refresh this file from the latest claude-mem data.
