"""TC007 — Admin can edit the existing TEST_SPRITE customer (NK3-resilient rewrite, 2026-06-10).

Mutation test: NK3 staging only. NK production must NEVER receive this flow.
"""
import asyncio

from playwright.async_api import expect

from _helpers import (
    TestSession,
    login,
    search_customers,
    ensure_test_sprite_customer,
    unique_suffix,
    TEST_MARKER,
)


async def run_test():
    async with TestSession() as page:
        await login(page)
        await ensure_test_sprite_customer(page)

        # Open the TEST_SPRITE customer profile
        await search_customers(page, TEST_MARKER)
        row = page.locator("main table tbody tr").first
        await expect(row).to_be_visible(timeout=15000)
        await row.locator("td").first.click()
        await page.wait_for_url("**/customers/**", timeout=15000)

        # Enter edit mode and rename
        await page.get_by_role("button", name="Edit").click()
        name_input = page.get_by_placeholder("Họ và tên")
        await name_input.wait_for(state="visible", timeout=10000)
        new_name = f"{TEST_MARKER} {unique_suffix()} EDITED"
        await name_input.fill(new_name)

        save = page.get_by_role("button", name="Cập nhật")
        await expect(save).to_be_enabled(timeout=10000)
        await save.click()
        await asyncio.sleep(3)  # save roundtrip + re-render

        body = await page.evaluate("() => document.body.innerText")
        assert new_name in body, (
            f"Updated name {new_name!r} not visible on profile after save"
        )
        print(f"✅ TC007 PASS — customer renamed to {new_name!r}")


asyncio.run(run_test())
