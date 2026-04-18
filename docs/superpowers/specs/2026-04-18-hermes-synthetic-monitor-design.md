# Hermes — Synthetic Website Monitor Agent

> **Status:** Design approved — awaiting implementation plan
> **Date:** 2026-04-18
> **Scope:** TGroup TDental Dashboard (nk.2checkin.com, VPS 76.13.16.68)

---

## Problem

After every deploy, bugs silently reach production — timezone date shifts, i18n regressions, form data loss, edit-not-persisting. Manual verification is inconsistent. There is no automated "does the app actually work end-to-end" check.

## Solution

Hermes is a standalone Python service on the VPS that uses `browser-use` (88k stars, Playwright-backed) to simulate real users on nk.2checkin.com every 30 minutes. It creates, verifies, edits, and deletes test data — exercising every business flow like a real clinic employee.

---

## Architecture

```
VPS (76.13.16.68)
├── /opt/hermes/
│   ├── hermes.py              # Entry point: reads map, spawns flows, reports
│   ├── hermes-map.yaml        # Website map: modules, flows, expectations
│   ├── hermes-ignore.yaml     # Dismissed novel findings
│   ├── flows/
│   │   ├── login.py           # Auth flow + JWT refresh + version check
│   │   ├── customer.py        # Create → verify all fields → edit → verify → cleanup
│   │   ├── service.py         # Create → verify → edit → verify → cleanup (2 pages)
│   │   ├── appointment.py     # Create → verify date/time → edit → verify → cleanup (3 pages)
│   │   ├── payment.py         # Create → verify amount → cleanup
│   │   └── calendar.py        # Day/week/month views render, no crash
│   ├── lib/
│   │   ├── browser.py         # browser-use config, Chromium path, screenshot capture
│   │   ├── telegram.py        # Reuse existing bot token/chat_id
│   │   ├── logger.py          # Rotated file logging + structured JSON lines
│   │   ├── cleanup.py         # API DELETE for test records
│   │   └── models.py          # Multi-model testing + selection
│   ├── screenshots/           # Timestamped screenshots per flow (auto-cleaned 7 days)
│   ├── hermes.log             # Observability log (rotated daily)
│   ├── requirements.txt       # browser-use, playwright, pyyaml, python-telegram-bot
│   └── install.sh             # Systemd timer + Chromium + venv + account setup
└── /etc/systemd/system/
    ├── hermes.service
    └── hermes.timer            # Every 30 minutes
```

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Browser automation | `browser-use` (Python) | 88k stars, LLM-driven, handles UI changes |
| Browser engine | Playwright Chromium (bundled) | Installed via `playwright install chromium` |
| LLM | Tested: GPT-4o-mini, Claude Haiku, GPT-4o — pick cheapest that passes all checks | |
| Schedule | systemd timer | No Docker overhead, native to VPS |
| Alerts | Telegram (reuse existing bot token) | Already in Claude Factory `.env` |
| Config | YAML | Human-readable, easy to edit by hand |
| Language | Python 3.10+ | browser-use is Python-native |

## Test Account

Dedicated `hermes@clinic.vn` account with Admin permissions, created via SQL + API during install.

```sql
INSERT INTO dbo.partners (id, name, email, password_hash, employee, active, datecreated)
VALUES (
  gen_random_uuid(),
  'Hermes Monitor',
  'hermes@clinic.vn',
  '<bcrypt_hash>',
  true, true, now()
);
-- Assign Admin permission group via employee_permissions
```

All test data uses:
- Name prefix: `HERMES_TEST_<timestamp>`
- Dates: `1900-01-01` (invisible in normal date-range views)
- Phone: `0000000000`
- Records are deleted via API after each flow

## Flow Lifecycle

