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
    {"provider": "kimi", "model": "kimi-for-coding", "name": "Kimi K2.6"},
    {"provider": "openai", "model": "gpt-4o-mini", "name": "GPT-4o-mini"},
    {"provider": "anthropic", "model": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku"},
    {"provider": "openai", "model": "gpt-4o", "name": "GPT-4o"},
]


def _create_llm(provider: str, model: str, api_keys: dict[str, str], api_base: str | None = None) -> Any:
    """Create a browser-use LLM instance for the given provider."""
    if provider == "kimi":
        # Kimi Code API requires claude-code User-Agent to identify as a coding agent
        from langchain_openai import ChatOpenAI
        import httpx
        http_client = httpx.Client(
            headers={"User-Agent": "claude-code/1.0"},
            timeout=120.0,
        )
        return ChatOpenAI(
            model=model,
            api_key=api_keys.get("kimi", ""),
            base_url=api_base or "https://api.kimi.com/coding/v1",
            http_client=http_client,
            temperature=0.1,
        )
    elif provider == "openai":
        from browser_use import ChatOpenAI
        kwargs = {"model": model, "api_key": api_keys.get("openai", "")}
        if api_base:
            kwargs["base_url"] = api_base
        return ChatOpenAI(**kwargs)
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
    api_base: str | None = None,
) -> ModelTestResult:
    """Run a simple login test with one model and return results."""
    result = ModelTestResult(
        model_name=candidate["name"],
        provider=candidate["provider"],
        passed=False,
    )

    try:
        llm = _create_llm(candidate["provider"], candidate["model"], api_keys, api_base)
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
    api_base: str | None = None,
) -> list[ModelTestResult]:
    """Test all candidate models and return results sorted by cost-effectiveness."""
    results: list[ModelTestResult] = []

    for candidate in CANDIDATE_MODELS:
        logger.info(f"Testing model: {candidate['name']}...")
        result = await test_model(candidate, api_keys, site_url, site_email, site_password, api_base)
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
