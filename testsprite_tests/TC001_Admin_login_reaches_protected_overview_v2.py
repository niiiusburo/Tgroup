"""
TC001 v2: Admin login reaches protected overview.
Logs in and verifies the dashboard/overview page loads with authenticated layout.
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

        # Navigate to login
        await page.goto("http://127.0.0.1:5175/login")

        # Fill credentials and submit
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        await page.locator('button[type="submit"]').click()

        # Wait for redirect to overview/dashboard
        await page.wait_for_url("**/", timeout=10000)
        assert "/login" not in page.url, f"Still on login page: {page.url}"

        # Wait a moment for page to fully render
        await asyncio.sleep(1)

        # Verify authenticated layout elements are visible
        # Sidebar should be present (may be collapsed on desktop)
        sidebar = page.locator("aside").first
        assert await sidebar.count() > 0, "Sidebar not found after login"

        # Check for expected dashboard content - "Tổng quan" (Overview) heading
        overview_heading = page.locator("text='Tổng quan'").first
        assert await overview_heading.is_visible(), "Overview heading not visible"

        # Verify user avatar/initials are present (indicates authenticated state)
        avatar = page.locator('button[title="Đăng xuất"]').first
        assert await avatar.count() > 0, "Logout button (avatar) not found - may not be authenticated"
        assert await avatar.is_visible(), "Logout button not visible"

        print("✅ TC001 PASS: Admin login successful, protected overview rendered")

    except Exception as e:
        print(f"❌ TC001 FAIL: {e}")
        raise
    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
