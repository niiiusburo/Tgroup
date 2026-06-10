"""TC004 — Admin can access core guarded pages (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from _helpers import TestSession, login, goto, assert_no_access_denied

ROUTES = [
    "/",
    "/calendar",
    "/customers",
    "/service-catalog",
    "/payment",
    "/employees",
    "/reports/dashboard",
    "/settings",
    "/permissions",
]


async def run_test():
    async with TestSession() as page:
        await login(page)
        for route in ROUTES:
            await goto(page, route)
            await assert_no_access_denied(page, route)
        print(f"✅ TC004 PASS — {len(ROUTES)} guarded routes render without Access Denied")


asyncio.run(run_test())
