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
