# CTV Portal: Overview vs Theo dõi — Corrected Workflow (2026-06-15)

**Status:** Chart + **implemented in v0.37.15–0.37.16** (`ctvCardTrackingReferrals.js`, `GET /referrals`)  
**Stakeholder correction (2026-06-15):** Split commission vs Theo dõi vs 6-month timer:  
- **Service card** `saleorders.ctv_id` = CTV → **commission** (final truth for earnings) + Theo dõi + resets 6-month window  
- **Appointment card** `appointments.ctv_id` = CTV → **Theo dõi** + resets 6-month window; **no commission**  
- **Customer profile** `partners.referred_by_ctv_id` → bookkeeping only; **no commission, no Theo dõi**

Commission money is a **separate** ledger (`earnings`). Another CTV can reclaim a client after the 6‑month window; that client then appears under **their** Theo dõi, not yours.

**Per LOB:** Dental claim lock and cosmetic claim lock are **independent**. A client locked on dental is still **free** on aesthetic/cosmetic until a card exists there (and vice versa). API returns `lob_links.dental` / `lob_links.cosmetic` separately.

**Viewer isolation:** Each CTV sees **only their own** history for a client — their earnings rows and their operational cards (`appointments.ctv_id` / `saleorders.ctv_id` = viewer). Flip-card service lines come from `earnings WHERE recipient_partner_id = viewer`. Another CTV's appointment/service cards never appear. If the client is no longer on the viewer's cards, Home/Commission tap shows commission-history-only (no fake tracking card).

**Supersedes (for product intent):** the “Nhánh A = referred_by_ctv_id” explanation in agent session 2026-06-14/15.  
**Aligns with:** `docs/business-logic/ctv-referral-commission.md`, `docs/superpowers/specs/2026-06-02-ctv-eligibility-bar-breadcrumb-design.md`, `api/src/services/referralClaim.js` (`computeCtvLink`).

