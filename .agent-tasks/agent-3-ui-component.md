# Agent 3: UI Component for IP Access Control

## Goal
Create the `IpAccessControl` component for the Settings page with full CRUD UI.

## Context
Create a settings panel similar to `SystemPreferences` in `src/components/settings/SystemPreferences.tsx`. This component will be integrated into the Settings page.

## Files to Create/Modify

### 1. Create: `src/components/settings/IpAccessControl.tsx`
Implement component with:

**Header Section:**
- Title: "IP Access Control"
- Description: "Manage IP whitelist and blacklist to control access to the system"

**Mode Selector:**
- Radio buttons or select for access mode:
  - "Allow All" - No IP restrictions
  - "Whitelist Only" - Only allow IPs in whitelist
  - "Blacklist Block" - Block IPs in blacklist, allow others

**IP Entry List:**
- Table showing all entries with columns:
  - IP Address
  - Type (whitelist/blacklist badge)
  - Description
  - Status (active/inactive toggle)
  - Actions (edit, delete)
- Filter tabs: All | Whitelist | Blacklist
- Empty state when no entries

**Add New Entry Form:**
- IP Address input with validation
- Type selector (whitelist/blacklist)
- Description input (optional)
- Add button
- Real-time validation feedback (red border + error message)

**Stats Cards:**
- Total entries count
- Active whitelist count
- Active blacklist count
- Current mode indicator

## TDD Requirements
Write tests FIRST in `src/__tests__/IpAccessControl.component.test.tsx`:
1. Test component renders with title and description
2. Test mode selector changes mode
3. Test adding valid IP entry shows in list
4. Test validation error shows for invalid IP
5. Test duplicate IP shows error
6. Test delete button removes entry
7. Test toggle button changes active status
8. Test filter tabs show correct entries
9. Test empty state renders when no entries

Run tests: `cd website && npx vitest run src/__tests__/IpAccessControl.component.test.tsx`

## Styling Requirements
- Use Tailwind CSS (match existing patterns)
- Use Lucide icons (Shield, Plus, Trash2, Edit, AlertCircle, Check, X)
- Follow design system from existing components:
  - `bg-white rounded-xl shadow-card` for cards
  - `text-primary` for primary color
  - `border-gray-200` for borders
  - Proper spacing with `space-y-6`, `gap-4`, etc.
- Whitelist entries: green badges/accents
- Blacklist entries: red badges/accents
- Responsive design (stack on mobile)

## Constraints
- Use the `useIpAccessControl` hook (assume it exists)
- Form validation should show inline errors
- Confirm before delete (use window.confirm for now)
- No external form libraries (controlled components only)
- Accessible (labels, aria attributes)

## Output
Return summary of:
1. Component structure and sub-components
2. User interactions implemented
3. Test coverage and results
4. Styling decisions
5. Any UX improvements made
