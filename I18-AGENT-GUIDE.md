# I18n Extraction Agent Guide

## Project
- Worktree: `/Users/thuanle/Documents/TamTMV/Tgroup-I18/website`
- Source: `/Users/thuanle/Documents/TamTMV/Tgroup-I18/website/src`
- All changes happen in the worktree, NOT the main repo

## i18n Setup
- Library: `i18next` + `react-i18next`
- Config: `src/i18n/index.ts`
- Vietnamese locales: `src/i18n/locales/vi/*.json`
- English locales: `src/i18n/locales/en/*.json`
- Namespaces: common, nav, overview, calendar, customers, appointments, services, payment, employees, locations, reports, settings, auth, website, permissions, feedback, commission, notifications, relationships

## Pattern for Extracting Strings

### Step 1: Import useTranslation
```tsx
import { useTranslation } from 'react-i18next';
```

### Step 2: Use the correct namespace
```tsx
const { t } = useTranslation('calendar'); // or 'customers', 'payment', etc.
```

If a component uses multiple namespaces, you can do:
```tsx
const { t } = useTranslation(['calendar', 'common']);
// then t('calendar:key') or t('key', { ns: 'common' })
```
But prefer a single primary namespace per component.

### Step 3: Replace hardcoded strings

**JSX text:**
```tsx
// BEFORE
<span>Tất cả</span>
// AFTER
<span>{t('all')}</span>
```

**Attributes:**
```tsx
// BEFORE
title="Đổi mật khẩu"
placeholder="Tìm kiếm..."
aria-label="Hủy hẹn"
// AFTER
title={t('changePassword')}
placeholder={t('searchPlaceholder')}
aria-label={t('cancelAppointment')}
```

**Dynamic strings with interpolation:**
```tsx
// BEFORE
<span>Đã đến: ({counts.confirmed})</span>
// AFTER
<span>{t('arrivedCount', { count: counts.confirmed })}</span>
// In JSON: "arrivedCount": "Đã đến: ({{count}})"
```

**Comments should NOT be i18n'd:**
```tsx
{/* ── LEFT: Thông tin cơ bản ── */}  // LEAVE AS IS
```

**Console messages should NOT be i18n'd.**
**Mock data in test files should NOT be i18n'd.**
**CSS class names should NOT be i18n'd.**

### Step 4: Add keys to locale files

For EVERY key you add, update BOTH files:
- `src/i18n/locales/vi/<namespace>.json`
- `src/i18n/locales/en/<namespace>.json`

Follow the existing JSON structure. Use camelCase keys.

Example:
```json
{
  "smartFilter": {
    "title": "Bộ lọc",
    "close": "Đóng",
    "doctors": "Bác sĩ"
  },
  "exportDialog": {
    "title": "Xuất dữ liệu lịch hẹn",
    "byCurrentFilter": "Theo bộ lọc hiện tại",
    "byDateRange": "Theo khoảng thờigian",
    "close": "Đóng",
    "exportFile": "Xuất file"
  }
}
```

### Step 5: Check constants files

If a file exports hardcoded label mappings (like `STATUS_LABELS`, `ROLE_LABELS`), these should be converted to use `t()` at the call site, OR the constants file should import a translation function. Prefer converting at call sites.

For `constants/statusStyles.ts`:
- The style mappings (bg-*, text-*) stay as-is
- The label mappings (`STATUS_LABELS`, `TIER_LABELS`, `ROLE_LABELS`) should be removed and callers should use `t()` from the appropriate namespace
- Update all files that import these label constants

### Step 6: Verify

After making changes, run:
```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup-I18/website
node /tmp/i18n-scan.js
```

This should show `Orphans: 0`.

Also run a TypeScript check:
```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup-I18/website
npx tsc --noEmit
```

Fix any TS errors before finishing.

## Domain-to-Namespace Mapping

| Domain | Namespace | Files |
|--------|-----------|-------|
| Calendar | `calendar` | pages/Calendar.tsx, components/calendar/* |
| Appointments | `appointments` | pages/Appointments/*, components/appointments/* |
| Customers | `customers` | pages/Customers*, components/customer/*, components/forms/AddCustomerForm/* |
| Employees | `employees` | pages/Employees/*, components/employees/* |
| Payment | `payment` | pages/Payment.tsx, components/payment/* |
| Services | `services` | pages/ServiceCatalog.tsx, pages/Services/*, components/services/* |
| Settings | `settings` | pages/Settings/*, components/settings/* |
| Reports | `reports` | pages/reports/*, components/reports/* |
| Shared/UI | `common` or domain-specific | components/shared/*, components/ui/*, components/Layout.tsx |
| Website | `website` | pages/Website.tsx, components/website/* |
| Locations | `locations` | pages/Locations.tsx, components/locations/* |
| Auth | `auth` | pages/Login.tsx, contexts/AuthContext.tsx |
| Overview | `overview` | pages/Overview.tsx |
| Modules | domain-specific | components/modules/* (use relevant namespace) |
| Permissions | `permissions` | pages/PermissionBoard/*, components/relationships/* |
| Feedback | `feedback` | pages/Feedback.tsx |
| Commission | `commission` | pages/Commission.tsx |
| Notifications | `notifications` | pages/Notifications.tsx |
| Relationships | `relationships` | pages/Relationships.tsx |

## Rules
1. ONLY extract actual UI strings that users see
2. Skip comments, console.logs, mock data, CSS classes
3. Skip data/serviceCatalog.ts (business data, not UI)
4. Skip API error messages that are dynamic/server-generated unless they're fallback defaults
5. For arrays of labels/objects with Vietnamese text, extract each label
6. Maintain existing code style (no formatting changes)
7. Add new keys in logical groups within the JSON files
8. NEVER delete existing keys from locale files
9. If an English locale file is missing a key that the Vietnamese file has, add the English translation
10. Run `npx tsc --noEmit` after changes to verify no TS errors
