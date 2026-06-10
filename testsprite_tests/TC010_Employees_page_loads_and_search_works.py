"""TC010 — Employees page loads and search works (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from playwright.async_api import expect

from _helpers import TestSession, login, goto, search_employees, EMPLOYEE_SEARCH


async def run_test():
    async with TestSession() as page:
        await login(page)
        await goto(page, "/employees")

        # Page shell renders
        await expect(
            page.get_by_role("heading", name="Nhân viên").first
        ).to_be_visible(timeout=15000)
        rows = page.locator("main table tbody tr")
        await expect(rows.first).to_be_visible(timeout=15000)

        # Take a real name fragment from the first row and search for it
        first_cell = (await rows.first.locator("td").nth(0).inner_text()).strip()
        if len(first_cell) < 3:
            first_cell = (await rows.first.locator("td").nth(1).inner_text()).strip()
        query = first_cell.split("\n")[0][:12].strip()
        assert len(query) >= 2, f"Could not derive a search query from row: {first_cell!r}"

        await search_employees(page, query)
        filtered = page.locator("main table tbody tr")
        await expect(filtered.first).to_be_visible(timeout=15000)

        # Search box kept its value and the page did not crash
        value = await page.locator(EMPLOYEE_SEARCH).input_value()
        assert value == query, f"Search input lost its value: {value!r} != {query!r}"
        print(f"✅ TC010 PASS — employees page renders; search {query!r} returns rows")


asyncio.run(run_test())
