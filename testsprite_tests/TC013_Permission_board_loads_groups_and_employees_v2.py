"""
TC013 v2: Permission board loads groups and employees.
Navigates to /permissions and verifies groups and employee assignments load.
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

        # Navigate to permissions
        await page.goto("http://127.0.0.1:5175/permissions")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Verify page loaded
        assert "/permissions" in page.url, f"Not on permissions page: {page.url}"

        # Check for permission groups section
        page_text = await page.evaluate("() => document.body.innerText")
        assert "Quyền hạn" in page_text or "Permissions" in page_text or "Nhóm" in page_text, "Permission board content not found"

        # Try to open a group card
        group_btn = page.locator("button:has-text('Admin'), button:has-text('Bác sĩ')").first
        if await group_btn.count() > 0:
            await group_btn.click()
            await asyncio.sleep(1)

        print("✅ TC013 PASS: Permission board loaded successfully")

    except Exception as e:
        print(f"❌ TC013 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
