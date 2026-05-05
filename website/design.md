# TGClinic Design System (Evidence-Based)

> Source of truth derived from the actual codebase — not aspirational. Every token below maps to statistically dominant patterns found across `src/`.
> **Last audited**: 2026-04-21 | **Method**: grep frequency analysis + screenshot validation

---

## Design Context

**Product**: TGClinic — Dental practice management dashboard (appointments, patients, billing, staff, reports).

**Target Audience**: Clinic admins, receptionists, dentists. Daily usage 4–8 hours. Needs efficiency, clarity, low cognitive load.

**Brand Personality**: Clean, professional, warm. Medical precision without coldness. Orange conveys energy and care.

**Tone**: Confident but approachable. Organized and predictable.

---

## Color System

### Primary Palette
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#F97316` | CTAs, active nav, key actions, accent highlights |
| `primary-light` | `#FED7AA` | Hover fills, badges, tint backgrounds |
| `primary-lighter` | `#FFF7ED` | Table row hover, selected states |
| `primary-dark` | `#EA580C` | Pressed states, hover emphasis |

### Neutral Palette (by usage frequency)
| Token | Value | Code Usage | Usage |
|-------|-------|------------|-------|
| `background` | `#FFFFFF` | 328 files | Card surfaces, modal bodies, input backgrounds |
| `foreground` | `#111827` (`gray-900`) | 238 files | Primary headings, key labels |
| `body` | `#374151` (`gray-700`) | 247 files | Primary body text |
| `secondary` | `#6B7280` (`gray-500`) | 410 files | Secondary text, metadata, descriptions |
| `muted` | `#9CA3AF` (`gray-400`) | 445 files | Placeholders, disabled icons, timestamps |
| `surface` | `#F9FAFB` (`gray-50`) | 174 files | Section backgrounds, table headers, footer bars |
| `border` | `#E5E7EB` (`gray-200`) | 230 files | Card borders, input borders, dividers |
| `sidebar` | `#1F2937` (`gray-800`) | — | Sidebar navigation background |

### Semantic / Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#10B981` (`emerald-500`) | Confirmed, paid, active |
| `warning` | `#F59E0B` (`amber-500`) | Pending, needs attention |
| `error` | `#EF4444` (`red-500`) | Errors, cancellations, deletions |
| `info` | `#0EA5E9` (`sky-500`) | Info states, links |

### Color Rules
- **DO** use `gray-200` for borders — it dominates the codebase (230 vs 113 for `gray-100`).
- **DO** use `gray-50` for secondary surfaces, not `gray-100`.
- **DO** use `primary-lighter` (`#FFF7ED`) for table row hover and selected states.
- **DON'T** use pure black (`#000`) or pure white (`#fff`) — always use the semantic tokens.
- **DON'T** use gradient text for headings or metrics.
- **DON'T** default to dark mode with glowing accents.

---

## Typography

### Font Family
- **Primary**: `Inter` (weights 400, 500, 600, 700)
- **Fallback**: `system-ui, sans-serif`

### Type Scale (Evidence-Based)
The codebase overwhelmingly uses `text-sm` as the body standard.

| Level | Tailwind Class | Size | Weight | Usage | Frequency |
|-------|---------------|------|--------|-------|-----------|
| Display | `text-2xl` | `1.5rem` (24px) | 600 | Page titles (Overview, Calendar) | Medium |
| H1 | `text-xl` | `1.25rem` (20px) | 600 | Section headers | Medium |
| H2 | `text-lg` | `1.125rem` (18px) | 600 | Card titles, modal headers | Medium |
| H3 | `text-base` | `1rem` (16px) | 600 | Subsection labels | Low (18 files) |
| **Body** | **`text-sm`** | **`0.875rem` (14px)** | **400** | **Primary body text** | **710 files** |
| **Label** | **`text-xs`** | **`0.75rem` (12px)** | **500** | **Labels, badges, timestamps, table headers** | **628 files** |
| Caption | `text-[11px]` | `0.6875rem` (11px) | 500 | Dense table headers | Rare |

