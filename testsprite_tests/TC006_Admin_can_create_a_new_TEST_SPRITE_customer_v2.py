"""
TC006 v2: Admin can create a new TEST_SPRITE customer - uses semantic selectors.
"""
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

TEST_NAME = f"TEST SPRITE {datetime.now().strftime('%Y%m%d%H%M%S')}"
TEST_EMAIL = f"testsprite.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"

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

        # Navigate to customers via sidebar link
        await page.goto("http://127.0.0.1:5175/customers")
        await page.wait_for_load_state("networkidle")

        # Click Add Customer - look for button with "Add Customer" or "Thêm"
        add_btn = page.locator("button:has-text('Add Customer')").first
        if await add_btn.count() == 0:
            add_btn = page.locator("button:has-text('Thêm')").first
        await add_btn.click()

        # Wait for modal/dialog
        await page.wait_for_selector("[role='dialog'], dialog, .modal, form", timeout=5000)

        # Fill form fields - find inputs by type/name
        name_input = page.locator("input[type='text']").first
        await name_input.fill(TEST_NAME)

        email_input = page.locator("input[type='email']").first
        await email_input.fill(TEST_EMAIL)

        phone_input = page.locator("input[type='tel']").first
        if await phone_input.count() > 0:
            await phone_input.fill("0900000000")

        # Select branch from dropdown if present
        selects = page.locator("select")
        if await selects.count() > 0:
            await selects.first.select_option(index=1)

        # Click Save
        save_btn = page.locator("button:has-text('Lưu')").last
        await save_btn.click()

        # Wait for save to complete
        await asyncio.sleep(2)

        # Search for created customer
        search = page.locator("input[type='text']").first
        await search.fill(TEST_NAME)
        await asyncio.sleep(1.5)

        # Verify customer appears in results
        content = await page.content()
        assert TEST_NAME in content, f"Customer '{TEST_NAME}' not found after creation"

        print(f"✅ TC006 PASS: Created customer '{TEST_NAME}' successfully")

    except Exception as e:
        print(f"❌ TC006 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
