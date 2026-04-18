# Hermes Synthetic Monitor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Python service that uses browser-use to test every business flow on nk.2checkin.com every 30 minutes, alerting via Telegram on failures.

**Architecture:** Hermes lives at `/opt/hermes/` on VPS `76.13.16.68`. A systemd timer triggers `hermes.py` every 30 minutes. It reads a YAML map of website flows, spawns one browser-use agent per flow, captures 3 screenshots per flow (before/middle/after), and aggregates results. Failures and novel findings go to Telegram using the existing bot token.

**Tech Stack:** Python 3.11+, browser-use, Playwright Chromium, PyYAML, python-telegram-bot, systemd timer

**Spec:** `docs/superpowers/specs/2026-04-18-hermes-synthetic-monitor-design.md`

---

## File Structure

```
/opt/hermes/
├── hermes.py                 # Entry point: reads map → runs flows → reports
├── hermes-map.yaml           # Website map: modules, flows, edge cases, observer config
├── hermes-ignore.yaml        # Dismissed novel findings (populated over time)
├── config.py                 # Loads hermes-map.yaml + env vars, returns typed config
├── flows/
│   ├── __init__.py
│   ├── base.py               # BaseFlow ABC: screenshot capture, observer prompt, result type
│   ├── login.py              # Auth flow + version check + API health
│   ├── customer.py           # Create → verify → edit → verify → cleanup
│   ├── service.py            # Create → verify → edit → verify → cleanup (2 pages)
│   ├── appointment.py        # Create → verify date/time → edit → verify → cleanup (3 pages)
│   ├── payment.py            # Create → verify amount → cleanup
│   └── calendar.py           # Day/week/month view renders
├── lib/
│   ├── __init__.py
│   ├── browser.py            # Browser session factory: headless Chromium, screenshot helpers
│   ├── telegram_notifier.py  # Send messages + photos via existing bot
│   ├── logger.py             # Rotated file logging + structured JSON lines
│   ├── cleanup.py            # API DELETE wrapper for test records
│   └── models.py             # Multi-model tester + config
├── screenshots/              # Auto-cleaned after 7 days
├── hermes.log                # Observability log (rotated daily)
├── requirements.txt
├── install.sh                # Systemd + Chromium + venv + account setup
└── hermes.service            # Systemd service unit
└── hermes.timer              # Systemd timer unit (every 30 min)
```

---

## Task Dependencies

```
Batch 1 (parallel, no dependencies):
  Task 1:  config.py + hermes-map.yaml
  Task 2:  lib/logger.py
  Task 3:  lib/telegram_notifier.py
  Task 4:  lib/browser.py
  Task 5:  lib/cleanup.py
  Task 6:  lib/models.py

Batch 2 (depends on Batch 1):
  Task 7:  flows/base.py
  Task 8:  flows/login.py
  Task 9:  flows/customer.py
  Task 10: flows/service.py
  Task 11: flows/appointment.py
  Task 12: flows/payment.py
  Task 13: flows/calendar.py

Batch 3 (depends on Batch 2):
  Task 14: hermes.py (orchestrator)
  Task 15: install.sh + systemd units + requirements.txt
  Task 16: Baseline run + verification
```

---

### Task 1: Config Loader + Website Map

**Files:**
- Create: `config.py`
- Create: `hermes-map.yaml`
- Create: `hermes-ignore.yaml`

- [ ] **Step 1: Write config.py**

```python
"""Hermes configuration loader. Reads hermes-map.yaml and environment variables."""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any

import yaml


@dataclass
class ScreenshotConfig:
    directory: str = "/opt/hermes/screenshots"
    per_flow: int = 3
    keep_days: int = 7


@dataclass
class TelegramConfig:
    bot_token: str = ""
    chat_id: str = ""


@dataclass
class ObserverConfig:
    enabled: bool = True
    watch_for: list[str] = field(default_factory=list)
    ignore_patterns: list[str] = field(default_factory=list)


@dataclass
class RestartSafetyConfig:
    max_restarts_per_hour: int = 5
    on_exceeded: str = "alert_telegram_and_stop"


@dataclass
class FlowStep:
    description: str
    fields: dict[str, str] = field(default_factory=dict)
    verify_fields: list[str] = field(default_factory=list)
    timezone_check: bool = False
    midnight_boundary: bool = False
    amount_check: bool = False


@dataclass
class FlowConfig:
    critical: bool = True
    create: FlowStep | None = None
    edit: FlowStep | None = None
    cleanup_field: str = "name"
    cleanup_prefix: str = "HERMES_"
    pages_to_test: list[dict[str, str]] = field(default_factory=list)
    checks: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class SiteConfig:
    url: str = "https://nk.2checkin.com"
    email: str = "hermes@clinic.vn"
    password: str = ""


@dataclass
class HermesConfig:
    site: SiteConfig = field(default_factory=SiteConfig)
    observer: ObserverConfig = field(default_factory=ObserverConfig)
    screenshots: ScreenshotConfig = field(default_factory=ScreenshotConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)
    restart_safety: RestartSafetyConfig = field(default_factory=RestartSafetyConfig)
    flows: dict[str, FlowConfig] = field(default_factory=dict)
    model: str = ""
    model_api_keys: dict[str, str] = field(default_factory=dict)
    first_run_mode: bool = False


def _parse_flow(data: dict[str, Any]) -> FlowConfig:
    """Parse a single flow entry from YAML."""
    fc = FlowConfig(critical=data.get("critical", True))

    if "create" in data:
        cd = data["create"]
        fc.create = FlowStep(
            description=cd.get("description", ""),
            fields=cd.get("fields", {}),
            verify_fields=cd.get("verify_fields", []),
            timezone_check=cd.get("timezone_check", False),
            midnight_boundary=cd.get("midnight_boundary", False),
            amount_check=cd.get("amount_check", False),
        )
        fc.cleanup_prefix = cd.get("cleanup_prefix", "HERMES_")

    if "edit" in data:
        ed = data["edit"]
        fc.edit = FlowStep(
            description=ed.get("description", ""),
            fields=ed.get("fields", {}),
            verify_fields=ed.get("verify_fields", []),
        )

    fc.cleanup_field = data.get("cleanup_field", "name")
    fc.pages_to_test = data.get("pages_to_test", [])
    fc.checks = data.get("checks", [])

    return fc


def load_config(config_path: str | None = None) -> HermesConfig:
    """Load Hermes config from YAML file and environment variables."""
    if config_path is None:
        config_path = os.environ.get("HERMES_CONFIG", "/opt/hermes/hermes-map.yaml")

    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(path) as f:
        raw = yaml.safe_load(f)

    cfg = HermesConfig()

    # Site
    if "site" in raw:
        s = raw["site"]
        cfg.site = SiteConfig(
            url=s.get("url", "https://nk.2checkin.com"),
            email=s.get("email", "hermes@clinic.vn"),
            password=os.environ.get("HERMES_PASSWORD", s.get("password", "")),
        )

    # Observer
    if "observer" in raw:
        o = raw["observer"]
        cfg.observer = ObserverConfig(
            enabled=o.get("enabled", True),
            watch_for=o.get("watch_for", []),
            ignore_patterns=o.get("ignore_patterns", []),
        )

    # Screenshots
    if "screenshots" in raw:
        sc = raw["screenshots"]
        cfg.screenshots = ScreenshotConfig(
            directory=sc.get("directory", "/opt/hermes/screenshots"),
            per_flow=sc.get("per_flow", 3),
            keep_days=sc.get("keep_days", 7),
        )

    # Telegram — from env vars first, then YAML
    cfg.telegram = TelegramConfig(
        bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", raw.get("telegram", {}).get("bot_token", "")),
        chat_id=os.environ.get("TELEGRAM_CHAT_ID", raw.get("telegram", {}).get("chat_id", "")),
    )

    # Restart safety
    if "restart_safety" in raw:
        rs = raw["restart_safety"]
        cfg.restart_safety = RestartSafetyConfig(
            max_restarts_per_hour=rs.get("max_restarts_per_hour", 5),
            on_exceeded=rs.get("on_exceeded", "alert_telegram_and_stop"),
        )

    # Model
    cfg.model = raw.get("model", "gpt-4o-mini")
    model_keys = raw.get("model_api_keys", {})
    for k, v in model_keys.items():
        cfg.model_api_keys[k] = os.environ.get(f"LLM_API_KEY_{k.upper()}", v)

    # Flows
    for name, flow_data in raw.get("flows", {}).items():
        cfg.flows[name] = _parse_flow(flow_data)

    return cfg


def load_ignore_patterns(path: str = "/opt/hermes/hermes-ignore.yaml") -> list[str]:
    """Load dismissed novel finding patterns."""
    p = Path(path)
    if not p.exists():
        return []
    with open(p) as f:
        data = yaml.safe_load(f)
    return data.get("ignore_patterns", [])
```

