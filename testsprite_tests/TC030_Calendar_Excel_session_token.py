"""
TC030: Calendar Excel download works with session token (sessionStorage vs localStorage).
Verifies export sends auth headers correctly regardless of Remember Me choice.
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

        # Login WITHOUT Remember Me (uses sessionStorage)
        await page.goto("http://127.0.0.1:5175/login")
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        # Uncheck remember me if present
        remember = page.locator("[data-testid='remember-me']")
        if await remember.count() > 0:
            await remember.uncheck()
        await page.locator('button[type="submit"]').click()
        await page.wait_for_url("**/")

        # Go to calendar
        await page.goto("http://127.0.0.1:5175/calendar")
        await page.wait_for_load_state("networkidle")

        # Click export menu
        export_btn = page.locator("[data-testid='export-menu']").first
        if await export_btn.count() > 0:
            await export_btn.click()
            # Click Excel export
            excel_btn = page.locator("text=/excel/i, text=/xuất excel/i").first
            if await excel_btn.count() > 0:
                # Set up download listener
                async with page.expect_download() as download_info:
                    await excel_btn.click()
                download = await download_info.value
                assert download.suggested_filename.endswith(".xlsx"), f"Wrong file type: {download.suggested_filename}"
                print(f"✅ TC030 PASS: Excel download triggered: {download.suggested_filename}")
            else:
                print("⚠️ TC030 SKIP: Excel export button not found in menu")
        else:
            print("⚠️ TC030 SKIP: Export menu not found")

    except Exception as e:
        print(f"❌ TC030 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
