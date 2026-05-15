"""
TC007 v2: Admin can edit the existing TEST SPRITE customer.
Searches for customer with phone 0983171153, edits notes field, saves, verifies.
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

        # Navigate to customers
        await page.goto("http://127.0.0.1:5175/customers")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # Search for customer by phone (use a known existing customer)
        search = page.locator("input[type='text']").first
        await search.fill("0918527682")
        await asyncio.sleep(2)

        # Click first customer row in the table
        row = page.locator("table tbody tr").first
        await row.click()
        await asyncio.sleep(1)

        # Click Edit button (top right of profile)
        edit_btn = page.locator("button:has-text('Edit')").first
        if await edit_btn.count() == 0:
            edit_btn = page.locator("button:has-text('Chỉnh sửa')").first
        await edit_btn.click()
        await asyncio.sleep(1)

        # Find and update Notes textarea
        textarea = page.locator("textarea").first
        await textarea.fill("Edited by TestSprite QA automation v2.")

        # Click Save / Update
        save_btn = page.locator("button:has-text('Save')").last
        if await save_btn.count() == 0:
            save_btn = page.locator("button:has-text('Lưu')").last
        if await save_btn.count() == 0:
            save_btn = page.locator("button:has-text('Cập nhật')").last
        await save_btn.click()
        await asyncio.sleep(2)

        # Verify updated text appears on the page
        page_text = await page.evaluate("() => document.body.innerText")
        assert "Edited by TestSprite QA automation v2" in page_text, "Updated note not found on page"

        print("✅ TC007 PASS: Customer edited successfully")

    except Exception as e:
        print(f"❌ TC007 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
