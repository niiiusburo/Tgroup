#!/usr/bin/env /opt/homebrew/bin/python3.12
"""
TestSprite Test Suite Runner for TGroup project.
Runs existing Playwright-based test scripts and reports results.
Usage: python3.12 run_testsprite_suite.py [--local|--live] [test_pattern]
"""

import asyncio
import argparse
import json
import subprocess
import sys
import time
import os
from pathlib import Path
from datetime import datetime

# Test definitions from testbright.md pending items + existing TC scripts
EXISTING_TESTS = [
    ("TC001", "TC001_Admin_login_reaches_protected_overview.py", "Admin login reaches protected overview"),
    ("TC002", "TC002_Logout_clears_session.py", "Logout clears session"),
    ("TC003", "TC003_Invalid_credentials_are_rejected.py", "Invalid credentials are rejected"),
    ("TC004", "TC004_Admin_can_access_core_guarded_pages.py", "Admin can access core guarded pages"),
    ("TC005", "TC005_Sidebar_exposes_expected_admin_navigation.py", "Sidebar exposes expected admin navigation"),
    ("TC006", "TC006_Admin_can_create_a_new_TEST_SPRITE_customer.py", "Admin can create a new TEST_SPRITE customer"),
    ("TC007", "TC007_Admin_can_edit_the_existing_TEST_SPRITE_customer.py", "Admin can edit the existing TEST_SPRITE customer"),
    ("TC008", "TC008_Customer_profile_mutation_controls_are_visible_for_admin.py", "Customer profile mutation controls are visible for admin"),
    ("TC009", "TC009_Delete_and_hard_delete_require_explicit_confirmation_and_are_not_completed.py", "Delete and hard delete require explicit confirmation"),
    ("TC010", "TC010_Employees_page_loads_and_search_works.py", "Employees page loads and search works"),
    ("TC011", "TC011_Employee_creation_should_work_for_TESTSPRITE_employee.py", "Employee creation should work for TESTSPRITE employee"),
    ("TC012", "TC012_Employee_edit_should_work_for_TESTSPRITE_employee_if_creation_succeeds.py", "Employee edit should work for TESTSPRITE employee"),
    ("TC013", "TC013_Permission_board_loads_groups_and_employees.py", "Permission board loads groups and employees"),
    ("TC014", "TC014_Employee_create_failure_does_not_break_permission_surfaces.py", "Employee create failure does not break permission surfaces"),
    ("TC015", "TC015_Reports_protected_routes_render.py", "Reports protected routes render"),
    ("TC016", "TC016_Payment_page_renders_without_submitting_money_actions.py", "Payment page renders without submitting money actions"),
    ("TC017", "TC017_Service_catalog_page_renders_and_searchfilter_works.py", "Service catalog page renders and search/filter works"),
    ("TC018", "TC018_Settings_page_renders_but_does_not_save_changes.py", "Settings page renders but does not save changes"),
]

