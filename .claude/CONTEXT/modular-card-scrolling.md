# TODO: Apply Modular Card Scrolling to All Related Forms

## Status: PARTIAL (CustomerForm done)

All modular form components MUST follow the **independent card scrolling pattern** as implemented in `AddCustomerForm`.

## The Pattern

```
┌─────────────────────────────────────┐
│ Modal Container (flex, overflow-hidden, max-height)
│ ├── Header (flex-shrink-0)          │ ← Does NOT scroll
│ ├── Main Content (flex flex-1 overflow-hidden)
│ │   ├── Left Sidebar (flex flex-col gap-4 overflow-hidden)
│ │   │   ├── Card 1 (max-height: 300px, flex flex-col)
│ │   │   │   ├── Header (flex-shrink-0)  │ ← Does NOT scroll
│ │   │   │   └── Content (overflow-y-auto)│ ← Scrolls INDEPENDENTLY
│ │   │   ├── Card 2 (max-height: 320px, flex flex-col)
│ │   │   └── Card 3 (max-height: 180px, flex flex-col)
│ │   └── Right Panel (flex-1 flex flex-col overflow-hidden)
│ │       ├── Tabs (flex-shrink-0)     │ ← Does NOT scroll
│ │       └── Tab Content (overflow-y-auto) ← Scrolls INDEPENDENTLY
│ └── Footer (flex-shrink-0)          │ ← Does NOT scroll
└─────────────────────────────────────┘
```

## Key CSS Properties

| Element | Required CSS | Purpose |
|---------|-------------|---------|
| Card Container | `flex flex-col` + `max-height` | Fixed height container |
| Card Header | `flex-shrink-0` | Header stays visible |
| Card Content | `overflow-y-auto flex-1 min-h-0` | Content scrolls independently |
| Content Wrapper | `overflow-hidden` | Prevents entire panel scroll |

## Modules That Need This Pattern

| Module | File | Status |
|--------|------|--------|
| ✅ CustomerForm (Add/Edit) | `components/forms/AddCustomerForm/AddCustomerForm.tsx` | DONE |
| ⬜ AppointmentForm | `components/appointments/AppointmentForm.tsx` | TODO |
| ⬜ ServiceForm | `components/services/ServiceForm.tsx` | TODO |
| ⬜ PaymentForm | `components/payment/PaymentForm.tsx` | TODO |
| ⬜ EmployeeForm | `components/employees/EmployeeForm.tsx` | TODO |

## Reference Implementation

See: `~/Downloads/CardScrollRedesign/app/src/App.tsx`

## When Adding New Modular Forms

1. Use the `CardSection` component with `maxHeight` prop
2. Ensure headers have `flex-shrink-0`
3. Ensure content has `overflow-y-auto flex-1 min-h-0`
4. Add the `### CUSTOMER FORM MODULE` documentation block (copy from AddCustomerForm.tsx)
5. Test: Verify each card scrolls independently without affecting others
