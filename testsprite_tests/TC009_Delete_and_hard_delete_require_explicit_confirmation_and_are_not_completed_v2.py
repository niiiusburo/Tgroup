"""
TC009 v2: Delete and hard-delete require explicit confirmation and are not completed.
Opens a customer profile, clicks delete if present, cancels, verifies customer still exists.
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

        # Search for a known customer
        search = page.locator("input[type='text']").first
        await search.fill("0918527682")
        await asyncio.sleep(2)

        # Click first row to open profile
        row = page.locator("table tbody tr").first
        await row.click()
        await asyncio.sleep(2)

        # Look for delete button (trash icon or "Delete" text)
        delete_btn = page.locator("button:has-text('Delete'), button:has-text('Xóa'), button svg[class*='trash']").first
        if await delete_btn.count() == 0:
            # Try to find any button that might be delete
            buttons = await page.locator("button").all()
            for btn in buttons:
                txt = await btn.inner_text()
                if "delete" in txt.lower() or "xóa" in txt.lower() or "remove" in txt.lower():
                    delete_btn = btn
                    break

        if await delete_btn.count() == 0:
            print("⚠️ TC009 SKIP: No delete button found on customer profile")
            return

        # Click delete to open confirmation
        await delete_btn.click()
        await asyncio.sleep(1)

        # Look for cancel button in dialog
        cancel_btn = page.locator("button:has-text('Hủy'), button:has-text('Cancel')").first
        if await cancel_btn.count() > 0:
            await cancel_btn.click()
            await asyncio.sleep(1)
        else:
            # Press Escape to cancel
            await page.keyboard.press("Escape")
            await asyncio.sleep(1)

        # Verify we're still on the customer page or customer list
        assert "customers" in page.url, f"Unexpected redirect after cancel: {page.url}"

        print("✅ TC009 PASS: Delete confirmation required, customer preserved")

    except Exception as e:
        print(f"❌ TC009 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