### Typography Rules
- **DO** use `text-sm` as the default body size — it is the canonical standard.
- **DO** use weight contrast (400 vs 600) to create hierarchy, not just size.
- **DO** keep line-height at `leading-relaxed` (1.625) for body, `leading-snug` (1.375) for headings.
- **DON'T** use `text-base` for body text — it appears in only 18 files and breaks rhythm.
- **DON'T** center-align long text blocks — left-align for dashboards.
- **DON'T** use more than 2 font weights in a single component.

---

## Spacing System

### Base Unit: 4px

| Token | Tailwind | Value | Usage | Frequency |
|-------|----------|-------|-------|-----------|
| `space-1` | `p-1` / `gap-1` | `4px` | Tight icon padding | High |
| `space-2` | `p-2` / `gap-2` | `8px` | Inline spacing, small gaps | High |
| `space-3` | `p-3` / `gap-3` | `12px` | Component internal padding | Medium |
| **`space-4`** | **`p-4` / `gap-4`** | **`16px`** | **Card padding, section gaps, grid gaps** | **Dominant** |
| `space-5` | `p-5` / `gap-5` | `20px` | Form group spacing | Medium |
| `space-6` | `p-6` / `gap-6` | `24px` | Modal padding, page gutters | Medium |
| `space-8` | `p-8` / `gap-8` | `32px` | Major section separations | Low |

### Spacing Rules
- **DO** use `gap-4` (16px) as the default grid gap for card layouts.
- **DO** use `p-4` or `px-4 py-3` as the default card padding.
- **DON'T** use the same padding everywhere — vary by context.
- **DON'T** nest cards inside cards without increased indentation or visual separation.

---

## Component Primitives

### Cards (Canonical Pattern)
The statistically dominant card pattern across the codebase:

```
- Background: bg-white
- Border: 1px solid border-gray-200
- Border-radius: rounded-xl (12px)
- Shadow: shadow-card (0 4px 6px rgba(0,0,0,0.05))
- Hover shadow: shadow-md (0 8px 16px rgba(0,0,0,0.1))
- Hover transform: -translate-y-0.5
- Transition: 200ms cubic-bezier(.23, 1, .32, 1)
- Padding: p-4 or p-5
```

**Standard card class string**:
```
bg-white rounded-xl border border-gray-200 shadow-sm
```

**Hover-enabled card**:
```
bg-white rounded-xl border border-gray-200 shadow-sm
hover:-translate-y-0.5 hover:shadow-md transition-all duration-200
```

### Buttons
| Variant | Background | Text | Border | Radius | Hover |
|---------|-----------|------|--------|--------|-------|
| **Primary** | `bg-primary` | `text-white` | None | `rounded-lg` | `hover:bg-primary-dark` |
| **Secondary** | `bg-white` | `text-gray-700` | `border-gray-200` | `rounded-lg` | `hover:bg-gray-50` |
| **Ghost** | Transparent | `text-gray-600` | None | `rounded-lg` | `hover:bg-gray-100` |
| **Destructive** | `bg-red-500` | `text-white` | None | `rounded-lg` | `hover:bg-red-600` |
| **Emphasis** | `bg-primary` | `text-white` | None | `rounded-xl` | `hover:bg-primary-dark` |

- **Standard height**: `h-9` (36px) for inline buttons, `h-10` (40px) for form actions
- **Font-weight**: `font-medium` (500)
- **Padding**: `px-4 py-2` standard
- **Press feedback**: `active:scale-[0.98]`
- **Transition**: `transition-all duration-150`

**NOTE**: There is a competing secondary pattern (`bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200`) found in ~8 files. This is **deprecated** — migrate to the `bg-white border border-gray-200` secondary style above.

### Inputs / Form Fields
The canonical inline input pattern (used in 200+ files):

```
- Height: h-10 (40px)
- Border: border border-gray-200
- Border-radius: rounded-xl
- Focus ring: focus:border-primary focus:ring-2 focus:ring-primary/15
- Background: bg-white
- Placeholder: placeholder:text-gray-400
- Padding: py-2.5 px-4 (or pl-10 if icon present)
- Text: text-sm text-gray-900
- Hover: hover:border-gray-300
- Disabled: disabled:bg-gray-50 disabled:text-gray-500
```

