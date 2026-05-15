"""
TC016 v2: Payment page renders without submitting money actions.
Visits /payment and verifies the UI loads safely.
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

        # Navigate to payment
        await page.goto("http://127.0.0.1:5175/payment")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Verify page loaded
        assert "/payment" in page.url, f"Not on payment page: {page.url}"

        # Check for payment-related content
        page_text = await page.evaluate("() => document.body.innerText")
        has_payment_content = any(k in page_text for k in ["Thanh toán", "Payment", "Kế hoạch", "Plan", "deposit", "cọc"])
        assert has_payment_content, "Payment page content not found"

        print("✅ TC016 PASS: Payment page rendered safely")

    except Exception as e:
        print(f"❌ TC016 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
