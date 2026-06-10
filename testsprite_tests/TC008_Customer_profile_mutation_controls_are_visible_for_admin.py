"""TC008 — Customer profile mutation controls are visible for admin (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from playwright.async_api import expect

from _helpers import (
    TestSession,
    login,
    search_customers,
    ensure_test_sprite_customer,
    TEST_MARKER,
)


async def run_test():
    async with TestSession() as page:
        await login(page)
        await ensure_test_sprite_customer(page)

        await search_customers(page, TEST_MARKER)
        row = page.locator("main table tbody tr").first
        await expect(row).to_be_visible(timeout=15000)
        await row.locator("td").first.click()
        await page.wait_for_url("**/customers/**", timeout=15000)

        # Admin must see the mutation controls on the profile
        await expect(page.get_by_role("button", name="Edit")).to_be_visible(timeout=15000)
        await expect(page.get_by_role("button", name="Thêm lịch khám")).to_be_visible(
            timeout=15000
        )
        print("✅ TC008 PASS — Edit and Thêm lịch khám controls visible for admin")


asyncio.run(run_test())
