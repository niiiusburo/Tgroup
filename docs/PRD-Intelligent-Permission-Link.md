# PRD: Intelligent Permission Link

## 1. Objective

Enable **deep-linking into the Permission Board** so that any group (role) can be shared, previewed, or navigated to directly via URL. This solves the problem of "each role is underneath a group — I want that group to show what they are allowed to see."

## 2. Background

The TG Clinic dashboard currently has two permission-related pages:
- **`/permissions`** — Permission Board with 3 tabs: Architecture, Permission Matrix, Logic Flow
- **`/relationships`** — Relationships page with 2 tabs: Permission Matrix, Entity Relationships

The Permission Board already renders a matrix of groups vs. modules/actions (matching the 5 clinic roles: Admin, Clinic Manager, Dentist, Receptionist, Dental Assistant). However, there is **no way to link directly to a specific group's permissions** or to share a read-only view of what a group can access.

## 3. Goals

1. **Deep-linkable groups**: Any group can be opened directly via URL query params.
2. **Shareable preview**: Generate a shareable link that shows "what this group is allowed to see" without exposing edit controls.
3. **Cross-page navigation**: Clicking a role/group anywhere in the app (e.g., Employees list) links directly to the permission board filtered to that group.
4. **Backward compatibility**: The existing Permission Board continues to work exactly as before when no query params are present.

## 4. Non-Goals

- Out-of-scope: Public/external sharing (no unauthenticated previews).
- Out-of-scope: Generating PDF or image exports from the link.
- Out-of-scope: Real-time collaborative editing of permissions.

## 5. User Stories

| As a... | I want to... | So that... |
|---------|--------------|------------|
| Clinic Manager | Click "View Permissions" on an employee profile | I can see exactly what their group allows them to do |
| Admin | Copy a link to the Dentist permissions | I can send it to a department head for review |
| Admin | Open `/permissions?group=dentist&view=matrix` directly | I can bookmark the Dentist permission matrix |
| Employee | View my own group's permissions via a read-only link | I understand what I have access to |

## 6. Functional Requirements

### 6.1 URL Schema

The Permission Board (`/permissions`) accepts the following query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `group` | `string` | Group ID or slug (e.g., `dentist`, `clinic-manager`) |
| `view` | `string` | One of `architecture` (default), `matrix`, `flow` |
| `mode` | `string` | Optional. `edit` (default for admins) or `preview` (read-only) |

**Examples:**
- `/permissions?group=dentist` — Opens Architecture view with Dentist group selected
- `/permissions?group=dentist&view=matrix` — Opens Matrix view filtered to Dentist
- `/permissions?group=receptionist&view=matrix&mode=preview` — Read-only matrix for Receptionist

### 6.2 Intelligent Link Component

Create a reusable component `<PermissionLink groupId="..." view="matrix" mode="preview" children={...} />` that constructs the URL.

**Usage locations:**
- Employee profile page: "View Group Permissions" link
- Employees table: Role badge is clickable
- Settings > Permissions: "Copy link" button on each group card

### 6.3 Permission Board Behavior

When query params are present:

1. **Parse on mount**: `usePermissionBoard` reads `window.location.search` and sets initial `selectedGroupId` and `view`.
2. **Auto-select group**: In Architecture view, the group card is highlighted. In Matrix view, only that group's columns are shown.
3. **Read-only preview**: When `mode=preview`, all toggle buttons, edit forms, and save buttons are hidden. The page shows only the matrix/group details.
4. **Sync with URL**: If the user clicks a different group or tab, update the query params via `history.replaceState` (so back/forward navigation works).

### 6.4 Matrix View Filtering

The existing `MatrixView` already maps over all groups. When `group` is specified in the URL:
- Filter the table headers to show only the selected group
- Filter the `roleAccess` rows similarly
- Show a prominent header: "Viewing permissions for: **Dentist**"
- Include a "Clear filter" button that removes the `group` param

### 6.5 Architecture View Filtering

When `group` is specified:
- Pre-select the group card in the left column
- Highlight all employees assigned to that group in the middle column
- Highlight all locations accessible by members of that group in the right column

## 7. Technical Requirements

### 7.1 Frontend Changes