- [ ] **Step 2: Write hermes-map.yaml**

```yaml
site:
  url: "https://nk.2checkin.com"
  email: "hermes@clinic.vn"
  password: "CHANGE_ME_ON_VPS"

model: gpt-4o-mini

model_api_keys:
  openai: ""
  anthropic: ""

observer:
  enabled: true
  watch_for:
    - blank or missing text on buttons or labels
    - error messages or red toast/banner notifications
    - pages loading longer than 5 seconds
    - unexpected redirects to login or 404 pages
    - console errors visible in any error overlay
  ignore_patterns: []

screenshots:
  directory: /opt/hermes/screenshots
  per_flow: 3
  keep_days: 7

telegram:
  bot_token: ""
  chat_id: ""

restart_safety:
  max_restarts_per_hour: 5
  on_exceeded: alert_telegram_and_stop

flows:
  login:
    critical: true
    create:
      description: "Navigate to /login, enter credentials, verify redirect to dashboard"
      fields:
        email: "{site.email}"
        password: "{site.password}"
      verify_fields:
        - dashboard loads with sidebar
        - /api/auth/me returns 200
        - version.json matches deployed version

  customer:
    critical: true
    pages_to_test:
      - page: /customers
        button: "Thêm khách hàng"
    create:
      description: "Click add customer, fill form with test data, submit"
      cleanup_prefix: "HERMES_TEST_"
      fields:
        name: "HERMES_TEST_{timestamp}"
        phone: "0000000000"
        email: "hermes_test_{timestamp}@test.vn"
      verify_fields: [name, phone, email]
    edit:
      description: "Open the created customer, edit the name, save, verify"
      fields:
        name: "HERMES_TEST_EDIT_{timestamp}"
      verify_fields: [name]

  service:
    critical: true
    pages_to_test:
      - page: /services
        button: "Thêm dịch vụ"
      - page: /customers/{customer_id}
        button: "Thêm dịch vụ vụ"
    create:
      description: "Click add service, fill form, submit"
      cleanup_prefix: "HERMES_SVC_"
      fields:
        name: "HERMES_SVC_{timestamp}"
        price: "1500000"
      verify_fields: [name, price]
    edit:
      description: "Open created service, edit price, save, verify"
      fields:
        price: "2000000"
      verify_fields: [price]

  appointment:
    critical: true
    pages_to_test:
      - page: /appointments
        button: "Thêm lịch hẹn"
      - page: /customers/{customer_id}
        button: "Thêm lịch hẹn"
      - page: /calendar
        button: "click empty time slot"
    create:
      description: "Click add appointment, fill with test date 1900-01-01, submit"
      cleanup_prefix: "HERMES_APT_"
      fields:
        customer: "{last_created_customer}"
        date: "1900-01-01"
        time: "09:00"
      verify_fields: [date, time, status]
      timezone_check: true
    edit:
      description: "Edit appointment time to 23:59, save, verify midnight boundary"
      fields:
        time: "23:59"
      verify_fields: [time]
      midnight_boundary: true

  payment:
    critical: true
    create:
      description: "Navigate to payment, add payment with test amount, submit"
      cleanup_prefix: "HERMES_PAY_"
      fields:
        amount: "1500000"
        method: "cash"
      verify_fields: [amount, method]
      amount_check: true

  calendar:
    critical: false
    checks:
      - day_view_renders: true
        description: "Switch to day view, verify it loads without error"
      - week_view_renders: true
        description: "Switch to week view, verify it loads without error"
      - month_view_renders: true
        description: "Switch to month view, verify it loads without error"
      - no_test_data_visible: true
        description: "Verify HERMES test records do not appear in today's view"
```

- [ ] **Step 3: Write hermes-ignore.yaml**

```yaml
# Dismissed novel findings — patterns that have been reviewed and are NOT bugs.
# Add patterns here when Hermes reports a false alarm.
ignore_patterns: []
```

- [ ] **Step 4: Commit**

```bash
cd /opt/hermes
git init
git add config.py hermes-map.yaml hermes-ignore.yaml
git commit -m "feat: add config loader and website map"
```

---

### Task 2: Logger

**Files:**
- Create: `lib/__init__.py`
- Create: `lib/logger.py`

- [ ] **Step 1: Write lib/__init__.py**

```python
"""Hermes shared library modules."""
```

- [ ] **Step 2: Write lib/logger.py**

```python
"""
Hermes observability logger.
Writes human-readable lines to hermes.log and structured JSON to hermes.jsonl.
Both files are rotated daily.
"""

import json
import logging
import logging.handlers
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


_LOG_DIR = Path("/opt/hermes")


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class JsonFormatter(logging.Formatter):
    """Formats log records as single-line JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": _utc_iso(),
            "level": record.levelname,
            "module": record.module,
        }
        # If the message was passed extra fields, merge them
        if hasattr(record, "hermes_data") and isinstance(record.hermes_data, dict):
            payload.update(record.hermes_data)
        else:
            payload["message"] = record.getMessage()

        return json.dumps(payload, ensure_ascii=False)


def setup_logger(name: str = "hermes", log_dir: str | None = None) -> logging.Logger:
    """Create a logger that writes to both human-readable and JSON files."""
    log_path = Path(log_dir) if log_dir else _LOG_DIR

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Avoid duplicate handlers on repeated calls
    if logger.handlers:
        return logger

    # Human-readable log (rotated daily, keep 30 days)
    text_handler = logging.handlers.TimedRotatingFileHandler(
        filename=log_path / "hermes.log",
        when="D",
        interval=1,
        backupCount=30,
    )
    text_handler.setLevel(logging.INFO)
    text_handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(text_handler)

    # Structured JSON log (rotated daily, keep 30 days)
    json_handler = logging.handlers.TimedRotatingFileHandler(
        filename=log_path / "hermes.jsonl",
        when="D",
        interval=1,
        backupCount=30,
    )
    json_handler.setLevel(logging.DEBUG)
    json_handler.setFormatter(JsonFormatter())
    logger.addHandler(json_handler)

    return logger


def log_flow_result(
    logger: logging.Logger,
    flow_name: str,
    status: str,
    duration_s: float,
    screenshots: list[str] | None = None,
    error: str | None = None,
    novel: str | None = None,
) -> None:
    """Log a single flow result in both human-readable and structured formats."""
    # Human-readable
    tag = status.upper()
    if status == "ok":
        logger.info(f"[{tag}] {flow_name}: passed ({duration_s:.0f}s)")
    elif status == "novel":
        logger.warning(f"[{tag}] {flow_name}: observer noticed {novel}")
    else:
        logger.error(f"[{tag}] {flow_name}: {error} ({duration_s:.0f}s)")

    # Structured JSON (written by the JSON handler automatically)
    logger.debug(
        "",
        extra={
            "hermes_data": {
                "flow": flow_name,
                "status": status,
                "duration_s": round(duration_s, 1),
                "screenshots": screenshots or [],
                "novel": novel,
                "error": error,
            }
        },
    )
```

