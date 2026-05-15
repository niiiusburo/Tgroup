"""
TC011 v2: Employee creation for TESTSPRITE employee - rewritten with robust selectors.
"""
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

TEST_NAME = f"TESTSPRITE EMP {datetime.now().strftime('%Y%m%d%H%M%S')}"

async def run_test():
    pw = None
    browser = None
    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True, args=["--window-size=1280,720"])
        context = await browser.new_context()
        context.set_default_timeout(15000)
        page = await context.new_page()

        # Login
        await page.goto("http://127.0.0.1:5175/login")
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        await page.locator('button[type="submit"]').click()
        await page.wait_for_url("**/", timeout=10000)

        # Navigate to employees
        await page.goto("http://127.0.0.1:5175/employees")
        await page.wait_for_load_state("networkidle")

        # Click Add Employee
        add_btn = page.locator("button:has-text('Thêm'), button:has-text('Add')").first
        await add_btn.click()

        # Wait for form/modal
        await page.wait_for_selector("dialog, [role='dialog'], form", timeout=5000)

        # Fill name
        name_input = page.locator("input[name='name'], input[placeholder*='tên' i]").first
        await name_input.fill(TEST_NAME)

        # Fill email
        email_input = page.locator("input[type='email'], input[name='email']").first
        await email_input.fill(f"{TEST_NAME.lower().replace(' ', '.')}@example.com")

        # Fill phone
        phone_input = page.locator("input[type='tel'], input[name='phone']").first
        if await phone_input.count() > 0:
            await phone_input.fill("0900000001")

        # Select role if exists
        role_select = page.locator("select").first
        if await role_select.count() > 0:
            await role_select.select_option(index=1)

        # Save
        save_btn = page.locator("button:has-text('Lưu'), button:has-text('Save'), button[type='submit']").last
        await save_btn.click()

        await asyncio.sleep(2)

        # Verify employee appears
        search = page.locator("input[placeholder*='tìm' i], input[placeholder*='search' i]").first
        if await search.count() > 0:
            await search.fill(TEST_NAME)
            await asyncio.sleep(1.5)

        page_content = await page.content()
        assert TEST_NAME in page_content, f"Employee '{TEST_NAME}' not found after creation"

        print(f"✅ TC011 PASS: Created employee '{TEST_NAME}' successfully")

    except Exception as e:
        print(f"❌ TC011 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
