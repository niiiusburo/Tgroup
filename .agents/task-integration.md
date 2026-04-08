# Agent 5: Integration & Hook

## Task
1. Create `useCustomerCalendar` hook
2. Refactor `Customers.tsx` page with 4-view tabs

## Hook: useCustomerCalendar.ts
```typescript
interface UseCustomerCalendarReturn {
  // Data
  appointmentsByDay: Record<string, CustomerCalendarItem[]>;
  loading: boolean;
  error: string | null;
  
  // View state
  viewMode: 'list' | 'day' | 'week' | 'month';
  setViewMode: (mode: ViewMode) => void;
  
  // Date navigation
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  
  // Derived
  weekStart: Date;
  weekEnd: Date;
  monthStart: Date;
  monthEnd: Date;
}
```

## Customers.tsx Refactor

### Tab Navigation (below page header)
```tsx
const TABS = [
  { key: 'list', label: 'Danh sách' },
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
] as const;

<div className="flex items-center gap-1 mb-4">
  {TABS.map(tab => (
    <button
      key={tab.key}
      onClick={() => setViewMode(tab.key)}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        viewMode === tab.key
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### View Switching
```tsx
{viewMode === 'list' && <DataTable ... />}
{viewMode === 'day' && <CustomerDayView date={currentDate} ... />}
{viewMode === 'week' && <CustomerWeekView weekStart={weekStart} ... />}
{viewMode === 'month' && <CustomerMonthView year={year} month={month} ... />}
```

### Date Navigation (for Day/Week/Month views)
```tsx
<div className="flex items-center gap-2 mb-4">
  <button onClick={goToPrevious} className="p-2 hover:bg-gray-100 rounded-lg">
    <ChevronLeft className="w-5 h-5" />
  </button>
  <span className="font-medium">
    {formatDateRange(currentDate, viewMode)}
  </span>
  <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded-lg">
    <ChevronRight className="w-5 h-5" />
  </button>
  <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
    Hôm nay
  </button>
</div>
```

## API Integration
Use `fetchAppointments` with date range from hook
Transform response to `Record<string, CustomerCalendarItem[]>`

## Keep Existing Features
- Search bar (filter appointments)
- Add Customer button
- Location filter (from context)
- Click customer → open profile
