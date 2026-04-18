# Layout Locking — Protect Approved UI Decisions

## The Problem
When the user approves a UI design, future AI agents often "fix" or "improve" it, breaking what was already approved.

## The Solution
Add `⚠️ LAYOUT LOCK` comments in component files to mark approved designs. Any agent MUST NOT change locked elements without explicit user approval.

## Lock Format

```typescript
/**
 * ComponentName - Description
 * ...
 * ⚠️ LAYOUT LOCK: Do NOT change [specific element] without user approval.
 *    [Why it was locked, e.g., "User approved this exact size on 2024-04-08"]
 */
```

## Examples

### PatientCard (PatientCheckIn.tsx)
```typescript
/**
 * ⚠️ LAYOUT LOCK: Do NOT add width/height constraints or truncate classes to PatientCard.
 *    Card content (customer name, doctor info, notes) MUST display fully without truncation.
 *    Any changes to card dimensions require explicit user approval.
 */
```

### CardGrid (Example)
```typescript
/**
 * ⚠️ LAYOUT LOCK: Grid uses 4 columns at fixed widths.
 *    Changing grid-template-columns will break the approved card layout.
 *    User approved: "4 columns, each card min-width 180px" on 2024-04-08
 */
```

## Rules for Agents
1. **Read layout locks** — Check for `⚠️ LAYOUT LOCK` in component comments before making changes
2. **Do NOT auto-fix** — Never add `truncate`, `w-*`, `h-*`, `max-w-*`, or `min-w-*` to locked elements
3. **Ask first** — If you think a locked element needs fixing, describe the issue and ask for approval
4. **Respect final approval** — If user says "looks good" or "don't change this", add a layout lock immediately
