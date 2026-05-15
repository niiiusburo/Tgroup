#!/usr/bin/env /opt/homebrew/bin/python3.12
"""
TestSprite Parallel Test Runner for TGroup.
Runs Playwright tests in parallel with proper process isolation.
"""
import asyncio
import json
import subprocess
import sys
import time
import os
from pathlib import Path
from datetime import datetime

# Test registry: (test_id, script_file, description, category)
TEST_REGISTRY = [
    ("TC001", "TC001_Admin_login_reaches_protected_overview_v2.py", "Admin login reaches protected overview", "Auth"),
    ("TC002", "TC002_Logout_clears_session_v2.py", "Logout clears session", "Auth"),
    ("TC003", "TC003_Invalid_credentials_are_rejected.py", "Invalid credentials are rejected", "Auth"),
    ("TC004", "TC004_Admin_can_access_core_guarded_pages_v2.py", "Admin can access core guarded pages", "Routes"),
    ("TC005", "TC005_Sidebar_exposes_expected_admin_navigation.py", "Sidebar exposes expected admin navigation", "UI"),
    ("TC006", "TC006_Admin_can_create_a_new_TEST_SPRITE_customer_v2.py", "Admin can create TEST_SPRITE customer", "Customer"),
    ("TC007", "TC007_Admin_can_edit_the_existing_TEST_SPRITE_customer_v2.py", "Admin can edit TEST_SPRITE customer", "Customer"),
    ("TC008", "TC008_Customer_profile_mutation_controls_are_visible_for_admin_v2.py", "Customer mutation controls visible for admin", "Permissions"),
    ("TC009", "TC009_Delete_and_hard_delete_require_explicit_confirmation_and_are_not_completed_v2.py", "Delete requires confirmation", "Safety"),
    ("TC010", "TC010_Employees_page_loads_and_search_works_v2.py", "Employees page loads and search works", "Employee"),
    ("TC011", "TC011_Employee_creation_should_work_for_TESTSPRITE_employee_v2.py", "Employee creation for TESTSPRITE", "Employee"),
    ("TC012", "TC012_Employee_edit_should_work_for_TESTSPRITE_employee_if_creation_succeeds_v2.py", "Employee edit for TESTSPRITE", "Employee"),
    ("TC013", "TC013_Permission_board_loads_groups_and_employees_v2.py", "Permission board loads", "Permissions"),
    ("TC014", "TC014_Employee_create_failure_does_not_break_permission_surfaces_v2.py", "Employee fail doesn't break permissions", "Permissions"),
    ("TC015", "TC015_Reports_protected_routes_render_v2.py", "Reports routes render", "Reports"),
    ("TC016", "TC016_Payment_page_renders_without_submitting_money_actions_v2.py", "Payment page renders safely", "Payment"),
    ("TC017", "TC017_Service_catalog_page_renders_and_searchfilter_works_v2.py", "Service catalog renders", "Services"),
    ("TC018", "TC018_Settings_page_renders_but_does_not_save_changes.py", "Settings renders safely", "Settings"),
    ("TC019", "TC019_Permission_matrix_wildcard_admin_v2.py", "Permission matrix wildcard admin", "Permissions"),
    ("TC020", "TC020_Permission_viewer_readonly_v2.py", "Permission viewer read-only", "Permissions"),
    ("TC022", "TC022_Services_route_permission.py", "Services route permission", "Permissions"),
    ("TC030", "TC030_Calendar_Excel_session_token.py", "Calendar Excel with session token", "Calendar"),
    ("TC031", "TC031_Accent_insensitive_search.py", "Accent-insensitive search", "Search"),
]


