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
