# Visual Companion: Cosmetic Line of Business (v2)

> Companion to `2026-05-18-cosmetic-line-of-business-design-v2.md`.
> ASCII mockups for every surface the implementation team will build.

## Executive Summary

Two physical Postgres databases (`tdental_demo`, `tcosmetic_demo`). One login.
Existing dental UI is reused 1:1 for the cosmetic admin experience (the LOB
toggle swaps which DB the API queries). The **only** new visual surface is the
mobile-first CTV dashboard. Dental DB is touched additively only.

---

## Surface 1: Header LOB Toggle (admin only)

### Current header (today, dental-only)

```
+----------------------------------------------------------------------------+
|  [TG]   [All Locations ▾]                  [Face][Feedback][EN/VI][A]  |
+----------------------------------------------------------------------------+
```

### New header for admin with both LOB scopes

```
+----------------------------------------------------------------------------+
|  [TG]   [Dental ▾]   [All Locations ▾]      [Face][Feedback][EN/VI][A]  |
+----------------------------------------------------------------------------+
            │
            └── click expands ──>  +-------------------+
                                   |  ● Dental         |
                                   |    Cosmetic       |
                                   +-------------------+
```

### Header for DentalStaff (no toggle — only one scope)

```
+----------------------------------------------------------------------------+
|  [TG]   [All Locations ▾]                   [Face][Feedback][EN/VI][A]  |
+----------------------------------------------------------------------------+
```

### Header for CTV (toggle hidden — they never enter admin UI)

```
+----------------------------------------------------------------------------+
|  N/A — CTV users land at /ctv and cannot navigate to admin routes         |
+----------------------------------------------------------------------------+
```

### Rules

- Visible only when `useAuth().user.lob_scope.length >= 2`
- Default LOB = first item in `lob_scope` (typically `dental` for existing accounts)
- Last selection persisted in `localStorage`
- Switching unmounts the entire app subtree (keyed remount) — no stale render

---

## Surface 2: Admin views (UNCHANGED from dental — visual confirmation only)

When LOB = Dental, admin sees what they see today. When LOB = Cosmetic, the
admin sees the **same screens** populated with cosmetic data.

### /overview (admin, LOB = Cosmetic, day 1 — empty schema)

```
+----------------------------------------------------------------------------+
| Overview                                                  [today · 18 May] |
+----------------------------------------------------------------------------+
|                                                                            |
|   [Today's Revenue]  [Open Appointments] [Pending Payments] [Active Pat]   |
|        0 ₫                    0                  0 ₫              0        |
|                                                                            |
|   Recent activity:                                                         |
|        (no data — cosmetic line just provisioned)                          |
|                                                                            |
+----------------------------------------------------------------------------+
```

No special "welcome / setup wizard" surface in v1 — admin uses the existing
Employees screen (under Cosmetic LOB) to add staff and the existing Services
screen to set up the catalog.

### /customers (admin, LOB = Cosmetic, day 1)

```
+----------------------------------------------------------------------------+
| Customers                                                  [+ Add Customer]|
+----------------------------------------------------------------------------+
| [Search...]  [Active ▾]  [All Locations ▾]                                |
+----------------------------------------------------------------------------+
|                                                                            |
|   No customers yet. Add one to start tracking cosmetic clients.            |
|                                                                            |
+----------------------------------------------------------------------------+
```

### /customers/:id (admin viewing a cosmetic customer who is ALSO a dental client)

```
+----------------------------------------------------------------------------+
|  ← Customers                                                               |
|                                                                            |
|  Mai Anh Nguyễn                                       [Edit]               |
|  ┌────────────────────────────────────────────────────────────────────┐    |
|  │ Phone: 0908•••345  •  ID: 0791234•••  •  DOB: 1992-03-12          │    |
|  │                                                                    │    |
|  │  [also a dental client →]  ← only visible to lob.crossview users   │    |
|  └────────────────────────────────────────────────────────────────────┘    |
|                                                                            |
|  [Appointments] [Services] [Payments] [Notes]   (existing tabs)           |
+----------------------------------------------------------------------------+
```