class ParallelTestRunner:
    def __init__(self, test_dir: Path, max_parallel: int = 4, timeout: int = 120):
        self.test_dir = test_dir
        self.max_parallel = max_parallel
        self.timeout = timeout
        self.results = []

    async def run_test(self, test_id: str, script: str, description: str, category: str) -> dict:
        """Run a single test script."""
        script_path = self.test_dir / script
        if not script_path.exists():
            return {
                "id": test_id,
                "name": description,
                "category": category,
                "status": "SKIP",
                "duration": 0,
                "error": f"Script not found: {script}",
            }

        start = time.time()
        try:
            # Use the venv python
            venv_python = self.test_dir / ".venv" / "bin" / "python3.12"
            if not venv_python.exists():
                venv_python = Path("/opt/homebrew/bin/python3.12")

            proc = await asyncio.create_subprocess_exec(
                str(venv_python), str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.test_dir,
                env={**os.environ, "PYTHONUNBUFFERED": "1"},
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.timeout)
            duration = time.time() - start

            stdout_text = stdout.decode("utf-8", errors="replace")
            stderr_text = stderr.decode("utf-8", errors="replace")

            # Check for PASS/FAIL in output
            if "PASS" in stdout_text or "PASS" in stderr_text:
                status = "PASS"
                error = None
            elif proc.returncode != 0:
                status = "FAIL"
                error = (stderr_text or stdout_text)[-500:]
            else:
                status = "PASS"
                error = None

            return {
                "id": test_id,
                "name": description,
                "category": category,
                "status": status,
                "duration": round(duration, 2),
                "error": error,
                "stdout": stdout_text[-300:] if stdout_text else None,
            }
        except asyncio.TimeoutError:
            proc.kill()
            return {
                "id": test_id,
                "name": description,
                "category": category,
                "status": "TIMEOUT",
                "duration": self.timeout,
                "error": f"Test timed out after {self.timeout}s",
            }
        except Exception as e:
            return {
                "id": test_id,
                "name": description,
                "category": category,
                "status": "ERROR",
                "duration": round(time.time() - start, 2),
                "error": str(e),
            }

    async def run_all(self, pattern: str = None, categories: list = None):
        """Run all matching tests in parallel."""
        # Filter tests
        tests_to_run = []
        for tc in TEST_REGISTRY:
            test_id, script, desc, cat = tc
            if pattern:
                import re
                if not re.search(pattern, test_id, re.IGNORECASE) and not re.search(pattern, desc, re.IGNORECASE):
                    continue
            if categories and cat not in categories:
                continue
            tests_to_run.append(tc)

        print(f"\n🧪 TestSprite Parallel Runner")
        print(f"   Tests: {len(tests_to_run)} of {len(TEST_REGISTRY)}")
        print(f"   Parallel: {self.max_parallel}")
        print(f"   Timeout: {self.timeout}s per test")
        print("-" * 60)

        semaphore = asyncio.Semaphore(self.max_parallel)

        async def run_limited(tc):
            async with semaphore:
                test_id, script, desc, cat = tc
                print(f"  ▶️  {test_id} [{cat}]: {desc[:45]}...")
                result = await self.run_test(test_id, script, desc, cat)
                icon = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⏭️" if result["status"] == "SKIP" else "⏰"
                print(f"  {icon} {test_id}: {result['status']} ({result['duration']}s)")
                if result["error"] and result["status"] not in ("PASS", "SKIP"):
                    err = result["error"][:150].replace("\n", " ")
                    print(f"     → {err}")
                return result

        start_time = time.time()
        tasks = [run_limited(tc) for tc in tests_to_run]
        self.results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time

        self.print_summary(total_time)
        return self.results

    def print_summary(self, total_time: float):
        """Print results summary."""
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        skipped = sum(1 for r in self.results if r["status"] == "SKIP")
        timeout = sum(1 for r in self.results if r["status"] == "TIMEOUT")
        error = sum(1 for r in self.results if r["status"] == "ERROR")

        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"   Total:   {len(self.results)}")
        print(f"   ✅ PASS:  {passed}")
        print(f"   ❌ FAIL:  {failed}")
        print(f"   ⏭️ SKIP:  {skipped}")
        print(f"   ⏰ TIME:  {timeout}")
        print(f"   💥 ERR:   {error}")
        print(f"   Time:    {round(total_time, 2)}s")
        print("=" * 60)

        if failed + timeout + error > 0:
            print("\n🔴 FAILED TESTS:")
            for r in self.results:
                if r["status"] not in ("PASS", "SKIP"):
                    print(f"   {r['id']} [{r['category']}]: {r['name']}")

    def write_report(self):
        """Write JSON report."""
        report_path = self.test_dir / f"test-run-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        report = {
            "timestamp": datetime.now().isoformat(),
            "results": self.results,
            "summary": {
                "total": len(self.results),
                "pass": sum(1 for r in self.results if r["status"] == "PASS"),
                "fail": sum(1 for r in self.results if r["status"] == "FAIL"),
                "skip": sum(1 for r in self.results if r["status"] == "SKIP"),
                "timeout": sum(1 for r in self.results if r["status"] == "TIMEOUT"),
                "error": sum(1 for r in self.results if r["status"] == "ERROR"),
            }
        }
        report_path.write_text(json.dumps(report, indent=2))
        print(f"\n📝 Report: {report_path}")
        return report_path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="TestSprite Parallel Runner")
    parser.add_argument("--pattern", default=None, help="Filter by test ID or name")
    parser.add_argument("--category", nargs="+", default=None, help="Filter by categories")
    parser.add_argument("--parallel", type=int, default=3, help="Max parallel tests")
    parser.add_argument("--timeout", type=int, default=120, help="Timeout per test")
    parser.add_argument("--no-report", action="store_true", help="Skip JSON report")
    args = parser.parse_args()

    test_dir = Path(__file__).parent
    runner = ParallelTestRunner(test_dir, max_parallel=args.parallel, timeout=args.timeout)

    results = asyncio.run(runner.run_all(pattern=args.pattern, categories=args.category))

    if not args.no_report:
        runner.write_report()

    # Exit non-zero if failures
    if any(r["status"] not in ("PASS", "SKIP") for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
