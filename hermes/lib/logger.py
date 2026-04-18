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
