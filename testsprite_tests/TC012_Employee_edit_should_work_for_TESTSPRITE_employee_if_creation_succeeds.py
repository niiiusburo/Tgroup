"""TC012 — Employee edit works for TEST_SPRITE employee (NK3-resilient rewrite, 2026-06-10).

Creates a fresh TEST_SPRITE employee (guaranteeing row identity), then edits it.
Mutation test: NK3 staging only. NK production must NEVER receive this flow.

Note: searched rows render a plain "Sửa" text button (no title attribute),
unlike the unfiltered table — locate by text, scoped to the matched row.
"""
import asyncio

from playwright.async_api import expect

from _helpers import (
    TestSession,
    login,
    create_testsprite_employee,
    find_employee_row,
    search_employees,
    unique_suffix,
    TEST_MARKER,
)


async def run_test():
    async with TestSession() as page:
        await login(page)

        name = await create_testsprite_employee(page)
        row = await find_employee_row(page, name)

        # Open the row's edit form
        await row.locator('button:has-text("Sửa")').first.click()
        name_input = page.get_by_placeholder("Nhập họ và tên")
        await name_input.wait_for(state="visible", timeout=10000)

        new_name = f"{TEST_MARKER} Emp {unique_suffix()} EDITED"
        await name_input.fill(new_name)
        save = page.locator(
            'button:has-text("Cập nhật"), button:has-text("Lưu")'
        ).last
        await expect(save).to_be_enabled(timeout=10000)
        await save.click()
        await name_input.wait_for(state="hidden", timeout=15000)

        # The renamed employee must be findable
        await find_employee_row(page, new_name)
        print(f"✅ TC012 PASS — employee {name!r} renamed to {new_name!r}")


asyncio.run(run_test())