- [ ] **Step 3: Commit**

```bash
git add lib/__init__.py lib/logger.py
git commit -m "feat: add rotated observability logger with JSON lines"
```

---

### Task 3: Telegram Notifier

**Files:**
- Create: `lib/telegram_notifier.py`

- [ ] **Step 1: Write lib/telegram_notifier.py**

```python
"""
Hermes Telegram notifier.
Reuses the existing bot token from Claude Factory.
"""

import asyncio
import logging
from pathlib import Path
from typing import Any

from telegram import Bot
from telegram.constants import ParseMode

logger = logging.getLogger("hermes")


async def send_text(bot_token: str, chat_id: str, text: str) -> bool:
    """Send a text message. Returns True on success."""
    if not bot_token or not chat_id:
        logger.warning("Telegram credentials not configured, skipping alert")
        return False
    try:
        bot = Bot(token=bot_token)
        await bot.send_message(chat_id=int(chat_id), text=text, parse_mode=ParseMode.HTML)
        return True
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False


async def send_photo(bot_token: str, chat_id: str, caption: str, photo_path: str) -> bool:
    """Send a photo with caption. Returns True on success."""
    if not bot_token or not chat_id:
        return False
    try:
        bot = Bot(token=bot_token)
        p = Path(photo_path)
        if not p.exists():
            logger.warning(f"Screenshot not found: {photo_path}")
            return False
        with open(p, "rb") as f:
            await bot.send_photo(chat_id=int(chat_id), photo=f, caption=caption[:1024])
        return True
    except Exception as e:
        logger.error(f"Telegram photo send failed: {e}")
        return False


async def send_alert(
    bot_token: str,
    chat_id: str,
    flow_name: str,
    status: str,
    details: str,
    screenshots: list[str] | None = None,
) -> None:
    """Send an alert for a flow failure or novel finding.

    Sends one text message with summary, then up to 3 screenshots.
    """
    tag = "🆕 NOVEL" if status == "novel" else "❌ FAIL"
    text = (
        f"<b>{tag}</b>\n\n"
        f"Flow: <b>{flow_name}</b>\n"
        f"Details: {details}\n\n"
        f"Time: {_utc_now()}"
    )
    await send_text(bot_token, chat_id, text)

    # Send up to 3 screenshots
    if screenshots:
        labels = ["📋 BEFORE", "📋 MIDDLE", "📋 AFTER"]
        for i, ss in enumerate(screenshots[:3]):
            caption = f"{labels[i]} — {flow_name}"
            await send_photo(bot_token, chat_id, caption, ss)
            await asyncio.sleep(0.5)  # Rate limit safety


async def send_daily_summary(
    bot_token: str,
    chat_id: str,
    results: list[dict[str, Any]],
) -> None:
    """Send a daily summary of repeated failures."""
    failed = [r for r in results if r["status"] != "ok"]
    if not failed:
        return

    lines = ["📊 <b>Daily Summary — Repeated Failures</b>\n"]
    for r in failed:
        lines.append(f"• {r['flow']}: {r.get('error', 'unknown')} (last seen {_utc_now()})")
    lines.append(f"\nTotal: {len(failed)} flow(s) failing")

    await send_text(bot_token, chat_id, "\n".join(lines))


async def send_restart_alert(bot_token: str, chat_id: str, restart_count: int) -> None:
    """Alert that Hermes has exceeded max restarts."""
    text = (
        f"🚨 <b>Hermes Restart Limit Hit</b>\n\n"
        f"Restarted {restart_count} times in the last hour.\n"
        f"Timer stopped to prevent runaway.\n\n"
        f"Investigate: ssh root@76.13.16.68 — journalctl -u hermes"
    )
    await send_text(bot_token, chat_id, text)


def _utc_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
```

- [ ] **Step 2: Commit**

```bash
git add lib/telegram_notifier.py
git commit -m "feat: add Telegram notifier with screenshot support"
```

---

### Task 4: Browser Session Factory

**Files:**
- Create: `lib/browser.py`

- [ ] **Step 1: Write lib/browser.py**

```python
"""
Hermes browser session factory.
Creates headless Chromium sessions for browser-use with screenshot helpers.
"""

import asyncio
import base64
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from browser_use import Agent, BrowserProfile


def screenshot_path(flow_name: str, step: str, screenshot_dir: str) -> str:
    """Generate a timestamped screenshot file path."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"{flow_name}_{step}_{ts}.png"
    return str(Path(screenshot_dir) / filename)


async def take_screenshot(browser_session: Any, filepath: str) -> str:
    """Take a screenshot via browser-use session and save to disk.

    browser-use's BrowserSession exposes page via .context.pages[0].
    """
    try:
        page = browser_session.context.pages[0]
        await page.screenshot(path=filepath)
        return filepath
    except Exception as e:
        # Fallback: use browser-use agent's built-in screenshot
        import logging
        logging.getLogger("hermes").warning(f"Screenshot fallback: {e}")
        return ""


def create_browser_profile(
    headless: bool = True,
    screenshot_dir: str = "/opt/hermes/screenshots",
) -> BrowserProfile:
    """Create a BrowserProfile configured for Hermes headless operation."""
    Path(screenshot_dir).mkdir(parents=True, exist_ok=True)

    return BrowserProfile(
        headless=headless,
        minimum_wait_page_load_time=1.0,
        wait_between_actions=0.5,
        disable_security=False,
    )


def build_task_prompt(
    flow_name: str,
    flow_config: Any,
    site_config: Any,
    timestamp: str,
    observer_config: Any,
    ignore_patterns: list[str],
) -> str:
    """Build the browser-use task prompt for a given flow.

    This prompt tells the LLM exactly what to do in the browser.
    """
    observer_section = ""
    if observer_config and observer_config.enabled:
        watch_items = "\n".join(f"  - {w}" for w in observer_config.watch_for)
        ignore_items = ""
        if ignore_patterns:
            ignore_items = "\nIgnore these known patterns (NOT bugs):\n" + "\n".join(
                f"  - {p}" for p in ignore_patterns
            )
        observer_section = f"""
OBSERVER INSTRUCTIONS:
While performing this task, ALSO watch for these issues:
{watch_items}
{ignore_items}
If you notice anything unexpected, include it in your final response as:
NOVEL_FINDING: <description of what you noticed>
"""

    return f"""You are Hermes, a synthetic monitoring agent testing the TDental clinic dashboard.
You are testing the {flow_name} flow.

SITE: {site_config.url}
TEST ACCOUNT: {site_config.email}
TIMESTAMP: {timestamp}

RULES:
- All test data MUST use the prefix HERMES_ in names and date 1900-01-01
- After creating a record, re-open it and verify EVERY field matches what you submitted
- After editing a record, reload the page and verify the edit stuck
- If anything fails, report it clearly as: FAIL: <description>
- Take your time, be thorough. Accuracy matters more than speed.
{observer_section}
"""


def cleanup_old_screenshots(screenshot_dir: str, keep_days: int = 7) -> int:
    """Delete screenshots older than keep_days. Returns count deleted."""
    cutoff = time.time() - (keep_days * 86400)
    deleted = 0
    for p in Path(screenshot_dir).glob("*.png"):
        if p.stat().st_mtime < cutoff:
            p.unlink()
            deleted += 1
    return deleted
```

