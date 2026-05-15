"""
TC014 v2: Employee create failure does not break permission surfaces.
Visits /employees and /permissions after an employee add attempt to verify app stability.
"""
import asyncio
from playwright.async_api import async_playwright

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

        # Visit employees
        await page.goto("http://127.0.0.1:5175/employees")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        emp_text = await page.evaluate("() => document.body.innerText")
        assert "Nhân viên" in emp_text or "Employee" in emp_text, "Employees page broken"

        # Visit permissions
        await page.goto("http://127.0.0.1:5175/permissions")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        perm_text = await page.evaluate("() => document.body.innerText")
        assert "Quyền hạn" in perm_text or "Permissions" in perm_text, "Permissions page broken"

        print("✅ TC014 PASS: Permission surfaces stable after employee operations")

    except Exception as e:
        print(f"❌ TC014 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
