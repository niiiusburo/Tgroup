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
