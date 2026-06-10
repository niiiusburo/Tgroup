"""TC014 — Employee create failure does not break permission surfaces (NK3-resilient rewrite, 2026-06-10).

Submits the employee create form with required fields missing: the create must
not complete (modal stays open; native required-field validation blocks it),
and the permission surfaces must still render afterwards.
"""
import asyncio

from _helpers import (
    TestSession,
    login,
    goto,
    open_employee_create_modal,
    assert_no_access_denied,
    body_text,
)


async def run_test():
    async with TestSession() as page:
        await login(page)

        # Invalid create attempt: name only, then submit
        submit = await open_employee_create_modal(page)
        name_input = page.get_by_placeholder("Nhập họ và tên")
        await name_input.fill("TEST_SPRITE incomplete")
        await asyncio.sleep(1.0)
        await submit.click()
        await asyncio.sleep(3.0)

        # Create must NOT have completed — the modal stays open
        assert await name_input.is_visible(), (
            "Modal closed on incomplete submit — invalid employee create went through"
        )
        await page.get_by_role("button", name="Hủy bỏ").click()
        await name_input.wait_for(state="hidden", timeout=10000)

        # Permission surfaces must be intact after the failed attempt
        await goto(page, "/permissions", settle=2.5)
        await assert_no_access_denied(page, "/permissions")
        text = await body_text(page)
        assert "Super Admin" in text, "Permission board broken after failed create"
        print("✅ TC014 PASS — failed employee create leaves permission surfaces intact")


asyncio.run(run_test())
