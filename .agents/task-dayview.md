# Agent 2: Day View Component

## Task
Create `website/src/components/customer/CustomerDayView.tsx`

## Design (Keep Current Style)
- Single column timeline
- Time slots from 07:00 to 20:00 in 30-min increments
- Show actual appointments within their time slots
- Empty slots show dashed placeholder

## Card Design (matches reference)
```tsx
<div className="rounded-lg p-3 border-l-4 shadow-sm">
  {/* Status badge top-left */}
  <span className="text-xs font-semibold px-2 py-0.5 rounded-full">
    {statusLabel}
  </span>
  
  {/* Customer name - bold */}
  <h4 className="font-semibold text-gray-900">{customerName}</h4>
  
  {/* Phone with icon */}
  <div className="flex items-center gap-1 text-sm text-gray-600">
    <Phone className="w-3.5 h-3.5" />
    {phone}
  </div>
  
  {/* Doctor with icon */}
  <div className="flex items-center gap-1 text-sm text-gray-600">
    <User className="w-3.5 h-5" />
    {doctorName}
  </div>
  
  {/* Time with icon */}
  <div className="flex items-center gap-1 text-sm text-gray-600">
    <Clock className="w-3.5 h-3.5" />
    {time}
  </div>
  
  {/* Service/note */}
  <p className="text-xs text-gray-500 mt-1">{serviceName}</p>
</div>
```

## Status Colors (from reference)
- arrived (Đã đến): bg-emerald-50 text-emerald-700 border-emerald-200
- scheduled (Đang hẹn): bg-blue-50 text-blue-700 border-blue-200
- cancelled (Hủy hẹn): bg-red-50 text-red-700 border-red-200
- no-show (Quá hẹn): bg-amber-50 text-amber-700 border-amber-200

## Props
```typescript
interface CustomerDayViewProps {
  date: string; // YYYY-MM-DD
  appointments: CustomerCalendarItem[];
  onAppointmentClick?: (apt: CustomerCalendarItem) => void;
}
```

## Features
- Group appointments by time slot
- Click card to open customer profile
- Show "No appointments" message for empty day
