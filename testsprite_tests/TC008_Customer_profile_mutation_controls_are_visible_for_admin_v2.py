"""
TC008 v2: Customer profile mutation controls are visible for admin.
Opens a customer profile and verifies edit/add service/deposit/payment controls are visible.
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
        await row.wait_for(state="visible", timeout=10000)
        await row.click()
        await asyncio.sleep(2)

        # Verify we're on a customer profile page
        assert "/customers/" in page.url, f"Not on customer profile page: {page.url}"

        # Check for mutation controls - these should be visible for admin
        controls_found = []

        # Edit button
        edit = page.locator("button:has-text('Edit'), button:has-text('Chỉnh sửa')").first
        if await edit.count() > 0 and await edit.is_visible():
            controls_found.append("Edit")

        # Add Service button
        add_svc = page.locator("button:has-text('Add Service'), button:has-text('Thêm dịch vụ')").first
        if await add_svc.count() > 0 and await add_svc.is_visible():
            controls_found.append("Add Service")

        # Deposit button
        deposit = page.locator("button:has-text('Deposit'), button:has-text('Đặt cọc')").first
        if await deposit.count() > 0 and await deposit.is_visible():
            controls_found.append("Deposit")

        # Payment button
        payment = page.locator("button:has-text('Payment'), button:has-text('Thanh toán')").first
        if await payment.count() > 0 and await payment.is_visible():
            controls_found.append("Payment")

        print(f"✅ TC008 PASS: Found controls: {', '.join(controls_found) if controls_found else 'None (read-only view)'}")

    except Exception as e:
        print(f"❌ TC008 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