1. **`pages/PermissionBoard.tsx`**
   - Read query params on mount using `useSearchParams` from `react-router-dom`
   - Initialize `view` and `selectedGroupId` from URL
   - Conditionally render in read-only mode when `mode=preview`
   - Update URL when user changes tabs or selections

2. **`hooks/usePermissionBoard.ts`**
   - Accept optional initial state from URL params
   - Expose `setView` and `setSelectedGroupId` for URL sync

3. **`components/shared/PermissionLink.tsx` (new)**
   - Build URLs with proper encoding
   - Accept `groupId`, `view`, `mode`, and children props

4. **`components/relationships/PermissionMatrix.tsx`**
   - Support `initialSelectedRoleId` from URL for the Relationships page version

### 7.2 Backend Changes

No backend changes required. The existing `/api/Permissions/groups` and `/api/Permissions/employees` endpoints already provide all necessary data.

### 7.3 Route Guard

The existing `ROUTE_PERMISSIONS['/permissions'] = 'permissions.view'` guard remains. For `mode=preview`, the user still needs `permissions.view`.

## 8. UI/UX Design

### 8.1 Share Button on Group Card

In Architecture view, each group card gets a small link icon in the top-right corner. Clicking it:
1. Copies the intelligent link to clipboard
2. Shows a toast: "Link copied — this link opens the Dentist permission matrix"

### 8.2 Read-Only Preview Header

When `mode=preview`:
- Page title changes to "Dentist Permissions"
- Hide the "Edit" button on employee cards
- Hide the toggle buttons in Matrix view
- Hide the tab bar (or disable it)

### 8.3 Employee Profile Integration

On the Employees page, add a secondary action:
- Text: "View Permissions"
- Icon: `<ExternalLink />`
- URL: `/permissions?group={{groupId}}&view=matrix&mode=preview`

## 9. Acceptance Criteria

- [ ] `/permissions?group=dentist` opens the Permission Board with Dentist pre-selected
- [ ] `/permissions?group=dentist&view=matrix` shows only the Dentist column in the matrix
- [ ] `/permissions?group=dentist&mode=preview` hides all edit controls
- [ ] Clicking "View Permissions" from an employee profile navigates to their group's permissions
- [ ] Copying a group link and opening it in a new tab restores the same view
- [ ] No regressions in the existing Permission Board when no query params are present
- [ ] All existing E2E tests (`permissions-tooltips.spec.ts`, `permissions-check.spec.ts`) continue to pass

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| URL group ID/slug changes break bookmarks | Use stable UUIDs in the URL (`?group=uuid`) and map to slugs for display only |
| Users share `mode=preview` links but expect to edit | Preview mode clearly shows "Read-only view" badge; edit controls are completely removed |
| Large matrices with 1 group still scroll horizontally | Ensure the single-column view is responsive; use min-width but allow horizontal scroll |

## 11. Implementation Phases

**Phase 1 — URL Sync (1 day)**
- Add `useSearchParams` to PermissionBoard
- Initialize `view` and `selectedGroupId` from URL
- Update URL on tab/group changes

**Phase 2 — Read-Only Preview (1 day)**
- Add `mode=preview` support
- Hide edit controls conditionally
- Add preview header/badge

**Phase 3 — Cross-Page Links (1 day)**
- Create `<PermissionLink>` component
- Add "View Permissions" action to employee profile and employees table
- Add "Copy link" action to group cards

**Phase 4 — E2E Tests (1 day)**
- Add tests for URL param parsing
- Add tests for read-only preview
- Add tests for copy-link flow

## 12. Appendix: Current Permission Matrix (Verified)

The database currently contains 5 permission groups that match the image:

| Group | Key Permissions |
|-------|-----------------|
| **Admin** | Full access (all modules, all actions) |
| **Clinic Manager** | Overview, Calendar, Customers (view/add/edit), Appointments, Services, Payment, Employees, Reports, Commission, Settings |
| **Dentist** | Overview, Calendar (view/edit), Customers (view), Appointments (view/add/edit), Services (view), Commission (view) |
| **Receptionist** | Overview, Calendar (view/edit), Customers (view/add/edit), Appointments (view/add/edit), Payment (view/add/edit) |
| **Dental Assistant** | Overview, Calendar (view), Customers (view), Services (view), Appointments (view), Notifications |

*Note: Validation completed. The permission matrix in the DB aligns with the provided screenshot.*
