# Agent 3: Week View Component

## Task
Create `website/src/components/customer/CustomerWeekView.tsx`

## Layout (from reference image)
- Header: Week navigation (prev/next week, date range display)
- 7-column grid for days
- Each column: Day header (DD/MM + weekday name) + stacked cards

## Day Header
```tsx
<div className="text-center py-2 border-b">
  <div className="text-sm font-semibold text-gray-900">07/04</div>
  <div className="text-xs text-gray-500">Thứ Ba</div>
</div>
```

## Column Layout
```tsx
<div className="flex gap-4 overflow-x-auto">
  {days.map(day => (
    <div key={day.date} className="flex-1 min-w-[200px]">
      <DayHeader date={day.date} />
      <div className="space-y-2 p-2">
        {day.appointments.map(apt => (
          <AppointmentCard key={apt.id} {...apt} />
        ))}
      </div>
    </div>
  ))}
</div>
```

## Card Design
Same as Day View - reuse CustomerCalendarCard component

## Props
```typescript
interface CustomerWeekViewProps {
  weekStart: string; // YYYY-MM-DD (Monday)
  appointmentsByDay: Record<string, CustomerCalendarItem[]>;
  onAppointmentClick?: (apt: CustomerCalendarItem) => void;
}
```

## Navigation
- Left arrow: previous week
- Right arrow: next week
- "Hôm nay" button: jump to current week

## Weekday Names (Vietnamese)
T2 (Mon), T3 (Tue), T4 (Wed), T5 (Thu), T6 (Fri), T7 (Sat), CN (Sun)
