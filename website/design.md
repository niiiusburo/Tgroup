# TGClinic Design System

> Visual reference for all styling decisions in the TGClinic dental practice management dashboard.
> Based on the existing codebase — this is the source of truth for colors, typography, spacing, motion, and component behavior.

---

## Design Context

**Product**: TGClinic — A dental practice management dashboard for appointment scheduling, patient records, employee management, payments, and reporting.

**Target Audience**: Dental clinic administrators, receptionists, and dentists who use this tool daily for 4–8 hours. They need efficiency, clarity, and low cognitive load.

**Use Cases**: Check-in patients, schedule appointments, manage services & pricing, track revenue, run reports, manage staff permissions.

**Brand Personality**: Clean, professional, trustworthy, warm. Medical precision without coldness. The orange accent conveys energy and care — not corporate sterility.

**Tone**: Confident but approachable. Interfaces should feel organized and predictable. No playful gimmicks.

---

## Color System

### Primary Palette
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#F97316` | CTAs, active nav, key actions, accent highlights |
| `primary-light` | `#FED7AA` | Hover states, subtle fills, badges |
| `primary-lighter` | `#FFF7ED` | Background tints, table row highlights |
| `primary-dark` | `#EA580C` | Pressed states, emphasis |

### Neutral Palette
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#FFFFFF` | Main canvas |
| `foreground` | `#111827` | Primary text |
| `muted` | `#F3F4F6` | Section backgrounds, secondary surfaces |
| `muted-foreground` | `#6B7280` | Secondary text, placeholders, icons |
| `border` | `#E5E7EB` | Dividers, input borders, card outlines |
| `sidebar` | `#1F2937` | Sidebar navigation background |

### Semantic / Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `dental-blue` | `#0EA5E9` | Info, water/treatment metaphors |
| `dental-green` | `#10B981` | Success, confirmed, paid |
| `dental-purple` | `#8B5CF6` | Special services, highlights |
| `dental-pink` | `#EC4899` | Marketing, patient-facing |
| `dental-yellow` | `#F59E0B` | Warnings, pending |
| `dental-teal` | `#14B8A6` | Health, hygiene themes |
| `destructive` | `#EF4444` | Errors, cancellations, deletes |

### Color Rules
- **DO** tint neutrals toward the warm orange hue — `hsl(24, 20%, 96%)` instead of pure gray for backgrounds.
- **DO** use `primary-lighter` (`#FFF7ED`) for table row hover and selected states.
- **DON'T** use pure black (`#000`) or pure white (`#fff`) — always use the semantic tokens.
- **DON'T** use gradient text for headings or metrics.
- **DON'T** default to dark mode with glowing accents.

---

## Typography

### Font Family
- **Primary**: `Inter` (weights 400, 500, 600, 700)
- **Fallback**: `system-ui, sans-serif`

### Type Scale
Use fluid sizing with `clamp()` where appropriate.

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | `clamp(1.75rem, 4vw, 2.5rem)` | 700 | Page titles (Overview, Calendar) |
| H1 | `1.5rem` (24px) | 600 | Section headers |
| H2 | `1.25rem` (20px) | 600 | Card titles, modal headers |
| H3 | `1rem` (16px) | 600 | Subsection labels |
| Body | `0.875rem` (14px) | 400 | Primary body text |
| Small | `0.75rem` (12px) | 500 | Labels, badges, timestamps |
| Caption | `0.6875rem` (11px) | 500 | Table headers, metadata |

### Typography Rules
- **DO** use weight contrast (400 vs 600) to create hierarchy, not just size.
- **DO** keep line-height at 1.5 for body, 1.25 for headings.
- **DON'T** center-align long text blocks — left-align for dashboards.
- **DON'T** use more than 2 font weights in a single component.

---

## Spacing System

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | `4px` | Tight gaps, icon padding |
| `space-2` | `8px` | Inline spacing, small gaps |
| `space-3` | `12px` | Component internal padding |
| `space-4` | `16px` | Card padding, section gaps |
| `space-5` | `20px` | Form group spacing |
| `space-6` | `24px` | Modal padding, page gutters |
| `space-8` | `32px` | Section separations |
| `space-10` | `40px` | Major section breaks |
| `space-12` | `48px` | Page-level padding |

### Spacing Rules
- **DO** create visual rhythm — tight groupings inside cards, generous gaps between sections.
- **DO** use `gap-4` (16px) as the default grid gap for card layouts.
- **DON'T** use the same padding everywhere — vary by context.
- **DON'T** nest cards inside cards without increased indentation or visual separation.

---

## Component Primitives

### Cards
```
- Background: white
- Border: 1px solid #E5E7EB (or shadow-only)
- Border-radius: 16px (rounded-2xl)
- Shadow: 0 4px 6px rgba(0,0,0,0.05)
- Hover shadow: 0 8px 16px rgba(0,0,0,0.1)
- Hover transform: translateY(-3px)
- Transition: 200ms cubic-bezier(.23, 1, .32, 1)
- Padding: 16px–24px
```

