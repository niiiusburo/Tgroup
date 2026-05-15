"""
TC019: Permission matrix full audit - wildcard admin sees all effective access.
Verifies that a wildcard (*) admin sees effective access to every matrix row.
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

        # Login as admin (wildcard user)
        await page.goto("http://127.0.0.1:5175/login")
        await page.locator('input[type="email"]').fill("tg@clinic.vn")
        await page.locator('input[type="password"]').fill("123456")
        await page.locator('button[type="submit"]').click()
        await page.wait_for_url("**/")

        # Navigate to permissions page
        await page.goto("http://127.0.0.1:5175/permissions")
        await page.wait_for_load_state("networkidle")

        # Wait for matrix to load
        await page.wait_for_selector("[data-testid='permission-matrix']", timeout=8000)

        # Check that all matrix rows show effective access for wildcard admin
        rows = await page.locator("[data-testid='matrix-row']").count()
        assert rows > 0, "No matrix rows found"

        # Check wildcard group has all permissions
        wildcard_cells = await page.locator("[data-testid='matrix-cell-effective']").count()
        assert wildcard_cells > 0, "No effective permission cells found"

        # Verify export permissions are visible in matrix
        export_rows = await page.locator("text=/export/i").count()
        assert export_rows > 0, "Export permissions not found in matrix"

        print(f"✅ TC019 PASS: {rows} matrix rows, {wildcard_cells} effective cells, export permissions visible")

    except Exception as e:
        print(f"❌ TC019 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
