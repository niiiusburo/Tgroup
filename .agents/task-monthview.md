# Agent 4: Month View Component

## Task
Create `website/src/components/customer/CustomerMonthView.tsx`

## Layout (from reference image)
- Header: Month navigation (prev/next month, "Tháng 4 - 2026")
- 7-column header: T2, T3, T4, T5, T6, T7, CN
- Calendar grid: 6 rows x 7 columns

## Day Cell Design
```tsx
<div className={cn(
  "min-h-[100px] p-2 border border-gray-100",
  isToday && "bg-blue-50",
  !isCurrentMonth && "bg-gray-50 text-gray-400"
)}>
  {/* Date number */}
  <div className="text-sm font-medium mb-1">{dayNumber}</div>
  
  {/* Status counts */}
  <div className="space-y-1">
    {counts.arrived > 0 && (
      <div className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle className="w-3 h-3" />
        Đã đến: ({counts.arrived})
      </div>
    )}
    {counts.scheduled > 0 && (
      <div className="flex items-center gap-1 text-xs text-blue-600">
        <Calendar className="w-3 h-3" />
        Đang hẹn: ({counts.scheduled})
      </div>
    )}
    {counts.cancelled > 0 && (
      <div className="flex items-center gap-1 text-xs text-red-600">
        <XCircle className="w-3 h-3" />
        Hủy hẹn: ({counts.cancelled})
      </div>
    )}
    {counts.noShow > 0 && (
      <div className="flex items-center gap-1 text-xs text-amber-600">
        <AlertCircle className="w-3 h-3" />
        Quá hẹn: ({counts.noShow})
      </div>
    )}
  </div>
</div>
```

## Props
```typescript
interface CustomerMonthViewProps {
  year: number;
  month: number; // 1-12
  appointmentsByDay: Record<string, CustomerCalendarItem[]>;
  onDayClick?: (date: string) => void;
  onAppointmentClick?: (apt: CustomerCalendarItem) => void;
}
```

## Features
- Click day cell to switch to Day view
- Show overflow indicator if more than 3-4 appointments
- Today highlighting
- Other month days grayed out
