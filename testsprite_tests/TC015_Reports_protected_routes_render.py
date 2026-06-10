"""TC015 — Reports protected routes render (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from _helpers import TestSession, login, goto, assert_no_access_denied

REPORT_ROUTES = [
    "/reports/dashboard",
    "/reports/revenue",
    "/reports/appointments",
    "/reports/doctors",
    "/reports/customers",
    "/reports/locations",
    "/reports/services",
    "/reports/employees",
]


async def run_test():
    async with TestSession() as page:
        await login(page)
        for route in REPORT_ROUTES:
            await goto(page, route, settle=2.0)
            await assert_no_access_denied(page, route)
            headings = await page.locator("main h1, main h2, main h3").count()
            assert headings > 0, f"No headings rendered on {route} — blank page?"
        print(f"✅ TC015 PASS — {len(REPORT_ROUTES)} report routes render")


asyncio.run(run_test())
