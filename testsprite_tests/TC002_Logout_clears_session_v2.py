"""
TC002 v2: Logout clears session - rewritten with correct selectors from DOM inspection.
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

        # Click the avatar/logout button (sidebar collapsed mode: A button IS logout)
        # The button has text="A" and title="Đăng xuất" (logout in Vietnamese)
        logout_btn = page.locator('button[title="Đăng xuất"]').first
        if await logout_btn.count() == 0:
            # Fallback: find button with text "A" in sidebar
            logout_btn = page.locator("button:has-text('A')").first
        await logout_btn.click()

        # Wait for redirect to login
        await page.wait_for_url("**/login", timeout=10000)
        assert "/login" in page.url, f"Expected /login, got {page.url}"

        # Verify login form is visible
        login_btn = page.locator("button:has-text('Đăng nhập')")
        assert await login_btn.is_visible(), "Login button not visible after logout"

        print("✅ TC002 PASS: Logout cleared session, redirected to /login")

    except Exception as e:
        print(f"❌ TC002 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
