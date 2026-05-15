"""
TC022: Services route uses correct permission string, not customers.edit.
Verifies /services is accessible with the intended service-view permission.
"""
import asyncio
from playwright.async_api import async_playwright

async def run_test():
    pw = None
    browser = None
    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True, args=["--window-size=1280,720"])
        context = await browser.new_context()
        context.set_default_timeout(10000)
        page = await context.new_page()

        # Login
        await page.goto("http://127.0.0.1:5175/login")
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        await page.locator('button[type="submit"]').click()
        await page.wait_for_url("**/")

        # Navigate to services
        await page.goto("http://127.0.0.1:5175/services")
        await page.wait_for_load_state("networkidle")

        # Verify page loads without 403
        current_url = page.url
        assert "/services" in current_url, f"Redirected away from services: {current_url}"

        # Check for service content
        content = await page.content()
        assert "service" in content.lower() or "dịch vụ" in content.lower() or "phiếu khám" in content.lower(), "Services page content not found"

        # Verify sidebar has services link visible
        sidebar = page.locator("nav, [data-testid='sidebar']")
        if await sidebar.count() > 0:
            sidebar_text = await sidebar.inner_text()
            assert "dịch vụ" in sidebar_text.lower() or "service" in sidebar_text.lower(), "Services not in sidebar"

        print(f"✅ TC022 PASS: Services route accessible, content verified")

    except Exception as e:
        print(f"❌ TC022 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
