"""TC016 — Payment page renders without submitting money actions (NK3-resilient rewrite, 2026-06-10).

Read-only: renders the payment surfaces and asserts controls exist. No money
action is clicked. NK production must NEVER receive payment mutations anyway.
"""
import asyncio

from playwright.async_api import expect

from _helpers import TestSession, login, goto, assert_no_access_denied


async def run_test():
    async with TestSession() as page:
        await login(page)
        await goto(page, "/payment", settle=2.5)
        await assert_no_access_denied(page, "/payment")

        await expect(
            page.get_by_role("heading", name="Thanh toán").first
        ).to_be_visible(timeout=15000)
        await expect(
            page.get_by_role("button", name="Thanh toán & Ví")
        ).to_be_visible(timeout=15000)
        await expect(
            page.get_by_role("button", name="Kế hoạch trả góp")
        ).to_be_visible(timeout=15000)
        await expect(
            page.get_by_placeholder("Tìm thanh toán...")
        ).to_be_visible(timeout=15000)

        # Data table renders (read-only check)
        rows = await page.locator("main table tbody tr").count()
        assert rows > 0, "Payment table rendered no rows"
        print(f"✅ TC016 PASS — payment page renders {rows} rows; no money action touched")


asyncio.run(run_test())
