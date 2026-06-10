"""TC006 — Admin can create a new TEST_SPRITE customer (NK3-resilient rewrite, 2026-06-10).

Mutation test: NK3 staging only. NK production must NEVER receive this flow.
"""
import asyncio

from playwright.async_api import expect

from _helpers import (
    TestSession,
    login,
    create_customer,
    search_customers,
    unique_suffix,
    TEST_MARKER,
)


async def run_test():
    async with TestSession() as page:
        await login(page)

        name = f"{TEST_MARKER} {unique_suffix()}"
        await create_customer(page, name)

        # The new customer must be findable by search
        await search_customers(page, name)
        row = page.locator("main table tbody tr").first
        await expect(row).to_be_visible(timeout=15000)
        row_text = await row.inner_text()
        assert TEST_MARKER.lower() in row_text.lower(), (
            f"Created customer not found in search results: {row_text!r}"
        )
        print(f"✅ TC006 PASS — created and found customer {name!r}")


asyncio.run(run_test())
