"""TC002 — Logout clears session (NK3-resilient rewrite, 2026-06-10)."""
import asyncio

from _helpers import TestSession, login, logout, goto


async def run_test():
    async with TestSession() as page:
        await login(page)

        # Logout via the sidebar button (title="Đăng xuất")
        await logout(page)
        assert "/login" in page.url, f"Expected /login after logout, got {page.url}"

        # A protected route must now redirect back to login
        await goto(page, "/customers")
        assert "/login" in page.url, (
            f"Protected route did not redirect to login after logout: {page.url}"
        )
        print("✅ TC002 PASS — logout clears session and protects routes")


asyncio.run(run_test())