The "also a dental client →" badge:
- Only renders for users with permission `lob.crossview` (admin)
- Driven by a server-side phone-match probe against the other DB
- Clicking opens the matching dental customer in a new tab (cross-LOB navigation)
- Hidden entirely from DentalStaff and CosmeticStaff (privacy)

---

## Surface 3: CTV Dashboard (the only NEW visual surface)

### Home tab (mobile, default landing for CTV users)

```
+----------------------+
|   Hi, Linh 👋       |
|                      |
| ┌──────────────────┐ |
| │ PENDING COMMISSION│ |
| │                   │ |
| │     12.4M ₫      │ |
| │ ▓▓▓▓▓▓▓▓░░░░░░░  │ |  ← blue 62% (dental) + pink 38% (cosmetic)
| │ ● Dental  7.7M    │ |
| │ ● Cosmetic 4.7M   │ |
| └──────────────────┘ |
|                      |
| ┌──────────────────┐ |
| │ THIS MONTH       │ |
| │ Referrals      8 │ |
| │ Services      14 │ |
| │ Paid out  38.6M  │ |
| └──────────────────┘ |
|                      |
| ┌──────────────────┐ |
| │ RECENT ACTIVITY  │ |
| │ [cos] Mai · Fil  │ |
| │             +1.2M│ |
| │ [den] Hà  · Cr   │ |
| │             +800k│ |
| │ [cos] Quỳnh · Bx │ |
| │             +3.4M│ |
| └──────────────────┘ |
|                      |
+----------------------+
| [⌂ Home][💰][👥][👤]|  ← bottom nav, Home active
+----------------------+
```

### Commission tab — Pending sub-view

```
+----------------------+
|   My Commission      |
|                      |
| [ Pending ][ Paid ]  |  ← segmented control
|                      |
| ┌──────────────────┐ |
| │ TOTAL PENDING    │ |
| │     12.4M ₫     │ |
| │ 17 services      │ |
| │ 8 clients        │ |
| └──────────────────┘ |
|                      |
| BY SERVICE           |
| ┌──────────────────┐ |
| │ [cos] Mai Filler │ |
| │       6.4M  +1.2M│ |
| │ [den] Hà  Crown  │ |
| │       12M   +800k│ |
| │ [cos] Quỳnh Las  │ |
| │       pkg   +3.4M│ |
| │ [den] An Implant │ |
| │             +2.1M│ |
| │ [cos] Hoa Botox  │ |
| │             +900k│ |
| │ [den] Bích Vnr   │ |
| │             +4.0M│ |
| └──────────────────┘ |
|                      |
+----------------------+
| [⌂][💰 Comm][👥][👤]|
+----------------------+
```

### Commission tab — Paid sub-view

```
+----------------------+
|   My Commission      |
|                      |
| [ Pending ][ Paid ●] |  ← Paid active
|                      |
| ┌──────────────────┐ |
| │ TOTAL PAID OUT   │ |
| │     38.6M ₫     │ |
| │ 3 payout cycles  │ |
| └──────────────────┘ |
|                      |
| PAYOUT CYCLES        |
| ┌──────────────────┐ |
| │ 2026-04 · 28 Apr │ |
| │           18.2M ₫│ |
| │ 2026-03 · 31 Mar │ |
| │           12.1M ₫│ |
| │ 2026-02 · 28 Feb │ |
| │            8.3M ₫│ |
| └──────────────────┘ |
|                      |
| Tap a cycle → see    |
| the underlying       |
| service rows         |
+----------------------+
| [⌂][💰 Comm][👥][👤]|
+----------------------+
```

### Referrals tab — "my clients"

```
+----------------------+
|   My Referrals       |
|                      |
| ┌──────────────────┐ |
| │ [cos] Mai Anh    │ |
| │         [earning]│ |
| │ 3 svc · 9.6M     │ |
| │ last 14 May      │ |
| └──────────────────┘ |
| ┌──────────────────┐ |
| │ [den] Hà T.      │ |
| │         [earning]│ |
| │ 2 svc · 4.8M     │ |
| │ last 9 May       │ |
| └──────────────────┘ |
| ┌──────────────────┐ |
| │ [den][cos] Quỳnh │ |  ← active in BOTH LOBs
| │ 5 svc · 12.4M    │ |
| └──────────────────┘ |
| ┌──────────────────┐ |
| │ [den] Linh N.    │ |
| │   [no visit yet] │ |
| │ Referred 17 May  │ |
| └──────────────────┘ |
|                      |
+----------------------+
| [⌂][💰][👥 Refs][👤]|
+----------------------+
```