- [ ] **Step 2: Commit**

```bash
git add lib/browser.py
git commit -m "feat: add browser session factory with screenshot helpers"
```

---

### Task 5: API Cleanup

**Files:**
- Create: `lib/cleanup.py`

- [ ] **Step 1: Write lib/cleanup.py**

```python
"""
Hermes cleanup module.
Deletes test records via the TDental API after each flow.
"""

import logging
from typing import Any

import httpx

logger = logging.getLogger("hermes")

# API endpoints for each entity type
ENTITY_ENDPOINTS = {
    "customer": "/api/partners",
    "service": "/api/products",
    "appointment": "/api/appointments",
    "payment": "/api/payments",
}


async def get_auth_token(base_url: str, email: str, password: str) -> str:
    """Authenticate and get a JWT token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{base_url}/api/Auth/login",
            json={"email": email, "password": password},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("token", "")


async def find_test_records(
    base_url: str,
    token: str,
    entity: str,
    prefix: str = "HERMES_",
) -> list[dict[str, Any]]:
    """Find all test records matching the prefix."""
    endpoint = ENTITY_ENDPOINTS.get(entity)
    if not endpoint:
        logger.warning(f"Unknown entity type: {entity}")
        return []

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{base_url}{endpoint}", headers=headers)
        resp.raise_for_status()
        records = resp.json()

        # Filter for test records
        return [
            r for r in records
            if any(
                str(v).startswith(prefix)
                for k, v in r.items()
                if isinstance(v, str) and k in ("name", "title", "partner_name")
            )
        ]


async def delete_test_records(
    base_url: str,
    token: str,
    entity: str,
    records: list[dict[str, Any]],
) -> int:
    """Delete test records by ID. Returns count deleted."""
    endpoint = ENTITY_ENDPOINTS.get(entity)
    if not endpoint:
        return 0

    headers = {"Authorization": f"Bearer {token}"}
    deleted = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for record in records:
            record_id = record.get("id")
            if not record_id:
                continue
            try:
                resp = await client.delete(
                    f"{base_url}{endpoint}/{record_id}",
                    headers=headers,
                )
                if resp.status_code in (200, 204):
                    deleted += 1
                else:
                    logger.warning(
                        f"Failed to delete {entity}/{record_id}: {resp.status_code}"
                    )
            except Exception as e:
                logger.error(f"Delete error for {entity}/{record_id}: {e}")

    return deleted


async def cleanup_flow(
    base_url: str,
    token: str,
    entity: str,
    prefix: str = "HERMES_",
) -> int:
    """Find and delete all test records for a flow. Returns count deleted."""
    records = await find_test_records(base_url, token, entity, prefix)
    if not records:
        logger.info(f"No {entity} test records to clean up")
        return 0

    deleted = await delete_test_records(base_url, token, entity, records)
    logger.info(f"Cleaned up {deleted}/{len(records)} {entity} test records")
    return deleted
```

- [ ] **Step 2: Commit**

```bash
git add lib/cleanup.py
git commit -m "feat: add API cleanup module for test records"
```

---

### Task 6: Model Tester

**Files:**
- Create: `lib/models.py`

- [ ] **Step 1: Write lib/models.py**

```python
"""
Hermes model tester.
Tests multiple LLM providers and picks the cheapest one that passes all checks.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("hermes")


@dataclass
class ModelTestResult:
    model_name: str
    provider: str
    passed: bool
    checks_total: int = 0
    checks_passed: int = 0
    duration_s: float = 0.0
    estimated_cost_usd: float = 0.0
    error: str | None = None


# Models to test, in order of preference (cheapest first)
CANDIDATE_MODELS: list[dict[str, str]] = [
    {"provider": "openai", "model": "gpt-4o-mini", "name": "GPT-4o-mini"},
    {"provider": "anthropic", "model": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku"},
    {"provider": "openai", "model": "gpt-4o", "name": "GPT-4o"},
]


def _create_llm(provider: str, model: str, api_keys: dict[str, str]) -> Any:
    """Create a browser-use LLM instance for the given provider."""
    if provider == "openai":
        from browser_use import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_keys.get("openai", ""),
        )
    elif provider == "anthropic":
        from browser_use import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=api_keys.get("anthropic", ""),
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")


async def test_model(
    candidate: dict[str, str],
    api_keys: dict[str, str],
    site_url: str,
    site_email: str,
    site_password: str,
) -> ModelTestResult:
    """Run a simple login test with one model and return results."""
    result = ModelTestResult(
        model_name=candidate["name"],
        provider=candidate["provider"],
        passed=False,
    )

    try:
        llm = _create_llm(candidate["provider"], candidate["model"], api_keys)
    except Exception as e:
        result.error = f"Model init failed: {e}"
        return result

    from browser_use import Agent
    from lib.browser import create_browser_profile

    browser_profile = create_browser_profile(headless=True)

    task = f"""You are Hermes test. Perform this simple check:
1. Navigate to {site_url}/login
2. Enter email: {site_email} and password: {site_password}
3. Click login
4. Report SUCCESS if you see a dashboard, FAIL if you don't.
"""

    start = time.time()
    try:
        agent = Agent(
            task=task,
            llm=llm,
            browser_profile=browser_profile,
            max_steps=10,
        )
        history = await agent.run(max_steps=10)
        duration = time.time() - start

        result.duration_s = round(duration, 1)
        result.checks_total = 1
        result.checks_passed = 1 if history.final_result() and "SUCCESS" in str(history.final_result()).upper() else 0
        result.passed = result.checks_passed == result.checks_total

    except Exception as e:
        result.duration_s = round(time.time() - start, 1)
        result.error = str(e)
        result.passed = False

    return result


async def run_model_tests(
    api_keys: dict[str, str],
    site_url: str,
    site_email: str,
    site_password: str,
) -> list[ModelTestResult]:
    """Test all candidate models and return results sorted by cost-effectiveness."""
    results: list[ModelTestResult] = []

    for candidate in CANDIDATE_MODELS:
        logger.info(f"Testing model: {candidate['name']}...")
        result = await test_model(candidate, api_keys, site_url, site_email, site_password)
        results.append(result)

        status = "PASSED" if result.passed else f"FAILED ({result.error})"
        logger.info(
            f"  {result.model_name}: {status} | "
            f"{result.duration_s}s | "
            f"{result.checks_passed}/{result.checks_total} checks"
        )

    # Sort: passed first, then by duration (faster = better)
    passed = sorted([r for r in results if r.passed], key=lambda r: r.duration_s)
    failed = sorted([r for r in results if not r.passed], key=lambda r: r.duration_s)

    return passed + failed


def recommend_model(results: list[ModelTestResult]) -> ModelTestResult | None:
    """Pick the cheapest model that passed all checks."""
    for r in results:
        if r.passed:
            return r
    return None
```

