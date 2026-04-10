# AUDIT TEAM: Design Consistency (Team C)

## CONTEXT
Tgroup dental clinic dashboard. Audit UI design consistency across all components.

## DESIGN SYSTEM REFERENCE
Read /Users/thuanle/Documents/TamTMV/Tgroup/website/src/constants/index.ts
This is the SINGLE SOURCE OF TRUTH for:
- STATUS_COLORS
- APPOINTMENT_STATUS_COLORS
- PAYMENT_STATUS_COLORS
- THEME_COLORS
- APPOINTMENT_CARD_COLORS (codes 0-7)
- APPOINTMENT_STATUS_OPTIONS
- APPOINTMENT_STATUS_LABELS_VI
- APPOINTMENT_TYPE_LABELS

## WHAT TO CHECK
1. **Color consistency**: Same status = same color everywhere? Search for:
   - Hardcoded hex colors (e.g., "#10B981", "bg-green-100" when should use constants)
   - Green/yellow/red/blue/emerald used directly instead of STATUS_COLORS
   - Appointment colors: any component NOT using APPOINTMENT_CARD_COLORS?
   - StatusBadge vs inline status color logic

2. **Spacing/padding**: Consistent spacing patterns? (e.g., p-4 vs p-6 for cards)

3. **Card patterns**: All cards same border radius, shadow, hover states?

4. **Badge patterns**: StatusBadge used everywhere or inline badges re-invented?

5. **Table patterns**: DataTable used everywhere or custom table logic?

6. **Typography**: Font sizes, weights consistent for similar elements?

7. **Button patterns**: Same button sizes, variants across app?

8. **Form patterns**: Consistent label/input/validations styling?

9. **Modal patterns**: Consistent modal structure across EditAppointmentModal and others?

10. **Icon consistency**: Same icon library throughout? Icons used correctly?

11. **Status mapping**: Are the 3 APPOINTMENT_STATUS_OPTIONS used everywhere? 
    Or do some components use different status strings?

## OUTPUT FORMAT
Per-team report with specific file + line references. Design gap → where it's defined → where it's violated → severity.