### Me tab

```
+----------------------+
|       Linh K.        |
|       (CTV)          |
|                      |
| 0903 555 0123        |
| linh.k@tgclinic.vn   |
|                      |
| ──────────────────── |
| Language    [VI ▾]   |
| Notifications [On]   |
| ──────────────────── |
|                      |
|        [Log out]     |
+----------------------+
| [⌂][💰][👥][👤 Me]  |
+----------------------+
```

---

## Surface 4: Login redirect logic

```
POST /api/auth/login
         │
         ▼
   Returns user object
         │
         ├── user.is_ctv === true        ──► hard redirect to /ctv
         │
         ├── user.lob_scope.length >= 1
         │   AND !is_ctv                  ──► /overview (existing dental dashboard)
         │                                     LOB toggle visible iff scope.length >= 2
         │
         └── No scope, no CTV flag       ──► 403 "Account not yet provisioned"
```

---

## Surface 5: Existing screens that change ZERO visually

For completeness, the following screens are visually unchanged. They get one
behavioral change: when LOB = Cosmetic they query `tcosmetic_demo`. When
LOB = Dental they query `tdental_demo`.

- /overview
- /customers (list)
- /customers/:id (except for the optional cross-LOB badge above)
- /calendar
- /appointments
- /employees
- /services
- /payment
- /reports
- /settings

The cosmetic admin's daily life looks identical to the dental admin's. Only
the data and the header toggle differ.

---

## Surface 6: Migration progress UI (admin notice)

When `COSMETIC_LOB_ENABLED=false` (pre-flip), an admin trying to switch the
LOB sees nothing — the toggle isn't rendered.

When the flag flips on but the admin hasn't been granted `cosmetic` scope:

```
+----------------------------------------------------------------------------+
|  Header: still shows just dental (toggle hidden because scope.length == 1) |
+----------------------------------------------------------------------------+
```

When the admin is granted cosmetic scope post-flip:

```
+----------------------------------------------------------------------------+
|  Header now shows [Dental ▾][All Locations ▾] — toggle appears             |
+----------------------------------------------------------------------------+
```

No banner, no modal, no "welcome to cosmetic" tour. The admin discovers the
toggle naturally on their next page load. The empty cosmetic /overview is
self-explanatory.

---

## What we explicitly chose NOT to build (and why)

| Removed surface | Why |
|-----------------|-----|
| /consultations admin page | Consultation cards are backend attribution plumbing. Admins don't manage them. Auto-created when a cosmetic appointment is booked. |
| Person-merge admin tool | No shared identity table = nothing to merge. Each LOB's clients table is independent. |
| Cosmetic-specific dashboard layout | Admin reuses dental layout. Avoids design-system fork. |
| Cosmetic-specific sidebar order | Same as above. Reorder if friction emerges in v2. |
| Multi-theme color shift on toggle | Was considered for safety. With physically separate DBs, the "wrong-record" risk drops sharply; LOB pill in header is enough. |
| Consultation-card lifecycle visualization | No card UI surface in v1. Engine runs invisibly. |
| Person-dedup tooling | Dropped with shared persons table. |
| Cosmetic role-flag rename | Mirror dental flags for v1; cosmetic-specific names deferred to v1.1. |

---

## Test coverage this companion implies

Each ASCII mockup above maps to at least one Playwright assertion:

- Header toggle visibility per role
- Day-1 empty-state rendering (cosmetic /overview, /customers, etc.)
- Cross-LOB badge rendering (with and without `lob.crossview` permission)
- CTV `/ctv` redirect on login
- CTV dashboard rendering with seeded cross-DB commissions
- LOB toggle unmount-remount preventing data flash

Full test list in the parent spec under "Testing Strategy".