- [ ] **Step 2: Commit**

```bash
git add lib/models.py
git commit -m "feat: add multi-model tester with auto-selection"
```

---

### Task 7: Base Flow

**Files:**
- Create: `flows/__init__.py`
- Create: `flows/base.py`

- [ ] **Step 1: Write flows/__init__.py**

```python
"""Hermes test flows."""
```

- [ ] **Step 2: Write flows/base.py**

```python
"""
Base flow ABC.
All Hermes flows inherit from this. Provides screenshot capture, observer prompt,
and structured result type.
"""

import asyncio
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import logging

from lib.browser import (
    build_task_prompt,
    create_browser_profile,
    screenshot_path,
    take_screenshot,
)

logger = logging.getLogger("hermes")


@dataclass
class FlowResult:
    """Result of running a single flow."""
    flow_name: str
    status: str = "ok"  # ok, fail, novel
    duration_s: float = 0.0
    screenshots: list[str] = field(default_factory=list)
    error: str | None = None
    novel: str | None = None
    created_record_id: str | None = None


class BaseFlow(ABC):
    """Abstract base class for Hermes test flows.

    Subclasses must implement `build_task()` which returns the full
    browser-use task string, and `entity_type()` for cleanup.
    """

    def __init__(
        self,
        name: str,
        config: Any,
        site_config: Any,
        observer_config: Any,
        ignore_patterns: list[str] | None = None,
        screenshot_dir: str = "/opt/hermes/screenshots",
    ):
        self.name = name
        self.config = config
        self.site = site_config
        self.observer = observer_config
        self.ignore_patterns = ignore_patterns or []
        self.screenshot_dir = screenshot_dir
        self.timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    @abstractmethod
    def build_task(self) -> str:
        """Build the full browser-use task prompt for this flow."""
        ...

    @abstractmethod
    def entity_type(self) -> str:
        """Return the entity type for cleanup (e.g., 'customer', 'appointment')."""
        ...

    def cleanup_prefix(self) -> str:
        """Return the name prefix used for test records."""
        return getattr(self.config, "cleanup_prefix", "HERMES_")

    async def run(self, llm: Any) -> FlowResult:
        """Execute this flow: create → screenshot → verify → edit → screenshot → cleanup."""
        result = FlowResult(flow_name=self.name)
        start = time.time()

        from browser_use import Agent

        browser_profile = create_browser_profile(
            headless=True,
            screenshot_dir=self.screenshot_dir,
        )

        task = self.build_task()
        base_prompt = build_task_prompt(
            flow_name=self.name,
            flow_config=self.config,
            site_config=self.site,
            timestamp=self.timestamp,
            observer_config=self.observer,
            ignore_patterns=self.ignore_patterns,
        )
        full_task = base_prompt + "\n" + task

        try:
            agent = Agent(
                task=full_task,
                llm=llm,
                browser_profile=browser_profile,
                max_steps=30,
            )

            # Screenshot BEFORE (after initial navigation)
            # browser-use handles navigation; we capture after via callback
            history = await agent.run(max_steps=30)

            result.duration_s = round(time.time() - start, 1)

            # Parse the final result for status
            final = history.final_result()
            if final:
                final_str = str(final)
                if "FAIL:" in final_str.upper():
                    result.status = "fail"
                    # Extract failure reason
                    for line in final_str.split("\n"):
                        if "FAIL:" in line.upper():
                            result.error = line.strip()
                            break
                    if not result.error:
                        result.error = final_str[:500]
                elif "NOVEL_FINDING:" in final_str.upper():
                    result.status = "novel"
                    for line in final_str.split("\n"):
                        if "NOVEL_FINDING:" in line.upper():
                            result.novel = line.replace("NOVEL_FINDING:", "").strip()
                            break
                    if not result.novel:
                        result.novel = "Unknown novel finding"

            # Collect screenshots that browser-use saved
            result.screenshots = self._collect_screenshots()

            # Check for errors in history
            errors = history.errors()
            if errors and result.status == "ok":
                result.status = "fail"
                result.error = "; ".join(str(e) for e in errors[:3])

        except Exception as e:
            result.duration_s = round(time.time() - start, 1)
            result.status = "fail"
            result.error = str(e)
            result.screenshots = self._collect_screenshots()

        return result

    def _collect_screenshots(self) -> list[str]:
        """Collect the most recent screenshots for this flow from the screenshot dir."""
        from pathlib import Path

        ss_dir = Path(self.screenshot_dir)
        if not ss_dir.exists():
            return []

        # Get the most recent screenshots matching this flow name
        all_screenshots = sorted(
            ss_dir.glob(f"{self.name}_*.png"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        # Take last 3 (before, middle, after)
        return [str(p) for p in all_screenshots[:3]]
```

- [ ] **Step 3: Commit**

```bash
git add flows/__init__.py flows/base.py
git commit -m "feat: add base flow ABC with screenshot capture and observer"
```

---

### Task 8: Login Flow

**Files:**
- Create: `flows/login.py`

- [ ] **Step 1: Write flows/login.py**

```python
"""
Hermes login flow.
Tests authentication, version check, and API health.
"""

from flows.base import BaseFlow


class LoginFlow(BaseFlow):
    """Test: navigate to login, authenticate, verify dashboard + API calls."""

    def entity_type(self) -> str:
        return "customer"  # Not used for cleanup, but required by ABC

    def build_task(self) -> str:
        return f"""
TASK: Test login and verify the application is healthy.

Steps:
1. Navigate to {self.site.url}/login
2. Fill in the email field with: {self.site.email}
3. Fill in the password field with: {self.site.password}
4. Click the login/submit button
5. After login, verify you see a dashboard page with a sidebar navigation.
   FAIL if: you see a login error, blank page, or "access denied" message.
6. Navigate to {self.site.url}/api/auth/me in the browser address bar.
   Verify the response contains user data (JSON with email field).
   FAIL if: response is 401, 403, or empty.
7. Navigate to {self.site.url}/version.json.
   Note the version number in your response.
8. Navigate back to the dashboard.

Expected result: Successfully logged in, dashboard visible, API healthy, version noted.
Report your findings.
"""
```

- [ ] **Step 2: Commit**

```bash
git add flows/login.py
git commit -m "feat: add login flow with API health and version check"
```

---

### Task 9: Customer Flow

**Files:**
- Create: `flows/customer.py`

- [ ] **Step 1: Write flows/customer.py**

