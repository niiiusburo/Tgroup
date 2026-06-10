"""TC011 — Employee creation works for TEST_SPRITE employee (NK3-resilient rewrite, 2026-06-10).

Mutation test: NK3 staging only. NK production must NEVER receive this flow.
"""
import asyncio

from playwright.async_api import expect

from _helpers import (
    TestSession,
    login,
    create_testsprite_employee,
    search_employees,
)


async def run_test():
    async with TestSession() as page:
        await login(page)

        name = await create_testsprite_employee(page)

        # The new employee must be findable by search
        await search_employees(page, name)
        row = page.locator("main table tbody tr").first
        await expect(row).to_be_visible(timeout=15000)
        row_text = await row.inner_text()
        assert name.lower() in row_text.lower(), (
            f"Created employee {name!r} not found in search results: {row_text!r}"
        )
        print(f"✅ TC011 PASS — created and found employee {name!r}")


asyncio.run(run_test())
