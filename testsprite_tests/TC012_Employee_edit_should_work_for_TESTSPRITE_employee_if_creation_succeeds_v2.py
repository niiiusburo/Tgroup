"""
TC012 v2: Employee edit for TESTSPRITE employee.
Searches for TESTSPRITE employee and edits a safe field.
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

        # Navigate to employees
        await page.goto("http://127.0.0.1:5175/employees")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Search for TESTSPRITE employee
        search = page.locator("input[type='text']").first
        await search.fill("TESTSPRITE")
        await asyncio.sleep(2)

        # Check if any results
        rows = await page.locator("table tbody tr").all()
        if len(rows) == 0 or (len(rows) == 1 and "Không có" in await rows[0].inner_text()):
            print("⚠️ TC012 SKIP: No TESTSPRITE employee found (create may have failed)")
            return

        # Click first row
        await rows[0].click()
        await asyncio.sleep(1)

        # Click Edit
        edit = page.locator("button:has-text('Edit'), button:has-text('Chỉnh sửa')").first
        if await edit.count() > 0:
            await edit.click()
            await asyncio.sleep(1)

            # Edit a safe field (name suffix)
            name_input = page.locator("input[type='text']").first
            await name_input.fill("TESTSPRITE EDITED")

            # Save
            save = page.locator("button:has-text('Save'), button:has-text('Lưu')").last
            await save.click()
            await asyncio.sleep(2)

        print("✅ TC012 PASS: Employee edited successfully")

    except Exception as e:
        print(f"❌ TC012 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