**Archived wrong diagram:** user screenshot saved at  
`docs/live-artifacts/ctv-workflow-archived/2026-06-15-stale-referred-by-diagram.png` (copy of session image #1).

---

## 1. Two tabs, two questions (corrected)

```mermaid
flowchart TB
  subgraph HOME["Trang chủ / Hoa hồng — OVERVIEW ✅ (đúng)"]
    Q1["Câu hỏi: Tôi đã / đang kiếm hoa hồng từ đâu?"]
    E["Nguồn: dbo.earnings<br/>WHERE recipient_partner_id = TÔI"]
    Q1 --> E
    E --> ROWS["Mọi dòng hoa hồng<br/>(direct L0, override L1+, reversals)"]
  end

  subgraph TRACK["Theo dõi — thẻ vận hành ✅ v0.37.17"]
    Q2["Câu hỏi: Khách nào gắn CTV của TÔI trên thẻ?"]
    APPT["appointments.ctv_id = TÔI"]
    SVC["saleorders.ctv_id = TÔI"]
    Q2 --> APPT
    Q2 --> SVC
  end

  subgraph COMM["Hoa hồng — chỉ thẻ DV"]
    SVC2["saleorders.ctv_id = TÔI"]
  end

  subgraph NOT["❌ KHÔNG đủ"]
    REF["partners.referred_by_ctv_id"]
  end

  REF -.->|profile only| NOT
```

| Tab | Question | Authority data |
|-----|----------|----------------|
| **Trang chủ / Hoa hồng** | Where did I earn? | `earnings` (append-only ledger) |
| **Theo dõi (target)** | Which clients have my CTV on an operational card? | `appointments.ctv_id` ∪ `saleorders.ctv_id` |
| **Commission (earnings)** | When do I get paid? | `saleorders.ctv_id` only |
| **Not for commission / Theo dõi** | — | `partners.referred_by_ctv_id` |

---

## 2. How a customer gets linked to a CTV (card-only)

```mermaid
flowchart LR
  subgraph Staff["Phòng khám / CTV booking"]
    B1["CTV đặt lịch"]
    B2["Staff tạo / sửa thẻ DV"]
    B3["Staff tạo / sửa appointment"]
  end

  subgraph DB["Postgres (per LOB)"]
    A["appointments<br/>ctv_id → partners.id"]
    S["saleorders<br/>ctv_id → partners.id"]
    P["partners<br/>(tên, phone — không phải nguồn sở hữu)"]
  end

  B1 --> A
  B3 --> A
  B2 --> S
  A --> P
  S --> P
```

**Không có** mũi tên “sở hữu” từ `partners.referred_by_ctv_id` trong sơ đồ target.

---

## 3. Six-month claim window (why another CTV can “take” the client later)

Rule from `computeCtvLink` / eligibility spec:

```mermaid
sequenceDiagram
  participant C as Khách
  participant A as CTV-A
  participant PK as Phòng khám
  participant B as CTV-B

  Note over C,B: Tháng 1 — CTV-A gắn thẻ
  A->>PK: Booking / service card ctv_id=A
  PK->>C: appointments.ctv_id=A hoặc saleorders.ctv_id=A
  Note over A: Theo dõi của A: thấy khách C<br/>Cửa sổ 6 tháng bắt đầu

  Note over C,B: Tháng 4 — Khách đến khám, không gắn CTV
  PK->>C: Visit không có ctv_id
  Note over A: Đồng hồ KHÔNG reset — vẫn hết hạn theo lần gắn A gần nhất

  Note over C,B: Tháng 7 — Hết hạn liên kết A
  Note over C: eligible — CTV khác có thể claim

  B->>PK: Service / appointment ctv_id=B
  Note over B: Theo dõi của B: thấy khách C
  Note over A: Theo dõi của A: không còn là owner trên thẻ mới nhất<br/>(lịch sử earnings cũ vẫn trên Home của A)
```

| Thời điểm | CTV-A Theo dõi | CTV-B Theo dõi | CTV-A Home (earnings) |
|-----------|----------------|----------------|------------------------|
| A gắn thẻ | ✅ Khách C | — | ✅ Nếu có commission |
| Hết 6 tháng | ❌ (eligible) | — | ✅ Lịch sử giữ nguyên |
| B gắn thẻ mới | ❌ | ✅ Khách C | ✅ Lịch sử A vẫn có |

---

## 4. Who appears on Theo dõi? (target decision tree)

```mermaid
flowchart TD
  START["Mở Theo dõi"] --> UNION["partnerid DISTINCT<br/>từ thẻ vận hành"]

  UNION --> APPT["appointments<br/>ctv_id = TÔI"]
  UNION --> SVC["saleorders<br/>ctv_id = TÔI"]

  APPT --> MERGE["Gộp client + LOB"]
  SVC --> MERGE

  MERGE --> LINK["computeCtvLink:<br/>latest appointment vs service<br/>→ linked CTV, 6 tháng"]

  LINK --> SHOW{"linked CTV = TÔI?"}
  SHOW -->|Có| CARD["✅ Theo dõi + CtvLinkBar"]
  SHOW -->|Không| HIDE["❌ CTV khác thắng thẻ mới nhất"]

  EARN["earnings"] -.->|chỉ saleorders.ctv_id| COMM["Hoa hồng"]
  PROFILE["referred_by_ctv_id"] -.->|KHÔNG| DENY["Không đủ"]
```

**Tóm tắt:**

- **Có trên Theo dõi** ⇔ bạn thắng **thẻ appointment hoặc service mới nhất** (`computeCtvLink`, 6 tháng).
- **Appointment có CTV** → Theo dõi ✅, reset 6 tháng ✅, hoa hồng ❌ (chưa có thẻ DV).
- **Có trên Home** ⇔ bạn có **dòng earnings** (kể cả khách đã bị CTV khác reclaim).
- **`ZZ_CTVCHECK_*` trên Home** = có `earnings`, có thể **không** có thẻ `ctv_id` hợp lệ cho bạn → có thể **không** thuộc Theo dõi target (đúng với QA test data).

---

## 5. Tap row on Home → where to go (breadcrumb target)

```mermaid
flowchart TD
  TAP["Chạm dòng Hoạt động / Hoa hồng"] --> KIND{"Loại earnings?"}

  KIND -->|level = 0<br/>Bạn là CTV trên thẻ DV| TRACK["→ Theo dõi<br/>tìm khách theo client_id<br/>lật thẻ service"]
  KIND -->|level ≥ 1<br/>Override tuyến dưới| NET["→ Giới thiệu/QR<br/>highlight CTV level-0<br/>trên cùng service_line"]
  KIND -->|Có earnings nhưng<br/>không còn trên thẻ của bạn| TRACK2["→ Theo dõi nếu còn link<br/>hoặc banner Lịch sử hoa hồng only"]
```

---

## 6. Current code vs target (gap — fix one at a time)

| Piece | Today (code) | Target (this chart) |
|-------|----------------|---------------------|
| `GET /commission-summary` | `earnings` ✅ | Keep |
| `GET /referrals` (Theo dõi) | ✅ `appointments.ctv_id` ∪ `saleorders.ctv_id` + per-LOB `lob_links` + `computeCtvLink` (v0.37.15–0.37.18) | Keep |
| `referralClaim.getCtvLinkStatus` | ✅ Uses `appointments.ctv_id` + `saleorders.ctv_id` (fallback `referred_by` in code) | Remove fallback for **portal list**; cards only |
| UI copy “khách giới thiệu” | Implies referred_by | “Khách gắn CTV trên thẻ” |

**Fix order (agreed: chart first, then code one step at a time):**

1. ✅ This document + diagrams  
2. ✅ Rewrite `GET /referrals` query to card-based client set (v0.37.15)  
3. ✅ Drop `referred_by_ctv_id` filter from Theo dõi `/referrals`  
4. ✅ Align i18n with card / earnings split  
5. ✅ Service-card-only for commission + L0 attribution (v0.37.16)  
6. ✅ Appointment ctv_id back on Theo dõi + 6-month reset via computeCtvLink (v0.37.17)  
7. ✅ Unit test reclaim scenario (spec §6.7 in `ctvCardTrackingReferrals.test.js`); ⏳ live verify A → expire → B on Theo dõi

---

## 7. ASCII quick reference (mobile-friendly)

```
OVERVIEW (Home/Hoa hồng)          THEO DÕI (target)
─────────────────────────          ─────────────────────────
earnings ← saleorders.ctv_id       appointments.ctv_id = ME
        │                          saleorders.ctv_id = ME
        │                          (Theo dõi + 6mo timer)
        │                                    │
        ▼                                    ▼
"Mọi dòng hoa hồng"                "Khách trên thẻ của tôi"
(past + present)                    (latest card wins, 6mo bar)

        │                                    │
        └──────── same client ───────────────┘
              may differ after reclaim
```

---

## 8. References

- Stale agent diagram (user image #1): `docs/live-artifacts/ctv-workflow-archived/2026-06-15-stale-referred-by-diagram.png`
- Eligibility bar spec: `docs/superpowers/specs/2026-06-02-ctv-eligibility-bar-breadcrumb-design.md`
- Business rules: `docs/business-logic/ctv-referral-commission.md`
- Implementation (Theo dõi, correct since v0.37.15): `api/src/services/ctvCardTrackingReferrals.js` via `api/src/routes/ctv.js` `GET /referrals` (no `referred_by_ctv_id` discovery)
- Staff read APIs (`GET /api/SaleOrders`, `GET /api/Appointments`, cosmetic mirrors) return `ctv_id` from the operational card column (`saleorders.ctv_id` / `appointments.ctv_id`), not inferred from profile `referred_by_ctv_id` alone — align write paths when agent fixes drift