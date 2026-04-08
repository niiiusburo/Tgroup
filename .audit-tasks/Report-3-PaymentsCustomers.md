# Audit Report 3: Payment & Customer Components Date/Time Issues

## Summary
**Status:** ⚠️ Issues Found  
**Files Audited:** 3  
**Issues Found:** 2 issues (1 medium, 1 low)

---

## DepositHistory.tsx
**Status:** ⚠️ Issue Found

### Issue 1: formatDate uses direct Date parsing
**Location:** Lines 12-16  
**Severity:** Medium  
**Current Code:**
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}
```
**Problem:** Same timezone issue as other components. If dateStr is "2024-03-15", JavaScript interprets it as UTC midnight. In negative UTC timezones, this displays as March 14th.

**Suggested Fix:**
```typescript
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    // Handle ISO date strings by extracting just the date part
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    
    // Parse as local date to avoid timezone shifts
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '-';
    
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return '-';
  }
}
```

---

## Customers.tsx
**Status:** ⚠️ Issue Found

### Issue 1: formatDate has same timezone issue
**Location:** Lines 52-56  
**Severity:** Medium  
**Current Code:**
```typescript
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
```
**Problem:** Same issue - direct Date parsing can shift dates in negative UTC timezones.

**Suggested Fix:** (Same as DepositHistory.tsx)

---

## EmployeeForm.tsx
**Status:** Not audited in detail (may have similar issues if displaying dates)

---

## CustomerProfile.tsx (Non-appointment fields)
**Status:** ✅ Recently Fixed for Appointments

### Note:
The `formatDate` function in CustomerProfile was recently fixed to handle ISO date strings properly. The fix should be applied to other components as well.

---

## Summary of Common Pattern

All date formatting issues stem from this pattern:
```typescript
// PROBLEMATIC:
const date = new Date("2024-03-15");  // Interpreted as UTC
const localDay = date.getDate();       // Could be previous day in -UTC

// CORRECT:
const [year, month, day] = "2024-03-15".split('-').map(Number);
const date = new Date(year, month - 1, day);  // Local date, no shift
```

---

## Recommended Actions

### High Priority:
1. **Fix formatDate in DepositHistory.tsx** - Use manual date parsing
2. **Fix formatDate in Customers.tsx** - Use manual date parsing

### Medium Priority:
3. **Create shared date utility** - Extract the fixed formatDate to a shared utility to avoid duplication

### Suggested Shared Utility:
Create `/Users/thuanle/Documents/TamTMV/Tgroup/website/src/lib/dateFormat.ts`:
```typescript
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '-';
    
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return '-';
  }
}

export function parseTimeFromISO(datetime: string | null): string {
  if (!datetime) return '--:--';
  if (datetime.includes('T')) {
    return datetime.split('T')[1]?.slice(0, 5) || '--:--';
  }
  return '--:--';
}
```

---

## Verification Checklist
- [ ] DepositHistory.tsx uses fixed formatDate
- [ ] Customers.tsx uses fixed formatDate
- [ ] Shared date utility created (optional but recommended)
- [ ] All date displays tested with various timezone settings
