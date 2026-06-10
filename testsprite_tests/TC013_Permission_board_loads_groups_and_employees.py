"""TC013 — Permission board loads groups and employees (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from playwright.async_api import expect

from _helpers import TestSession, login, goto, assert_no_access_denied, body_text


async def run_test():
    async with TestSession() as page:
        await login(page)
        await goto(page, "/permissions", settle=2.5)
        await assert_no_access_denied(page, "/permissions")

        # Search input and known permission group render
        await expect(
            page.get_by_placeholder("Search employees, tiers, locations...")
        ).to_be_visible(timeout=15000)
        text = await body_text(page)
        assert "Super Admin" in text, "Expected 'Super Admin' group on permission board"

        # Permission Matrix tab opens without crashing
        await page.get_by_role("button", name="Permission Matrix").click()
        await asyncio.sleep(2.5)
        await assert_no_access_denied(page, "/permissions (matrix tab)")
        matrix_text = await body_text(page)
        assert len(matrix_text) > 100, "Permission Matrix tab rendered an empty page"
        print("✅ TC013 PASS — permission board renders groups and matrix tab")


asyncio.run(run_test())
