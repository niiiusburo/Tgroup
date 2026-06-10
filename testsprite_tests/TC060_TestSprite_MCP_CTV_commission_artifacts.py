#!/usr/bin/env /opt/homebrew/bin/python3.12
"""
TC060: TestSprite MCP CTV commission artifact integrity.

This is a fast repo-local guard for NK3. It verifies that the TestSprite MCP
configuration, source-grounded CTV commission PRD, TestSprite-style runner, live
results, report, and screenshot evidence are present and internally consistent.
It does not mutate live data and it does not print credentials.
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEST_DIR = ROOT / "testsprite_tests"
CTV_DIR = TEST_DIR / "ctv_commission"


def load_json(path: Path):
    assert path.exists(), f"missing JSON file: {path.relative_to(ROOT)}"
    return json.loads(path.read_text(encoding="utf-8"))


def assert_png(path: Path) -> None:
    assert path.exists(), f"missing screenshot: {path.relative_to(ROOT)}"
    assert path.stat().st_size > 1024, f"screenshot too small: {path.relative_to(ROOT)}"
    with path.open("rb") as handle:
        assert handle.read(8) == b"\x89PNG\r\n\x1a\n", f"not a PNG: {path.relative_to(ROOT)}"


def assert_nonempty_plan(path: Path) -> None:
    plan = load_json(path)
    assert isinstance(plan, list), f"plan is not a list: {path.relative_to(ROOT)}"
    assert len(plan) > 0, f"plan is empty: {path.relative_to(ROOT)}"


def main() -> None:
    config = load_json(ROOT / "website" / ".testsprite" / "config.json")
    frontend = config.get("frontend") or {}
    settings = config.get("testSettings") or {}
    scopes = set(config.get("scopes") or [])

    assert config.get("projectName") == "tgclinic-website", "unexpected TestSprite projectName"
    assert frontend.get("baseUrl") == "https://tmv.2checkin.com", "TestSprite baseUrl must stay NK3 TMV"
    assert settings.get("needLogin") is True, "TestSprite config must require login"
    assert (settings.get("loginCredential") or {}).get("email") == "t@clinic.vn", "unexpected login email"
    assert {"ctv-portal", "commission-tracking", "cosmetic-lob"}.issubset(scopes), "missing CTV/commission scopes"

    prd = load_json(TEST_DIR / "standard_prd_ctv_commission.json")
    meta = prd.get("meta") or {}
    assert meta.get("target_url") == "https://tmv.2checkin.com", "CTV PRD target must stay NK3 TMV"
    assert "CTV Referral" in meta.get("project", ""), "CTV PRD project metadata missing"
    assert len(prd.get("features") or []) >= 8, "CTV PRD should cover the W1-W8 delivery"

    for rel in ["run.mjs", "tests.mjs", "lib.mjs", "verify_ui.mjs", "REPORT.md", "results.json"]:
        assert (CTV_DIR / rel).exists(), f"missing CTV suite artifact: ctv_commission/{rel}"

    results_doc = load_json(CTV_DIR / "results.json")
    results = results_doc.get("results") or []
    assert results_doc.get("base") == "https://tmv.2checkin.com", "results target must stay NK3 TMV"
    assert results_doc.get("mutations") is True, "latest proof should include gated mutating happy paths"
    assert len(results) >= 31, "expected the full CTV commission result set"
    failed = [r for r in results if r.get("status") == "fail"]
    assert not failed, f"CTV commission results contain failures: {[r.get('id') for r in failed]}"

    by_id = {r.get("id"): r for r in results}
    required_passes = {
        "AUTH-1",
        "W1-API-4",
        "W1-UI-1",
        "W2-API-5",
        "W4-UI-1",
        "W6-API-3",
        "W7-UI-1",
        "W8-API-1",
    }
    missing = sorted(required_passes.difference(by_id))
    assert not missing, f"missing required result ids: {missing}"
    not_pass = sorted(rid for rid in required_passes if by_id[rid].get("status") != "pass")
    assert not not_pass, f"required result ids did not pass: {not_pass}"

    report = (CTV_DIR / "REPORT.md").read_text(encoding="utf-8")
    assert "31 / 31 pass" in report or "31 pass" in report, "report does not show the full green run"
    assert "Production data clean" in report, "report must include production cleanup proof"
    assert "X-LOB" in report, "report must preserve the known X-LOB caveat"

    for shot in ["ctv_join.png", "commission_payouts.png", "commission_ctv.png", "payment.png"]:
        assert_png(CTV_DIR / "shots" / shot)

    assert_nonempty_plan(TEST_DIR / "testsprite_frontend_test_plan.json")
    assert_nonempty_plan(ROOT / "website" / "testsprite_tests" / "testsprite_frontend_test_plan.json")

    print("PASS TC060: TestSprite MCP CTV commission artifacts/config/results/screenshots are valid for NK3")


if __name__ == "__main__":
    main()
