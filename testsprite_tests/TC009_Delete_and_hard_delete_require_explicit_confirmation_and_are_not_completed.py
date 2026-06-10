"""TC009 — Delete requires explicit confirmation and is not completed (NK3-resilient rewrite, 2026-06-10).

Clicks the row delete button, asserts the confirmation overlay appears, cancels,
and verifies the row survives. No destructive action is completed.
"""
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
        rows = page.locator("main table tbody tr")
        await expect(rows.first).to_be_visible(timeout=15000)
        count_before = await rows.count()

        # Trigger delete on the first (TEST_SPRITE) row
        await rows.first.locator('button[title="Xóa"]').click()

        # Confirmation overlay must appear and offer a cancel path
        cancel = page.get_by_role("button", name="Hủy", exact=True)
        await expect(cancel).to_be_visible(timeout=10000)
        body = await page.evaluate("() => document.body.innerText")
        assert "Xóa khách hàng" in body, "Delete confirmation text not shown"

        # Cancel — nothing must be deleted
        await cancel.click()
        await asyncio.sleep(2)
        count_after = await page.locator("main table tbody tr").count()
        assert count_after == count_before, (
            f"Row count changed after cancelled delete: {count_before} -> {count_after}"
        )
        print("✅ TC009 PASS — delete demands confirmation; cancel preserves the row")


asyncio.run(run_test())