```
Every 30 min:
  1. hermes.py wakes up (systemd timer)
  2. Reads hermes-map.yaml → gets ordered list of flows
  3. For each flow:
     a. browser-use spawns with configured LLM
     b. Screenshot BEFORE (page loaded, form visible)
     c. Execute create action (test data with 1900-01-01 date)
     d. Screenshot MIDDLE (form filled or just after submit)
     e. Verify all fields persisted (re-open record, check every field)
     f. Edit one field, save
     g. Screenshot AFTER (edit confirmed)
     h. Verify edit stuck (reload page, check field)
     i. Observer: report anything odd → tag as NOVEL
     j. Cleanup: delete test record via API
  4. Aggregate results → write structured JSON line to hermes.log
  5. On any FAIL or NOVEL → send Telegram alert with screenshots
  6. On all OK → silent (log only)
```

## Screenshot Strategy

Each flow captures exactly 3 screenshots:
1. **BEFORE** — Page loaded, form/modal visible
2. **MIDDLE** — Form filled, just before or after submit
3. **AFTER** — Result visible (success confirmation or edit verified)

Naming: `{flow}_{step}_{timestamp}.png`
Storage: `/opt/hermes/screenshots/` — auto-cleaned after 7 days.
Telegram alerts include screenshots as photo attachments.

## 19 Edge Cases

### Critical (checked every 30 min run)

| # | Edge Case | Flow That Checks It |
|---|-----------|-------------------|
| 1 | Date ±1 day shift (timezone) | `appointment.py` — create on 18th, verify stored as 18th |
| 2 | JWT expires mid-flow | `login.py` — re-auth per flow, detect unexpected login page |
| 3 | Create succeeds but data lost | Every flow — re-open record, verify every submitted field |
| 4 | Edit doesn't persist | Every flow — edit, save, reload, verify edit stuck |
| 5 | i18n blank buttons/labels | Every flow — observer watches for empty text elements |
| 6 | Stale frontend cache | `login.py` — check version.json endpoint matches deployed |
| 7 | Schema drift (missing columns) | Every flow — API 500 on a field = schema behind code |

### Soft (checked once daily)

| # | Edge Case | Flow That Checks It |
|---|-----------|-------------------|
| 8 | Midnight boundary (23:59 appointment) | `appointment.py` daily — create at 23:59, verify no date flip |
| 9 | Date picker format mismatch | `appointment.py` — verify API payload matches UI selection |
| 10 | Server clock drift vs NTP | `calendar.py` — compare displayed "today" vs actual time |
| 11 | Permission regression (admin → 403) | `login.py` — verify all API calls return 200 |
| 12 | IP access control blocks | `login.py` — detect "access denied" page after login |
| 13 | Duplicate submission (double-click) | Every flow — search test name, verify exactly 1 result |
| 14 | Modal state leak (old data in edit) | `customer.py`, `service.py` — open A, close, open B, verify B |
| 15 | Docker volume stale (missing tables) | `login.py` — quick API count check on permission_groups |
| 16 | Amount formatting mismatch | `payment.py` — submit 1,500,000, verify stored as 1500000 |
| 17 | VietQR URL broken | `payment.py` — verify QR URL returns valid image |
| 18 | Test record not deleted (cleanup fail) | `cleanup.py` — verify delete count > 0, alert if 0 |
| 19 | Test data inflates reports/dashboard | `calendar.py` — verify HERMES records don't appear in today view |

## Open Observer

Every browser-use task gets two instructions:

1. **Specific task** — the defined flow from the YAML map
2. **Open observer** — "report anything that looks wrong, unexpected, or different from a normal working app"

```yaml
observer:
  enabled: true
  watch_for:
    - blank or missing text on buttons/labels
    - error messages or red banners anywhere on page
    - pages loading longer than 5 seconds
    - unexpected redirects or 404 pages
  ignore_patterns: []  # populated as false alarms are dismissed
```

Novel findings go to Telegram with a 🆕 tag. User decides:
- **Real bug** → promote to permanent check in `hermes-map.yaml`
- **False alarm** → add pattern to `hermes-ignore.yaml`

## Alerting

- **Channel:** Telegram (reuse existing bot token from Claude Factory `.env` at `/opt/claude-factory/.env` — copy `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` into `hermes-map.yaml` during install)
- **On failure:** Telegram message with flow name, error details, 3 screenshots
- **On novel finding:** Telegram message with 🆕 tag, description, screenshot
- **On all clear:** Silent — log only, no message
- **Alert fatigue control:** Same failure → only alert once, then daily summary

