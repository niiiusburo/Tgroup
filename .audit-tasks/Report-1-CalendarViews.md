# Audit Report 1: Calendar Views Date/Time Issues

## Summary
**Status:** ✅ No Critical Issues Found  
**Files Audited:** 3  
**Issues Found:** 2 minor improvements suggested

---

## DayView.tsx
**Status:** ✅ Good

### Findings:
1. Uses `currentDate.toLocaleDateString('vi-VN', {...})` for header display - **Correct**
2. Uses custom `formatDateStr()` that properly builds YYYY-MM-DD without timezone issues - **Good**
3. Time slots displayed as-is from TIME_SLOTS constant - **No issues**

### Code Quality: HIGH

---

## WeekView.tsx
**Status:** ⚠️ Minor Issues Found

### Issue 1: Potential Timezone Issue in formatDateKey
**Location:** Line 101  
**Severity:** Medium  
**Current Code:**
```typescript
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}
```
**Problem:** `toISOString()` returns UTC time, which can cause the date key to be off by one day if the local time is close to midnight.

**Suggested Fix:**
```typescript
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

### Issue 2: formatDateDisplay could be clearer
**Location:** Line 105  
**Severity:** Low  
**Current Code:**
```typescript
function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}
```
**Note:** This uses local timezone which is correct for display. No change needed.

### Code Quality: MEDIUM

---

## MonthView.tsx
**Status:** ✅ Good

### Findings:
1. Uses `formatDateKey()` same as WeekView - **Same potential timezone issue**
2. Uses `date.getDate()` for day number display - **Correct**
3. Uses `date.getMonth()` for current month check - **Correct**

### Issue 1: Same Timezone Issue
**Location:** Line 48  
**Severity:** Medium  
**Same issue as WeekView:** `toISOString()` can cause off-by-one-day errors near midnight.

### Code Quality: MEDIUM

---

## Recommended Actions

### High Priority:
1. **Fix formatDateKey in WeekView.tsx** - Use local date components instead of toISOString()
2. **Fix formatDateKey in MonthView.tsx** - Use local date components instead of toISOString()

### Code Changes Required:
```typescript
// BEFORE (problematic):
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]; // UTC-based, can be off by one day
}

// AFTER (correct):
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

---

## Verification Checklist
- [ ] WeekView.tsx formatDateKey fixed
- [ ] MonthView.tsx formatDateKey fixed
- [ ] Calendar navigation tested across timezone boundaries
- [ ] Today highlighting works correctly at midnight