**Standard input class string**:
```
w-full bg-white border border-gray-200 rounded-xl text-sm text-gray-900
placeholder:text-gray-400
focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15
hover:border-gray-300
transition-all duration-150
```

### Modals
The codebase uses **FormShell** (`@/components/modules/FormShell`) as the canonical modal wrapper — NOT the unused `Modal` primitive in `components/ui/`.

```
- Overlay: bg-black/40
- Content bg: bg-white
- Border-radius: rounded-2xl (16px)
- Max-width: max-w-2xl (default), max-w-3xl, max-w-4xl for larger forms
- Max-height: max-h-[90vh]
- Shadow: shadow-2xl
- Animation: animate-in fade-in zoom-in-95 duration-200
- Header: bg-primary text-white rounded-t-2xl
- Body: px-6 py-5 space-y-4 overflow-y-auto
- Footer: bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3
```

### Tables (DataTable canonical)
```
- Container: bg-white rounded-xl shadow-card overflow-hidden
- Header row: border-b border-gray-100
- Header text: text-xs font-semibold text-gray-500 uppercase tracking-wide
- Row border: border-b border-gray-50 last:border-b-0
- Row hover: hover:bg-gray-50
- Selected row: bg-primary/[0.03]
- Cell padding: px-4 py-3
- Cell text: text-sm text-gray-700
- Pagination: border-t border-gray-100 px-4 py-3
```

### Sidebar Navigation
```
- Background: bg-sidebar (#1F2937)
- Width: 56 (expanded), 72px (collapsed)
- Item height: h-11
- Active item: text-primary bg-white/10 rounded-xl
- Inactive item: text-gray-400 hover:text-white hover:bg-white/8 rounded-xl
- Active indicator: absolute left-0 w-1 h-7 bg-primary rounded-r-full
```

### Status Badges
```
- Shape: inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset
- Active: bg-emerald-50 text-emerald-700 ring-emerald-600/20
- Pending: bg-amber-50 text-amber-700 ring-amber-600/20
- Cancelled: bg-red-50 text-red-700 ring-red-600/20
- Completed: bg-blue-50 text-blue-700 ring-blue-600/20
- Inactive: bg-gray-50 text-gray-600 ring-gray-500/20
- Size: px-2 py-0.5 text-xs
```

---

## Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-md` | 6px | Small tags, pagination buttons |
| **`rounded-lg`** | **8px** | **Buttons, badges, small cards, tags** |
| **`rounded-xl`** | **12px** | **Cards, inputs, containers, sidebar items** |
| `rounded-2xl` | 16px | Modals (FormShell), large containers, login cards |
| `rounded-3xl` | 24px | Rare — reserved for special overlays |
| `rounded-full` | 9999px | Avatars, status dots, filter pills |

---

## Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle card elevation |
| **`shadow-card`** | **0 4px 6px rgba(0,0,0,0.05)** | **Standard card shadow** |
| `shadow-md` | 0 8px 16px rgba(0,0,0,0.1) | Card hover, dropdowns |
| `shadow-lg` | 0 10px 24px rgba(0,0,0,0.1) | Elevated panels |
| `shadow-2xl` | 0 25px 50px rgba(0,0,0,0.25) | Modals |

---

## Animation & Motion

### Timing Tokens
| Name | Value | Usage |
|------|-------|-------|
| `fast` | `100ms` | Button press, toggle |
| `normal` | `200ms` | Hover states, color changes, modal open |
| `slow` | `300ms` | Sidebar toggle, expand/collapse |
| `easing` | `cubic-bezier(.23, 1, .32, 1)` | Primary easing (ease-out-quart) |

### Patterns
- **Card hover**: `transform + box-shadow`, 200ms ease-out-quart
- **Modal enter**: `opacity 0→1` + `scale(0.95→1)`, 200ms
- **Button press**: `active:scale-[0.98]`, 100ms
- **Page transitions**: Fade only, no slide
- **Staggered lists**: 30ms delay between items

### Reduced Motion
Always respect `prefers-reduced-motion: reduce`.

---

## Layout Principles

