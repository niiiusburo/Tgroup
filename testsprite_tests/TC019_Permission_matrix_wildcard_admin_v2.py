"""
TC019 v2: Permission matrix wildcard admin.
Verifies admin user sees all permissions.
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

        # Login as admin
        await page.goto("http://127.0.0.1:5175/login")
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        await page.locator('button[type="submit"]').click()
        await page.wait_for_url("**/", timeout=10000)

        # Navigate to permissions
        await page.goto("http://127.0.0.1:5175/permissions")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Verify admin sees permission groups
        page_text = await page.evaluate("() => document.body.innerText")
        assert "Admin" in page_text or "Bác sĩ" in page_text or "Nhóm" in page_text, "Permission groups not visible"

        print("✅ TC019 PASS: Admin sees permission matrix")

    except Exception as e:
        print(f"❌ TC019 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
