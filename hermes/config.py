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
    model_api_base: str = ""
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
    cfg.model_api_base = raw.get("model_api_base", "")
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
