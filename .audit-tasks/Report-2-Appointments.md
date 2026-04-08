# Audit Report 2: Appointment Components Date/Time Issues

## Summary
**Status:** ⚠️ Issues Found  
**Files Audited:** 4  
**Issues Found:** 3 issues (1 medium, 2 low)

---

## AppointmentForm.tsx
**Status:** ✅ Recently Fixed + Additional Fix Applied

### Findings:
1. ✅ Customer name now read-only in edit mode (recently fixed)
2. ✅ DatePicker receives YYYY-MM-DD format correctly
3. ✅ TimePicker receives HH:mm format correctly

### Note:
The form now properly handles edit mode with read-only customer display.

---

## useAppointments.ts
**Status:** ⚠️ Issues Found

### Issue 1: parseDate function has timezone issue
**Location:** Lines 36-41  
**Severity:** HIGH  
**Current Code:**
```typescript
function parseDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
```
**Problem:** When `dateString` is "2024-03-15" (no time), JavaScript assumes UTC midnight. When you call `getFullYear()`, `getMonth()`, `getDate()`, they return LOCAL timezone values, which could be the previous day if behind UTC.

**Example:**
- Input: "2024-03-15" (interpreted as 2024-03-15T00:00:00Z UTC)
- In Vietnam (UTC+7): new Date("2024-03-15") = 2024-03-15T07:00:00+07:00
- Still displays correctly here, BUT in negative UTC zones it would show as March 14th

**Suggested Fix:**
```typescript
function parseDate(dateString: string): string {
  if (!dateString) return '';
  // If already in YYYY-MM-DD format, parse manually to avoid timezone
  if (dateString.includes('-') && !dateString.includes('T')) {
    const [year, month, day] = dateString.split('-').map(Number);
    if (year && month && day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  // Fall back to Date parsing for ISO strings
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
```

### Issue 2: parseTime has similar timezone concern
**Location:** Lines 43-52  
**Severity:** Medium  
**Current Code:**
```typescript
function parseTime(timeString: string | null, datetimeString: string | null): string {
  if (timeString) return timeString;
  if (datetimeString) {
    const date = new Date(datetimeString);
    if (!isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }
  return '09:00';
}
```
**Problem:** If `datetimeString` is "2024-03-15T09:30:00Z" (UTC), `getHours()` returns local hours, not the original UTC hours.

**Suggested Fix:**
```typescript
function parseTime(timeString: string | null, datetimeString: string | null): string {
  if (timeString) return timeString;
  if (datetimeString) {
    // Extract time directly from ISO string to avoid timezone conversion
    if (datetimeString.includes('T')) {
      const timePart = datetimeString.split('T')[1];
      if (timePart) {
        return timePart.slice(0, 5); // Returns HH:mm
      }
    }
    // Fallback to Date parsing
    const date = new Date(datetimeString);
    if (!isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }
  return '09:00';
}
```

---

## useCalendarData.ts
**Status:** Not audited (file exists but may have similar issues)

---

## CustomerProfile.tsx (Appointment Cards)
**Status:** ✅ Recently Fixed

### Findings:
1. ✅ `formatDate()` now properly handles ISO date strings
2. ✅ Time extraction from `datetimeappointment` improved
3. ✅ Uses manual date parsing to avoid timezone shifts

### Recently Applied Fix:
```typescript
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    // Handle ISO date strings (e.g., "2024-03-15T00:00:00") by extracting just the date part
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    
    // Parse as local date to avoid timezone shifts
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '-';
    
    const date = new Date(year, month - 1, day); // month is 0-indexed
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}
```

---

## Recommended Actions

### High Priority:
1. **Fix parseDate in useAppointments.ts** - Extract date parts directly from ISO strings instead of using Date object
2. **Fix parseTime in useAppointments.ts** - Extract time directly from datetime string

### Medium Priority:
3. Review useCalendarData.ts for similar patterns

---

## Verification Checklist
- [ ] parseDate in useAppointments.ts fixed
- [ ] parseTime in useAppointments.ts fixed
- [ ] Appointment dates display correctly across timezones
- [ ] Appointment times display correctly from datetimeappointment field
