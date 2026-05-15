"""
TC004 v2: Admin can access core guarded pages - uses href-based navigation.
"""
import asyncio
from playwright.async_api import async_playwright

PAGES = [
    ("/", "Tổng quan"),
    ("/calendar", "Lịch"),
    ("/customers", "Khách hàng"),
    ("/services", "Dịch vụ"),
    ("/service-catalog", "Danh mục dịch vụ"),
    ("/payment", "Kế hoạch thanh toán"),
    ("/employees", "Nhân viên"),
    ("/reports/dashboard", "Báo cáo"),
    ("/settings", "Cài đặt"),
    ("/permissions", "Quyền hạn"),
]

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

        failures = []
        for path, name in PAGES:
            try:
                await page.goto(f"http://127.0.0.1:5175{path}")
                await page.wait_for_load_state("networkidle")
                # Wait longer for React app to initialize auth state
                await asyncio.sleep(2)

                content = await page.content()
                lower = content.lower()
                # Check for actual access denied message (not just in HTML but visible)
                access_denied = page.locator("text='Không có quyền truy cập', text='Access Denied', text='403'").first
                if await access_denied.count() > 0 and await access_denied.is_visible():
                    failures.append(f"{name} ({path}): Access Denied")
                    continue

                # Also check raw content as fallback
                if "không có quyền truy cập" in lower or "access denied" in lower:
                    # Double-check it's actually visible (not just in script tags)
                    visible_text = await page.evaluate("() => document.body.innerText")
                    if "không có quyền" in visible_text.lower() or "access denied" in visible_text.lower():
                        failures.append(f"{name} ({path}): Access Denied")
                        continue

                # Verify body loaded
                body = page.locator("body")
                if await body.count() == 0:
                    failures.append(f"{name} ({path}): Body not found")
                    continue

                print(f"  ✅ {name}")
            except Exception as e:
                failures.append(f"{name} ({path}): {str(e)[:80]}")

        if failures:
            raise AssertionError("Failed pages:\n" + "\n".join(f"    - {f}" for f in failures))

        print(f"✅ TC004 PASS: All {len(PAGES)} guarded pages accessible")

    except Exception as e:
        print(f"❌ TC004 FAIL: {e}")
        raise
    finally:
        if browser: await browser.close()
        if pw: await pw.stop()

asyncio.run(run_test())
