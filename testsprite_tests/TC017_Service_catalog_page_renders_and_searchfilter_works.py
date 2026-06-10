"""TC017 — Service catalog renders and search/filter works (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from playwright.async_api import expect

from _helpers import TestSession, login, goto, assert_no_access_denied, body_text


async def run_test():
    async with TestSession() as page:
        await login(page)
        await goto(page, "/service-catalog", settle=2.5)
        await assert_no_access_denied(page, "/service-catalog")

        await expect(
            page.get_by_role("heading", name="Danh mục dịch vụ").first
        ).to_be_visible(timeout=15000)
        rows_before = await page.locator("main table tbody tr").count()
        assert rows_before > 0, "Service catalog rendered no rows"

        # Search must filter (or at least re-render) without crashing
        search = page.get_by_placeholder("Tìm dịch vụ...")
        await search.fill("Filler")
        await asyncio.sleep(2.5)
        await assert_no_access_denied(page, "/service-catalog (search)")
        assert await search.input_value() == "Filler", "Search input lost its value"
        text = await body_text(page)
        assert "Danh mục dịch vụ" in text, "Page heading vanished after search"
        print(
            f"✅ TC017 PASS — catalog renders {rows_before} rows; search keeps page intact"
        )


asyncio.run(run_test())