### Buttons
| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `#F97316` | White | None | `#EA580C` |
| Secondary | White | `#374151` | `#E5E7EB` | `#F9FAFB` |
| Ghost | Transparent | `#6B7280` | None | `#F3F4F6` |
| Destructive | `#EF4444` | White | None | `#DC2626` |

- Border-radius: `0.625rem` (10px) or fully rounded for icon buttons
- Height: 36px (standard), 40px (emphasis)
- Font-weight: 500
- Press feedback: `transform: scale(0.97)` on active

### Inputs / Form Fields
```
- Height: 40px
- Border: 1px solid #E5E7EB
- Border-radius: 10px
- Focus ring: 2px #F97316 with 2px offset
- Background: white
- Placeholder: #9CA3AF
- Padding: 10px 14px
```

### Modals
```
- Overlay: rgba(0,0,0,0.5)
- Content bg: white
- Border-radius: 24px (rounded-3xl)
- Max-width: varies by content (sm: 400px, md: 560px, lg: 720px)
- Max-height: min(800px, 90vh) on desktop
- Margin: 16px on mobile
- Shadow: 0 25px 50px -12px rgba(0,0,0,0.25)
```

### Sidebar Navigation
```
- Background: #1F2937
- Width: 240px (expanded), 64px (collapsed)
- Item height: 40px
- Active item: #F97316 bg with white text
- Inactive item: #9CA3AF text, transparent bg
- Hover: #374151 bg
- Border-radius per item: 8px
- Icon + label gap: 12px
```

### Tables
```
- Header: #F9FAFB background, 11px uppercase captions, #6B7280
- Row hover: #FFF7ED
- Selected row: #FED7AA with 1px #F97316 left border
- Cell padding: 12px 16px
- Border: horizontal only, #E5E7EB
```

---

## Animation & Motion

### Philosophy
Motion is functional, not decorative. Use it to convey state changes, not to entertain.

### Timing Tokens
| Name | Value | Usage |
|------|-------|-------|
| `fast` | `100ms` | Button press, toggle |
| `normal` | `200ms` | Hover states, color changes |
| `slow` | `300ms` | Expand/collapse, modal open |
| `easing` | `cubic-bezier(.23, 1, .32, 1)` | Primary easing (ease-out-quart) |

### Patterns
- **Card hover**: `transform + box-shadow`, 200ms ease-out-quart
- **Modal enter**: `opacity 0→1` + `translateY(10px→0)`, 250ms
- **Sidebar toggle**: `width` transition 300ms ease
- **Page transitions**: Fade only, no slide (dashboards should feel stable)
- **Staggered lists**: 30ms delay between items, max 300ms total
- **Skeleton loaders**: Pulse animation, 1.5s ease-in-out infinite

### Reduced Motion
Always respect `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Layout Principles

### Grid System
- Dashboard content: 12-column implicit grid
- Default gap: 16px
- Page padding: 24px (desktop), 16px (tablet), 12px (mobile)
- Max content width: none (dashboards fill viewport)

### Z-Index Scale
| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Content |
| Sticky | 10 | Sticky headers |
| Dropdown | 50 | Select menus, popovers |
| Modal | 100 | Modal overlay |
| Toast | 200 | Notifications |
| Tooltip | 300 | Tooltips |

### Responsive Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column, full-width cards, sidebar hidden |
| Tablet | 640–1024px | 2-column grids, sidebar collapsible |
| Desktop | > 1024px | Full layout, sidebar expanded |

---

## Iconography

- **Library**: `lucide-react`
- **Size**: 16px (inline), 20px (buttons), 24px (nav)
- **Stroke width**: 2px
- **Color**: inherit from parent text color
- **Rules**:
  - **DO** use icons to reinforce meaning, not replace labels in navigation.
  - **DON'T** put large icons with rounded corners above every heading.
  - **DON'T** use different icon libraries mixed together.

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text.
- All interactive elements must have visible focus states (2px orange ring).
- Form inputs must have associated labels.
- Color is never the sole indicator of state — pair with icons or text.
- Support keyboard navigation for all interactive elements.
- Respect `prefers-reduced-motion`.

---

## Anti-Patterns (Never Do)

1. **Gradient text** on headings or metrics.
2. **Dark mode with neon accents** — this is a light-mode-first professional dashboard.
3. **Glassmorphism** — no blur effects, no frosted glass.
4. **Nested cards** without clear visual hierarchy flattening.
5. **Identical card grids** — same icon + heading + text repeated endlessly.
6. **Center-aligned dashboard text** — left-align everything except explicit centerpieces.
7. **Pure black/white** — always use the semantic tokens.
8. **Modals for simple confirmations** — use inline or bottom-sheet on mobile where possible.
9. **Bounce or elastic easing** — feels unprofessional in a medical context.
10. **Overusing shadows** — cards get `shadow-card`, not `shadow-xl` everywhere.

---

*Last updated: 2026-04-19*
*Framework: React 18 + Vite + Tailwind CSS*
