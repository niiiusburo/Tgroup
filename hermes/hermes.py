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

    # Detect provider from model name
    if cfg.model.startswith("kimi"):
        provider = "kimi"
    elif "claude" in cfg.model.lower():
        provider = "anthropic"
    else:
        provider = "openai"

    # Create LLM
    llm = _create_llm(
        provider=provider,
        model=cfg.model,
        api_keys=cfg.model_api_keys,
        api_base=cfg.model_api_base if provider == "kimi" else None,
    )

    # Get auth token for cleanup (with retry for 429 rate limits)
    auth_token = ""
    for attempt in range(cfg.rate_limit.max_retries):
        try:
            auth_token = await get_auth_token(
                cfg.site.url, cfg.site.email, cfg.site.password
            )
            break
        except Exception as e:
            if "429" in str(e) and attempt < cfg.rate_limit.max_retries - 1:
                wait = cfg.rate_limit.retry_backoff * (attempt + 1)
                logger.warning(f"Auth rate limited (429), waiting {wait}s before retry {attempt + 1}/{cfg.rate_limit.max_retries}...")
                await asyncio.sleep(wait)
            else:
                logger.error(f"Auth failed: {e}")
                break

    # Clean up old screenshots
    deleted = cleanup_old_screenshots(cfg.screenshots.directory, cfg.screenshots.keep_days)
    if deleted:
        logger.info(f"Cleaned up {deleted} old screenshots")

    # Run each flow
    for i, (flow_name, flow_class) in enumerate(FLOW_REGISTRY.items()):
        if flow_name not in cfg.flows and flow_name != "login":
            continue

        # Delay between flows (skip before first flow)
        if i > 0 and cfg.rate_limit.delay_between_flows > 0:
            logger.info(f"Waiting {cfg.rate_limit.delay_between_flows}s between flows...")
            await asyncio.sleep(cfg.rate_limit.delay_between_flows)

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

    # Initial cooldown to avoid rate limits from previous runs
    cooldown = cfg.rate_limit.delay_between_flows
    logger.info(f"Initial cooldown: waiting {cooldown}s before first flow...")
    await asyncio.sleep(cooldown)

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
        api_base=cfg.model_api_base if cfg.model.startswith("kimi") else None,
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