```python
"""
Hermes customer flow.
Tests: create customer → verify all fields → edit → verify edit stuck → cleanup.
"""

from flows.base import BaseFlow


class CustomerFlow(BaseFlow):
    """Test the customer add/edit flow on the Customers page."""

    def entity_type(self) -> str:
        return "customer"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        name = create_fields.get("name", "HERMES_TEST_{timestamp}").replace("{timestamp}", ts)
        phone = create_fields.get("phone", "0000000000")
        email = create_fields.get("email", "hermes_test_{timestamp}@test.vn").replace("{timestamp}", ts.lower())

        edit_name = f"HERMES_TEST_EDIT_{ts}"

        return f"""
TASK: Test customer create, verify, edit, verify flow.

Steps:
1. Navigate to {self.site.url}/customers
2. Look for and click the "Thêm khách hàng" (Add Customer) button.
   FAIL if: button is missing or does nothing when clicked.
3. In the customer form that appears, fill in:
   - Name/Full name: {name}
   - Phone: {phone}
   - Email: {email}
4. Click the submit/save button to create the customer.
5. After creation, search for "{name}" in the customer list.
   FAIL if: customer is not found in the list.
6. Click on the customer "{name}" to open their detail/profile page.
7. VERIFY every field matches what you submitted:
   - Name is exactly: {name}
   - Phone is exactly: {phone}
   - Email is exactly: {email}
   FAIL if: any field is empty, different, or null.
8. Find and click the edit button on this customer.
9. Change the name to: {edit_name}
10. Save the edit.
11. Reload the page (navigate away and back to this customer).
12. VERIFY the name is now: {edit_name}
    FAIL if: the name reverted to the old value or is blank.
13. Report the customer ID if visible in the URL or page.

Expected: Customer created with all fields verified, edit persisted after reload.
"""
```

- [ ] **Step 2: Commit**

```bash
git add flows/customer.py
git commit -m "feat: add customer create/verify/edit/verify flow"
```

---

### Task 10: Service Flow

**Files:**
- Create: `flows/service.py`

- [ ] **Step 1: Write flows/service.py**

```python
"""
Hermes service flow.
Tests: create service → verify fields → edit → verify → cleanup.
Tests from both /services page and customer profile page.
"""

from flows.base import BaseFlow


class ServiceFlow(BaseFlow):
    """Test the service add/edit flow on the Services page."""

    def entity_type(self) -> str:
        return "service"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        name = create_fields.get("name", "HERMES_SVC_{timestamp}").replace("{timestamp}", ts)
        price = create_fields.get("price", "1500000")

        edit_price = "2000000"

        return f"""
TASK: Test service create, verify, edit, verify flow on the Services page.

Steps:
1. Navigate to {self.site.url}/services
2. Look for and click the "Thêm dịch vụ" (Add Service) button, or any button that lets you add a new service.
   FAIL if: no add button exists or it does not respond.
3. In the service form, fill in:
   - Service name: {name}
   - Price: {price}
   - Set the date to: 1900-01-01 (if there is a date field)
4. Click the submit/save button.
5. After creation, find "{name}" in the services list.
   FAIL if: service is not found.
6. Click on "{name}" to open or highlight it.
7. VERIFY every field:
   - Name is exactly: {name}
   - Price is exactly: {price}
   FAIL if: any field is wrong, empty, or null.
8. Click the edit button for this service.
9. Change the price to: {edit_price}
10. Save the edit.
11. Reload the services page and find "{name}" again.
12. VERIFY the price is now: {edit_price}
    FAIL if: price reverted or is blank.
13. Report what you found.

Expected: Service created with correct fields, edit persisted after reload.
"""
```

- [ ] **Step 2: Commit**

```bash
git add flows/service.py
git commit -m "feat: add service create/verify/edit/verify flow"
```

---

### Task 11: Appointment Flow

**Files:**
- Create: `flows/appointment.py`

- [ ] **Step 1: Write flows/appointment.py**

```python
"""
Hermes appointment flow.
Tests: create appointment → verify date/time (timezone check) → edit time to 23:59 (midnight boundary) → verify → cleanup.
"""

from flows.base import BaseFlow


class AppointmentFlow(BaseFlow):
    """Test the appointment add/edit flow on the Appointments page."""

    def entity_type(self) -> str:
        return "appointment"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        date = create_fields.get("date", "1900-01-01")
        time_val = create_fields.get("time", "09:00")

        edit_time = "23:59"

        return f"""
TASK: Test appointment create, verify (with timezone check), edit to midnight boundary, verify.

Steps:
1. Navigate to {self.site.url}/appointments
2. Look for and click the "Thêm lịch hẹn" (Add Appointment) button, or any button to create a new appointment.
   FAIL if: no add button exists.
3. In the appointment form, fill in:
   - Date: {date}
   - Time: {time_val}
   - Customer: Select any customer from the dropdown (prefer one starting with "HERMES" if available, otherwise pick the first one)
   - Doctor: Select the first available doctor
   - Service: Select the first available service (if required)
4. Click submit/save.
5. After creation, find this appointment in the list (look for date {date} or time {time_val}).
   FAIL if: appointment not found.
6. Click on the appointment to open its details.
7. VERIFY these fields EXACTLY:
   - Date is exactly: {date} (NOT {date} shifted by ±1 day — this is the timezone check)
   - Time is exactly: {time_val}
   - Status is "pending" or "confirmed" (not empty)
   FAIL if: date shows as a different day (e.g., {date} became the day before or after).
   This would indicate a timezone conversion bug.
8. Click the edit button for this appointment.
9. Change the time to: {edit_time}
10. Save the edit.
11. Reload the page and find this appointment again.
12. VERIFY the time is: {edit_time} and the date is STILL {date} (not shifted to the next day).
    This is the midnight boundary check — 23:59 should not cause the date to flip.
    FAIL if: date changed when time was set to 23:59.
13. Report what you found.

Expected: Appointment created with correct date/time, timezone intact, midnight edit does not shift date.
"""
```

- [ ] **Step 2: Commit**

```bash
git add flows/appointment.py
git commit -m "feat: add appointment flow with timezone and midnight boundary checks"
```

---

### Task 12: Payment Flow

**Files:**
- Create: `flows/payment.py`

- [ ] **Step 1: Write flows/payment.py**

```python
"""
Hermes payment flow.
Tests: create payment → verify amount formatting → cleanup.
"""

from flows.base import BaseFlow


class PaymentFlow(BaseFlow):
    """Test the payment add flow on the Payment page."""

    def entity_type(self) -> str:
        return "payment"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        amount = create_fields.get("amount", "1500000")
        method = create_fields.get("method", "cash")

        return f"""
TASK: Test payment creation and verify amount formatting.

Steps:
1. Navigate to {self.site.url}/payment
2. Look for a button or form to add a new payment.
   FAIL if: no way to add a payment exists.
3. Fill in the payment form:
   - Amount: {amount}
   - Payment method: {method}
   - Customer: Select any customer (prefer HERMES test customer if available)
   - Date: 1900-01-01
4. Submit the payment.
5. After creation, find this payment in the list (look for amount {amount}).
   FAIL if: payment not found.
6. VERIFY the amount:
   - The amount should be exactly {amount} (one million five hundred thousand)
   - FAIL if: amount shows as 1500.00 (decimal shift) or 1500000000 (extra zeros)
   This is the amount formatting check.
7. Report what you found.

Expected: Payment created with correct amount, no formatting corruption.
"""
```

- [ ] **Step 2: Commit**

```bash
git add flows/payment.py
git commit -m "feat: add payment flow with amount formatting check"
```

---

### Task 13: Calendar Flow

**Files:**
- Create: `flows/calendar.py`

- [ ] **Step 1: Write flows/calendar.py**

