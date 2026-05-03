# DESIGN.md

> Root visual-design authority for TGClinic. Detailed tokens and component
> evidence live in `website/design.md`; this file defines when and how to use it.

## 1. Source Of Truth

- Root design routing and visual product principles: `DESIGN.md`.
- Detailed frontend token evidence: `website/design.md`.
- Interaction behavior: `BEHAVIOR.md`.
- Build/component architecture: `website/agents.md` and `ARCHITECTURE.md`.

If a UI change conflicts with `website/design.md`, update the detailed token file and record the reason in `DECISIONS.md`.

## 2. Product Context

TGClinic is an operational dashboard for clinic admins, receptionists, dentists, and managers. The interface is used repeatedly throughout the workday, so it should be clear, dense, calm, and quick to scan.

The design direction is:

- Professional clinic operations, not marketing.
- Warm but restrained orange accent system.
- Dense information with visible hierarchy.
- Predictable controls over decorative novelty.
- Fast repeated workflows over first-time explanation.

## 3. Non-Negotiable UI Rules

- Use `website/design.md` for color, type, spacing, cards, buttons, inputs, table, modal, and motion rules.
- Keep dashboard/list panels bounded. Long rows belong in internal scroll regions, not unbounded page growth.
- Do not place cards inside cards unless the inner surface is a real repeated item or modal/tool surface.
- Use left-aligned dashboard content by default.
- Use icons from `lucide-react` when a familiar icon exists.
- Use `text-sm` as the primary operational body size unless the detailed design file says otherwise.
- Preserve readable Vietnamese labels and avoid text clipping on mobile and desktop.
- Add or update both English and Vietnamese i18n keys when user-visible text changes.

## 4. Design Change Workflow

Before changing visual design:

1. Read `website/design.md`.
2. Read the affected component/page.
3. Check whether the change is visual-only, behavior-affecting, or data-affecting.
4. If behavior changes, update `BEHAVIOR.md`.
5. If component/build conventions change, update `website/agents.md` or `ARCHITECTURE.md`.
6. If the design system changes, update `website/design.md` and record the decision.

## 5. Verification

Visual work is not complete until it has been checked in the browser or with a screenshot-driven test when practical. For dense lists, verify with oversized data so headers and actions stay reachable.