## Restart Safety

```yaml
restart_safety:
  max_restarts_per_hour: 5
  on_exceeded: alert_telegram_and_stop
```

If the Python process crashes more than 5 times in one hour, systemd alerts via Telegram and stops the timer to prevent runaway restarts.

## Model Testing

On first install, run `hermes.py --test-models`:

```
Testing gpt-4o-mini...  customer flow: 14s, $0.003, accuracy: 6/6 checks passed
Testing claude-3-haiku... customer flow: 12s, $0.004, accuracy: 6/6 checks passed
Testing gpt-4o...        customer flow: 18s, $0.012, accuracy: 6/6 checks passed
```

Winner is saved to `hermes-map.yaml` as the default model. Multiple API keys accepted for redundancy.

## First Run (Baseline)

```bash
python hermes.py --baseline
```

- Runs all flows
- Logs everything as INFO (no Telegram alerts)
- Outputs baseline report: pass/fail per flow, timing, screenshots
- Saves to `hermes-baseline.json`
- Subsequent runs compare against baseline for timing regressions

## Install Script

`install.sh` handles:
1. `apt install -y python3 python3-venv` (if missing)
2. Create Python venv at `/opt/hermes/.venv`
3. `pip install -r requirements.txt`
4. `playwright install chromium` (bundled Chromium, no system install needed)
5. Create `hermes@clinic.vn` account via API call to nk.2checkin.com
6. Create systemd service unit + timer unit
7. `systemctl enable --now hermes.timer`
8. Run baseline: `python hermes.py --baseline`

## Observability Log Format

```
2026-04-18 14:00:32 [OK]      login: passed (4s)
2026-04-18 14:00:44 [OK]      customer_create_edit: passed (12s)
2026-04-18 14:00:51 [NOVEL]   appointment_create: observer noticed calendar day view shows duplicate time slots at 14:00
2026-04-18 14:01:02 [FAIL]    payment_add: amount 1500000 stored as 1500.00
```

Each line is also written as structured JSON for programmatic parsing:
```json
{"ts":"2026-04-18T14:00:44Z","flow":"customer_create_edit","status":"OK","duration_s":12,"screenshots":["customer_before_20260418T140032.png","customer_middle_20260418T140038.png","customer_after_20260418T140044.png"],"novel":null,"error":null}
```

## Flows Tested Per Page

| Page | Flow | What's Tested |
|------|------|--------------|
| `/login` | login | Auth, JWT, version check, API health |
| `/customers` | customer | Add customer button → create → verify all fields → edit → verify → delete |
| `/customers/:id` | service (from profile) | Add service button in customer profile → create → edit → delete |
| `/customers/:id` | appointment (from profile) | Add appointment button → create → edit → delete |
| `/services` | service | Add service button → create → edit → delete |
| `/appointments` | appointment | Add appointment button → create → edit → delete |
| `/calendar` | appointment (from slot) | Click empty slot → create appointment → edit → delete |
| `/calendar` | calendar | Day/week/month view renders without crash |
| `/payment` | payment | Add payment → verify amount → delete |

## Execution Plan (For OMC Team)

The work decomposes into 10 independent modules built in parallel, then 2 integration tasks:

**Parallel batch 1 (lib/ — no dependencies):**
- `lib/logger.py`
- `lib/telegram.py`
- `lib/cleanup.py`
- `lib/models.py`
- `lib/browser.py`

**Parallel batch 2 (flows/ — depends on lib):**
- `flows/login.py`
- `flows/customer.py`
- `flows/service.py`
- `flows/appointment.py`
- `flows/payment.py`
- `flows/calendar.py`

**Sequential (integration):**
- `hermes.py` (orchestrator — depends on lib + flows)
- `install.sh` + systemd units + hermes-map.yaml + requirements.txt

## Out of Scope

- No Docker container (runs standalone via systemd)
- No database changes (uses existing API endpoints for cleanup)
- No frontend code changes
- No monitoring of other projects (KOL, Claude Factory, Polymarket bot)
- No load testing or performance benchmarking