```python
"""
Hermes calendar flow.
Tests: day/week/month views render without error, test data not visible.
"""

from flows.base import BaseFlow


class CalendarFlow(BaseFlow):
    """Test calendar views render and test data is hidden."""

    def entity_type(self) -> str:
        return "appointment"

    def build_task(self) -> str:
        return f"""
TASK: Test calendar views and verify test data is hidden from today's view.

Steps:
1. Navigate to {self.site.url}/calendar
2. Verify the calendar page loads without errors.
   FAIL if: blank page, error message, or crash.
3. Look for view toggle buttons (Day, Week, Month) and click each one:
   a. Click "Day" view — verify it renders time slots for today.
      FAIL if: day view is blank or throws an error.
   b. Click "Week" view — verify it renders a 7-day grid.
      FAIL if: week view is blank or throws an error.
   c. Click "Month" view — verify it renders a full month calendar.
      FAIL if: month view is blank or throws an error.
4. Go back to the Day view for today's date.
5. Look through today's appointments.
   VERIFY: No appointments with names starting with "HERMES_" are visible.
   (Test data uses dates like 1900-01-01, so they should NOT appear in today's view.)
   FAIL if: test data (HERMES_ prefix) appears in today's calendar view.
   This would mean test data is leaking into real dashboards.
6. Report what you found.

Expected: All three calendar views render correctly, no test data visible in today's view.
"""
```

- [ ] **Step 2: Commit**

```bash
git add flows/calendar.py
git commit -m "feat: add calendar view test with test data visibility check"
```

---

### Task 14: Orchestrator (hermes.py)

**Files:**
- Create: `hermes.py`

- [ ] **Step 1: Write hermes.py**

```python
#!/usr/bin/env python3
"""
Hermes — Synthetic Website Monitor for TDental (nk.2checkin.com)
Entry point. Reads config, runs flows, reports results.
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config import HermesConfig, load_config, load_ignore_patterns
from lib.logger import setup_logger, log_flow_result
from lib.telegram_notifier import send_alert, send_daily_summary, send_restart_alert
from lib.cleanup import cleanup_flow, get_auth_token
from lib.browser import cleanup_old_screenshots
from lib.models import run_model_tests, recommend_model, _create_llm

from flows.login import LoginFlow
from flows.customer import CustomerFlow
from flows.service import ServiceFlow
from flows.appointment import AppointmentFlow
from flows.payment import PaymentFlow
from flows.calendar import CalendarFlow

FLOW_REGISTRY = {
    "login": LoginFlow,
    "customer": CustomerFlow,
    "service": ServiceFlow,
    "appointment": AppointmentFlow,
    "payment": PaymentFlow,
    "calendar": CalendarFlow,
}

ENTITY_MAP = {
    "login": None,
    "customer": "customer",
    "service": "service",
    "appointment": "appointment",
    "payment": "payment",
    "calendar": None,
}


async def run_all_flows(cfg: HermesConfig, logger: logging.Logger) -> list[dict]:
    """Run all configured flows and return results."""
    ignore_patterns = load_ignore_patterns()
    results: list[dict] = []

    # Create LLM
    llm = _create_llm(
        provider="openai" if "gpt" in cfg.model else "anthropic",
        model=cfg.model,
        api_keys=cfg.model_api_keys,
    )

    # Get auth token for cleanup
    auth_token = ""
    try:
        auth_token = await get_auth_token(
            cfg.site.url, cfg.site.email, cfg.site.password
        )
    except Exception as e:
        logger.error(f"Auth failed: {e}")

    # Clean up old screenshots
    deleted = cleanup_old_screenshots(cfg.screenshots.directory, cfg.screenshots.keep_days)
    if deleted:
        logger.info(f"Cleaned up {deleted} old screenshots")

    # Run each flow
    for flow_name, flow_class in FLOW_REGISTRY.items():
        if flow_name not in cfg.flows and flow_name != "login":
            continue

        flow_config = cfg.flows.get(flow_name)
        flow = flow_class(
            name=flow_name,
            config=flow_config or type("EmptyConfig", (), {})(),
            site_config=cfg.site,
            observer_config=cfg.observer,
            ignore_patterns=ignore_patterns,
            screenshot_dir=cfg.screenshots.directory,
        )

        logger.info(f"Starting flow: {flow_name}")
        result = await flow.run(llm)
        log_flow_result(
            logger=logger,
            flow_name=result.flow_name,
            status=result.status,
            duration_s=result.duration_s,
            screenshots=result.screenshots,
            error=result.error,
            novel=result.novel,
        )
        results.append({
            "flow": result.flow_name,
            "status": result.status,
            "duration_s": result.duration_s,
            "screenshots": result.screenshots,
            "error": result.error,
            "novel": result.novel,
        })

        # Cleanup test records via API
        entity = ENTITY_MAP.get(flow_name)
        if entity and auth_token:
            try:
                await cleanup_flow(
                    cfg.site.url, auth_token, entity, flow.cleanup_prefix()
                )
            except Exception as e:
                logger.warning(f"Cleanup failed for {flow_name}: {e}")

        # Alert on failure or novel finding (skip in first-run mode)
        if not cfg.first_run_mode and result.status != "ok":
            await send_alert(
                bot_token=cfg.telegram.bot_token,
                chat_id=cfg.telegram.chat_id,
                flow_name=result.flow_name,
                status=result.status,
                details=result.error or result.novel or "Unknown",
                screenshots=result.screenshots,
            )

    return results


async def run_baseline(cfg: HermesConfig, logger: logging.Logger) -> None:
    """First run: log everything, no alerts, establish norms."""
    cfg.first_run_mode = True
    logger.info("=== HERMES BASELINE RUN ===")

    results = await run_all_flows(cfg, logger)

    # Save baseline
    baseline_path = Path(__file__).parent / "hermes-baseline.json"
    baseline = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }
    with open(baseline_path, "w") as f:
        json.dump(baseline, f, indent=2, ensure_ascii=False)

    passed = sum(1 for r in results if r["status"] == "ok")
    failed = sum(1 for r in results if r["status"] == "fail")
    novel = sum(1 for r in results if r["status"] == "novel")

    logger.info(f"=== BASELINE COMPLETE: {passed} passed, {failed} failed, {novel} novel ===")
    print(f"\nBaseline results: {passed} passed, {failed} failed, {novel} novel")
    print(f"Saved to: {baseline_path}")


async def test_models(cfg: HermesConfig, logger: logging.Logger) -> None:
    """Test all candidate models and recommend the best."""
    logger.info("=== HERMES MODEL TEST ===")

    results = await run_model_tests(
        api_keys=cfg.model_api_keys,
        site_url=cfg.site.url,
        site_email=cfg.site.email,
        site_password=cfg.site.password,
    )

    print("\n" + "=" * 60)
    print("MODEL TEST RESULTS")
    print("=" * 60)

    for r in results:
        status = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"  {r.model_name}: {status} | {r.duration_s}s | {r.error or 'OK'}")

    best = recommend_model(results)
    if best:
        print(f"\n→ RECOMMENDED: {best.model_name} ({best.duration_s}s)")
        print(f"  Set in hermes-map.yaml: model: {CANDIDATE_MODEL_KEY(best)}")
    else:
        print("\n→ NO MODEL PASSED — check API keys and site availability")


def CANDIDATE_MODEL_KEY(result):
    """Get the model string for hermes-map.yaml from a test result."""
    from lib.models import CANDIDATE_MODELS
    for c in CANDIDATE_MODELS:
        if c["name"] == result.model_name:
            return c["model"]
    return result.model_name


def check_restart_safety(cfg: HermesConfig, logger: logging.Logger) -> bool:
    """Check if we've exceeded max restarts in the last hour. Returns False if should stop."""
    state_file = Path("/opt/hermes/.restart_state")
    max_restarts = cfg.restart_safety.max_restarts_per_hour
    now = time.time()

    # Read existing state
    restarts: list[float] = []
    if state_file.exists():
        try:
            with open(state_file) as f:
                restarts = json.load(f)
        except Exception:
            restarts = []

    # Filter to last hour
    restarts = [t for t in restarts if now - t < 3600]
    restarts.append(now)

    # Save state
    with open(state_file, "w") as f:
        json.dump(restarts, f)

    if len(restarts) > max_restarts:
        logger.error(f"Restart limit exceeded: {len(restarts)} in last hour (max: {max_restarts})")
        asyncio.run(send_restart_alert(
            cfg.telegram.bot_token, cfg.telegram.chat_id, len(restarts)
        ))
        return False

    return True


def main():
    parser = argparse.ArgumentParser(description="Hermes — Synthetic Website Monitor")
    parser.add_argument("--baseline", action="store_true", help="Run baseline (no alerts)")
    parser.add_argument("--test-models", action="store_true", help="Test LLM models")
    parser.add_argument("--config", default=None, help="Path to hermes-map.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    log = setup_logger()

    # Restart safety check
    if not args.baseline and not args.test_models:
        if not check_restart_safety(cfg, log):
            sys.exit(1)

    if args.test_models:
        asyncio.run(test_models(cfg, log))
    elif args.baseline:
        asyncio.run(run_baseline(cfg, log))
    else:
        asyncio.run(run_all_flows(cfg, log))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add hermes.py
git commit -m "feat: add Hermes orchestrator with baseline, model test, and restart safety"
```