# Pending tests from testbright.md that need new scripts
PENDING_TESTS = [
    ("TC019", "Permission matrix full audit - wildcard admin sees all"),
    ("TC020", "Permission viewer read-only - toggles disabled"),
    ("TC021", "Auth.me vs Permissions.resolve parity check"),
    ("TC022", "Services route uses correct permission string"),
    ("TC023", "Hosoonline create vs upload permission split"),
    ("TC024", "Export permissions appear in matrix"),
    ("TC025", "Failed permission update shows error without corruption"),
    ("TC026", "Location-scoped employee card shows branches"),
    ("TC027", "Reports Export Center - appointments preview/download"),
    ("TC028", "Reports Export Center - deposits preview/download"),
    ("TC029", "Reports Export Center - revenue flat export"),
    ("TC030", "Calendar Excel download with session token"),
    ("TC031", "Accent-insensitive search across all surfaces"),
    ("TC032", "Face ID quality gate - low quality keeps modal open"),
    ("TC033", "Today's Services activity feed shows real data"),
    ("TC034", "Payment receipt confirmation - dentist can confirm"),
    ("TC035", "Payment receipt confirmation - admin blocked"),
    ("TC036", "Cash flow summary - confirmed + unconfirmed = moneyIn"),
    ("TC037", "Old payment system - deposit top-up in deposit section"),
    ("TC038", "Old payment system - void with admin/super admin"),
    ("TC039", "Overview wait timer - arrival timestamp correct"),
    ("TC040", "Customer appointment start time from date column"),
    ("TC041", "Appointment export preserves timestamp"),
    ("TC042", "Staff selector clear option emits null"),
    ("TC043", "Customer payment identity reconciliation"),
    ("TC044", "Customer service paid total reconciliation"),
    ("TC045", "Employee sales export payment reconciliation"),
    ("TC046", "Face recognition live enrollment diagnostics"),
    ("TC047", "Face ID guided no-match enrollment"),
    ("TC048", "Guided face profile capture - 3 angles"),
    ("TC049", "Customer initial load performance"),
]


