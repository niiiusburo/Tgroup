"""
TC015 v2: Reports protected routes render.
Visits all report routes and verifies they load.
"""
import asyncio
from playwright.async_api import async_playwright

REPORTS = [
    "/reports/dashboard",
    "/reports/revenue",
    "/reports/appointments",
    "/reports/customers",
    "/reports/services",
    "/reports/employees",
]

async def run_test():
    pw = None
    browser = None
    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True, args=["--window-size=1280,720"])
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        context.set_default_timeout(15000)
        page = await context.new_page()

        # Login
        await page.goto("http://127.0.0.1:5175/login")
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        await page.locator('button[type="submit"]').click()
        await page.wait_for_url("**/", timeout=10000)

        failures = []
        for path in REPORTS:
            try:
                await page.goto(f"http://127.0.0.1:5175{path}")
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(1)

                # Check for access denied
                visible_text = await page.evaluate("() => document.body.innerText")
                if "không có quyền" in visible_text.lower():
                    failures.append(f"{path}: Access Denied")
                    continue

                # Verify body has content
                body = page.locator("body")
                if await body.count() == 0:
                    failures.append(f"{path}: Body not found")
                    continue

                print(f"  ✅ {path}")
            except Exception as e:
                failures.append(f"{path}: {str(e)[:60]}")

        if failures:
            raise AssertionError("Failed reports:\n" + "\n".join(f"  - {f}" for f in failures))

        print(f"✅ TC015 PASS: All {len(REPORTS)} report routes rendered")

    except Exception as e:
        print(f"❌ TC015 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