### Grid System
- Dashboard content: implicit grid with `grid-cols-1 lg:grid-cols-*`
- Default gap: `gap-4` (16px)
- Page padding: `p-4 md:p-6`

### Sticky Toolbars And Search
- Sticky dashboard toolbars use the standard card surface: `bg-white rounded-xl border border-gray-200 shadow-sm`.
- Internal padding follows the compact card pattern: `px-4 py-3`.
- Controls inside the toolbar use `gap-3` on mobile and `lg:gap-4` on desktop.
- Labels should be `shrink-0` and content-sized; do not reserve fixed label columns such as `lg:w-52` unless the whole page uses aligned form columns.
- Inputs inside sticky toolbars keep the canonical `h-10`, `rounded-xl`, `border-gray-200`, and primary focus ring.
- Sticky toolbars should sit in normal document flow with `mb-4` by default, or `mb-6` when the sticky offset can otherwise cover adjacent dense panels during auto-scroll.

### Z-Index Scale
| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Content |
| Sticky | 10 | Sticky headers |
| Dropdown | 50 | Select menus, popovers |
| Modal | 50–70 | Modal overlays (FormShell uses z-50) |
| Toast | 200 | Notifications |

### Responsive Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column, full-width cards, sidebar hidden |
| Tablet | 640–1024px | 2-column grids, sidebar collapsible |
| Desktop | > 1024px | Full layout, sidebar expanded |

---

## Iconography

- **Library**: `lucide-react`
- **Size**: 16px (`w-4 h-4`) inline, 20px (`w-5 h-5`) buttons/nav, 24px (`w-6 h-6`) large actions
- **Stroke width**: 2px (default from lucide)
- **Color**: inherit from parent text color
- **Rules**:
  - **DO** use icons to reinforce meaning.
  - **DON'T** use different icon libraries mixed together.

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text.
- All interactive elements must have visible focus states (2px orange ring).
- Form inputs must have associated labels.
- Color is never the sole indicator of state — pair with icons or text.
- Respect `prefers-reduced-motion`.

---

## Anti-Patterns (Never Do)

1. **Gradient text** on headings or metrics.
2. **Dark mode with neon accents** — light-mode-first professional dashboard.
3. **Glassmorphism** — no blur effects, no frosted glass.
4. **Nested cards** without clear visual hierarchy flattening.
5. **Identical card grids** — same icon + heading + text repeated endlessly.
6. **Center-aligned dashboard text** — left-align everything except explicit centerpieces.
7. **Pure black/white** — always use the semantic tokens.
8. **Bounce or elastic easing** — feels unprofessional in a medical context.
9. **Mixed secondary button styles** — use `bg-white border border-gray-200`, never `bg-gray-100` for secondary actions.
10. **Overusing shadows** — cards get `shadow-card` or `shadow-sm`, not `shadow-xl` everywhere.
11. **Using `text-base` for body text** — `text-sm` is the canonical body size.
12. **Using `rounded-2xl` for standard cards** — `rounded-xl` is the canonical card radius.
13. **Using `border-gray-100` for card borders** — `border-gray-200` is the canonical border color.

---

## Known Drift (Normalization Targets)

These patterns exist in the codebase but deviate from the canonical system above. Normalize them when encountered:

| Drift | Location | Canonical Fix |
|-------|----------|---------------|
| `bg-gray-100 rounded-lg` secondary buttons | ServiceCatalog.tsx, etc. | `bg-white border border-gray-200 rounded-lg` |
| `rounded-2xl` on standard cards | Card.tsx, some pages | `rounded-xl` |
| `border-gray-100` on cards | Card.tsx | `border-gray-200` |
| `text-base` body text | ~18 files | `text-sm` |
| Unused `Modal` primitive in `components/ui/` | Modal.tsx | Deprecate in favor of FormShell |
| Unused `Button` primitive in `components/ui/` | Button.tsx | Update to match canonical or deprecate |
| Unused `Card` primitive in `components/ui/` | Card.tsx | Update to match canonical or deprecate |
| Unused `Input` primitive in `components/ui/` | Input.tsx | Update to match canonical or deprecate |

---

*Framework: React 18 + Vite + Tailwind CSS*
*Evidence method: grep frequency analysis across 600+ component files*