class TestSpriteRunner:
    def __init__(self, mode="local", target_url="http://127.0.0.1:5175"):
        self.mode = mode
        self.target_url = target_url
        self.results = []
        self.start_time = None
        self.test_dir = Path(__file__).parent

    def check_servers(self):
        """Check if target servers are reachable."""
        import urllib.request
        try:
            req = urllib.request.Request(self.target_url, method='HEAD')
            req.add_header('User-Agent', 'TestSprite/1.0')
            urllib.request.urlopen(req, timeout=5)
            return True
        except Exception as e:
            print(f"⚠️  Server check failed: {e}")
            return False

    def start_servers(self):
        """Start API and frontend dev servers."""
        print("🚀 Starting dev servers...")
        
        # Start API server
        api_dir = self.test_dir.parent / "api"
        self.api_proc = subprocess.Popen(
            ["npm", "start"],
            cwd=api_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        # Start frontend dev server
        web_dir = self.test_dir.parent / "website"
        self.web_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=web_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        # Wait for servers to be ready
        print("⏳ Waiting for servers to start...")
        for i in range(30):
            time.sleep(2)
            if self.check_servers():
                print(f"✅ Servers ready after {i*2}s")
                return True
            print(f"  ... still waiting ({i*2}s)")
        
        print("❌ Servers failed to start within 60s")
        return False

    def stop_servers(self):
        """Stop dev servers."""
        print("🛑 Stopping dev servers...")
        if hasattr(self, 'api_proc'):
            self.api_proc.terminate()
            try:
                self.api_proc.wait(timeout=5)
            except:
                self.api_proc.kill()
        if hasattr(self, 'web_proc'):
            self.web_proc.terminate()
            try:
                self.web_proc.wait(timeout=5)
            except:
                self.web_proc.kill()

    async def run_single_test(self, test_id, script_name, description):
        """Run a single Playwright test script."""
        script_path = self.test_dir / script_name
        if not script_path.exists():
            return {
                "id": test_id,
                "name": description,
                "status": "SKIP",
                "duration": 0,
                "error": f"Script not found: {script_name}",
            }

        start = time.time()
        try:
            proc = await asyncio.create_subprocess_exec(
                "/opt/homebrew/bin/python3.12", str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.test_dir,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            duration = time.time() - start
            
            if proc.returncode == 0:
                status = "PASS"
                error = None
            else:
                status = "FAIL"
                error = stderr.decode('utf-8', errors='replace')[-500:] if stderr else "Unknown error"
            
            return {
                "id": test_id,
                "name": description,
                "status": status,
                "duration": round(duration, 2),
                "error": error,
            }
        except asyncio.TimeoutError:
            proc.kill()
            return {
                "id": test_id,
                "name": description,
                "status": "TIMEOUT",
                "duration": 120,
                "error": "Test timed out after 120s",
            }
        except Exception as e:
            return {
                "id": test_id,
                "name": description,
                "status": "ERROR",
                "duration": round(time.time() - start, 2),
                "error": str(e),
            }

    async def run_all(self, pattern=None, max_parallel=3):
        """Run all matching tests with parallel limit."""
        self.start_time = time.time()
        
        # Filter tests by pattern
        tests_to_run = []
        for tc in EXISTING_TESTS:
            if pattern is None or pattern.lower() in tc[0].lower() or pattern.lower() in tc[2].lower():
                tests_to_run.append(tc)
        
        print(f"\n🧪 TestSprite Suite Runner")
        print(f"   Mode: {self.mode}")
        print(f"   Target: {self.target_url}")
        print(f"   Tests: {len(tests_to_run)} of {len(EXISTING_TESTS)} existing")
        print(f"   Parallel: {max_parallel}")
        print("-" * 60)
        
        # Run tests with semaphore for parallel limit
        semaphore = asyncio.Semaphore(max_parallel)
        
        async def run_with_limit(tc):
            async with semaphore:
                print(f"  ▶️  {tc[0]}: {tc[2][:50]}...")
                result = await self.run_single_test(tc[0], tc[1], tc[2])
                icon = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⏭️"
                print(f"  {icon} {tc[0]}: {result['status']} ({result['duration']}s)")
                if result["error"] and result["status"] != "PASS":
                    print(f"     Error: {result['error'][:200]}")
                return result
        
        tasks = [run_with_limit(tc) for tc in tests_to_run]
        self.results = await asyncio.gather(*tasks)
        
        total_time = time.time() - self.start_time
        self.print_summary(total_time)
        return self.results

    def print_summary(self, total_time):
        """Print test run summary."""
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
                    print(f"   {r['id']}: {r['name']}")
                    if r["error"]:
                        print(f"      → {r['error'][:150]}")

    def write_report(self):
        """Write JSON report to file."""
        report_path = self.test_dir / f"test-run-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        report = {
            "timestamp": datetime.now().isoformat(),
            "mode": self.mode,
            "target_url": self.target_url,
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
        print(f"\n📝 Report written to: {report_path}")
        return report_path


def main():
    parser = argparse.ArgumentParser(description="TestSprite Test Suite Runner")
    parser.add_argument("--mode", choices=["local", "live"], default="local",
                        help="Run against local dev or live site")
    parser.add_argument("--pattern", default=None,
                        help="Filter tests by ID or name pattern")
    parser.add_argument("--parallel", type=int, default=2,
                        help="Max parallel tests (default: 2)")
    parser.add_argument("--start-servers", action="store_true",
                        help="Auto-start API and frontend dev servers")
    parser.add_argument("--report", action="store_true", default=True,
                        help="Write JSON report")
    
    args = parser.parse_args()
    
    target = "http://127.0.0.1:5175" if args.mode == "local" else "https://nk.2checkin.com"
    runner = TestSpriteRunner(mode=args.mode, target_url=target)
    
    servers_started = False
    try:
        if args.mode == "local":
            if not runner.check_servers():
                if args.start_servers:
                    servers_started = runner.start_servers()
                    if not servers_started:
                        print("❌ Cannot start servers. Exiting.")
                        sys.exit(1)
                else:
                    print("⚠️  Local servers not running. Use --start-servers or start manually:")
                    print("   cd api && npm start")
                    print("   cd website && npm run dev")
                    print("\n   Or run with: python3.12 run_testsprite_suite.py --start-servers")
                    sys.exit(1)
        
        results = asyncio.run(runner.run_all(pattern=args.pattern, max_parallel=args.parallel))
        
        if args.report:
            runner.write_report()
        
        # Exit with non-zero if any failures
        if any(r["status"] not in ("PASS", "SKIP") for r in results):
            sys.exit(1)
            
    finally:
        if servers_started:
            runner.stop_servers()


if __name__ == "__main__":
    main()