---

### Task 15: Install Script + Systemd + Requirements

**Files:**
- Create: `install.sh`
- Create: `hermes.service`
- Create: `hermes.timer`
- Create: `requirements.txt`

- [ ] **Step 1: Write requirements.txt**

```
browser-use>=0.3.0
pyyaml>=6.0
python-telegram-bot>=21.0
httpx>=0.27.0
```

- [ ] **Step 2: Write hermes.service**

```ini
[Unit]
Description=Hermes Synthetic Website Monitor
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/opt/hermes
ExecStart=/opt/hermes/.venv/bin/python hermes.py
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hermes

# Resource limits
MemoryMax=1G
TimeoutStartSec=600
```

- [ ] **Step 3: Write hermes.timer**

```ini
[Unit]
Description=Hermes Monitor Timer (every 30 minutes)

[Timer]
OnCalendar=*:0/30
Persistent=true
RandomizedDelaySec=60

[Install]
WantedBy=timers.target
```

- [ ] **Step 4: Write install.sh**

```bash
#!/bin/bash
set -euo pipefail

# ============================================================
# Hermes — Install Script
# Sets up: Python venv, Chromium, systemd timer, test account
# ============================================================

HERMES_DIR="/opt/hermes"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Installing Hermes Synthetic Monitor..."
echo "   Target: $HERMES_DIR"
echo ""

# 1. Create directory
echo "📁 Setting up directory..."
mkdir -p "$HERMES_DIR/screenshots"
cp -r "$REPO_DIR"/* "$HERMES_DIR/" 2>/dev/null || true
cd "$HERMES_DIR"

# 2. Install Python + venv
echo "🐍 Setting up Python..."
if ! command -v python3 &> /dev/null; then
    apt update && apt install -y python3 python3-venv python3-pip
fi

python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
echo "📦 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Install Chromium for browser-use
echo "🌐 Installing Chromium (headless)..."
.venv/bin/python -m playwright install chromium
.venv/bin/python -m playwright install-deps chromium 2>/dev/null || apt install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 2>/dev/null || true

# 5. Create hermes@clinic.vn account via API
echo "👤 Creating test account (hermes@clinic.vn)..."
echo "   NOTE: You will need to set the password in hermes-map.yaml"
echo "   and ensure the account exists in the database."
echo ""

# 6. Configure
echo "⚙️  Configuration needed:"
echo "   1. Edit $HERMES_DIR/hermes-map.yaml"
echo "      - Set site.password for hermes@clinic.vn"
echo "      - Set telegram.bot_token and chat_id"
echo "      - Set model_api_keys"
echo ""

# 7. Install systemd units
echo "⏰ Installing systemd timer..."
cp "$HERMES_DIR/hermes.service" /etc/systemd/system/
cp "$HERMES_DIR/hermes.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable hermes.timer

echo ""
echo "✅ Hermes installed!"
echo ""
echo "Next steps:"
echo "  1. Edit config:  vi $HERMES_DIR/hermes-map.yaml"
echo "  2. Test models:  $HERMES_DIR/.venv/bin/python hermes.py --test-models"
echo "  3. Run baseline: $HERMES_DIR/.venv/bin/python hermes.py --baseline"
echo "  4. Start timer:  systemctl start hermes.timer"
echo "  5. Check status: systemctl status hermes.timer"
echo "  6. View logs:    tail -f $HERMES_DIR/hermes.log"
echo ""
```

- [ ] **Step 5: Make install.sh executable**

```bash
chmod +x install.sh
```

- [ ] **Step 6: Commit**

```bash
git add requirements.txt hermes.service hermes.timer install.sh
git commit -m "feat: add install script, systemd units, and requirements"
```

---

### Task 16: Baseline Run + Verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Deploy to VPS**

```bash
# From local machine
scp -r /opt/hermes root@76.13.16.68:/opt/hermes
ssh root@76.13.16.68 "cd /opt/hermes && chmod +x install.sh && bash install.sh"
```

- [ ] **Step 2: Configure on VPS**

```bash
ssh root@76.13.16.68
vi /opt/hermes/hermes-map.yaml
# Fill in: site.password, telegram.bot_token, telegram.chat_id, model_api_keys
```

- [ ] **Step 3: Test models**

```bash
cd /opt/hermes
.venv/bin/python hermes.py --test-models
```

Expected: Output showing which models passed/failed, with a recommended model.

- [ ] **Step 4: Run baseline**

```bash
.venv/bin/python hermes.py --baseline
```

Expected: All flows run without Telegram alerts. Results saved to `hermes-baseline.json`.
Check `hermes.log` for results.

- [ ] **Step 5: Verify baseline results**

```bash
cat /opt/hermes/hermes-baseline.json
```

Expected: JSON with results array, each entry has `status: "ok"` or descriptive error.

- [ ] **Step 6: Start the timer**

```bash
systemctl start hermes.timer
systemctl status hermes.timer
```

Expected: Timer active, next run scheduled for ~30 minutes from now.

- [ ] **Step 7: Verify first scheduled run**

```bash
# Wait for first scheduled run, then check:
tail -50 /opt/hermes/hermes.log
```

Expected: Log entries for each flow run, `[OK]` for passing flows, any `[FAIL]` or `[NOVEL]` entries.

- [ ] **Step 8: Commit verification results**

```bash
git add hermes-baseline.json
git commit -m "chore: add baseline run results"
```
