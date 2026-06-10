"""Shared resilient helpers for TestSprite TC scripts.

Grounded in the live NK3 (tmv.2checkin.com) DOM, 2026-06-10:
  - Login form: #login-identifier (type=text), #password, button[type=submit]
  - Sidebar: <aside> with logout button[title="Đăng xuất"]; nav links carry hrefs
  - List pages expose stable Vietnamese placeholder texts for search inputs
  - Customer create modal: "Họ và tên" / "0901 111 222" / save "Lưu"
  - Customer edit form: same fields, save "Cập nhật"
  - Employee create modal: "Nhập họ và tên/số điện thoại/email/mật khẩu",
    submit "Thêm nhân viên" (disabled until required fields are valid)
  - Delete confirm: fixed overlay with "Hủy" / "Xóa" buttons

Replaces the brittle absolute-XPath locators in the original generated
scripts, which broke whenever layout shifted (e.g. the collapsed-sidebar
lg:ml-[72px] wrapper).
"""
import asyncio
import os
import time

from playwright import async_api
from playwright.async_api import expect

BASE_URL = os.environ.get("TESTSPRITE_BASE_URL", "http://127.0.0.1:5175")
ADMIN_ID = os.environ.get("TESTSPRITE_ADMIN_ID", "t@clinic.vn")
ADMIN_PW = os.environ.get("TESTSPRITE_ADMIN_PW", "123123")

LAUNCH_ARGS = [
    "--window-size=1280,720",
    "--disable-dev-shm-usage",
    "--ipc=host",
    "--single-process",
]

# Marker prefix for any data the suite creates on staging. NK3 is the
# Lane-B mutation target; NK production must NEVER receive these flows.
TEST_MARKER = "TEST_SPRITE"


class TestSession:
    """Async context manager yielding a ready Playwright page."""

    def __init__(self, timeout_ms: int = 15000):
        self.timeout_ms = timeout_ms
        self.pw = None
        self.browser = None
        self.context = None
        self.page = None

    async def __aenter__(self):
        self.pw = await async_api.async_playwright().start()
        self.browser = await self.pw.chromium.launch(headless=True, args=LAUNCH_ARGS)
        self.context = await self.browser.new_context()
        self.context.set_default_timeout(self.timeout_ms)
        self.page = await self.context.new_page()
        return self.page

    async def __aexit__(self, exc_type, exc, tb):
        for closer in (
            getattr(self.context, "close", None),
            getattr(self.browser, "close", None),
            getattr(self.pw, "stop", None),
        ):
            if closer:
                try:
                    await closer()
                except Exception:
                    pass
        return False


async def login(page, identifier: str = ADMIN_ID, password: str = ADMIN_PW):
    """Authenticate and wait for the app shell (sidebar) to appear."""
    await page.goto(f"{BASE_URL}/login")
    await page.locator("#login-identifier").fill(identifier)
    await page.locator("#password").fill(password)
    await page.locator('button[type="submit"]').click()
    await page.locator("aside").wait_for(state="visible", timeout=20000)


async def logout(page):
    """Click the sidebar logout button and wait for /login."""
    await page.locator('aside button[title="Đăng xuất"]').click()
    await page.wait_for_url("**/login**", timeout=15000)


async def goto(page, path: str, settle: float = 1.5):
    """Direct SPA navigation with a settle delay for data fetches."""
    await page.goto(f"{BASE_URL}{path}")
    await page.wait_for_load_state("domcontentloaded")
    await asyncio.sleep(settle)


async def body_text(page) -> str:
    return await page.evaluate("() => document.body.innerText")


async def assert_no_access_denied(page, path: str = ""):
    text = await body_text(page)
    where = path or page.url
    assert "Access Denied" not in text, f"'Access Denied' shown on {where}"
    assert "/login" not in page.url, f"Redirected to login on {where}"


def unique_phone() -> str:
    """Unique-ish VN mobile number per invocation."""
    return "09" + str(int(time.time() * 100) % 10**8).zfill(8)


def unique_suffix() -> str:
    return str(int(time.time() * 10))[-7:]


# ---------------------------------------------------------------- customers

CUSTOMER_SEARCH = 'input[placeholder="Tìm kiếm khách hàng..."]'


async def search_customers(page, query: str):
    await goto(page, "/customers")
    box = page.locator(CUSTOMER_SEARCH)
    await box.wait_for(state="visible")
    await box.fill(query)
    await asyncio.sleep(2)  # debounce + fetch


async def create_customer(page, name: str) -> str:
    """Create a customer via the Add Customer modal. Returns the name."""
    await goto(page, "/customers")
    await page.get_by_role("button", name="Add Customer").click()
    name_input = page.get_by_placeholder("Họ và tên")
    await name_input.wait_for(state="visible")
    await name_input.fill(name)
    await page.get_by_placeholder("0901 111 222").fill(unique_phone())
    save = page.get_by_role("button", name="Lưu")
    await expect(save).to_be_enabled(timeout=10000)
    await save.click()
    await name_input.wait_for(state="hidden", timeout=15000)
    return name


async def ensure_test_sprite_customer(page) -> str:
    """Find a TEST_SPRITE customer, creating one if none exists.

    Returns the visible name of the row to operate on.
    """
    await search_customers(page, TEST_MARKER)
    rows = page.locator("main table tbody tr")
    if await rows.count() > 0:
        first_text = (await rows.first.inner_text()).strip()
        if TEST_MARKER.lower() in first_text.lower():
            return TEST_MARKER
    name = f"{TEST_MARKER} {unique_suffix()}"
    await create_customer(page, name)
    await search_customers(page, TEST_MARKER)
    await expect(page.locator("main table tbody tr").first).to_be_visible(timeout=15000)
    return name


# ---------------------------------------------------------------- employees

EMPLOYEE_SEARCH = 'input[placeholder="Tìm kiếm nhân viên..."]'


async def search_employees(page, query: str):
    await goto(page, "/employees")
    box = page.locator(EMPLOYEE_SEARCH)
    await box.wait_for(state="visible")
    await box.fill(query)
    await asyncio.sleep(2)


async def open_employee_create_modal(page):
    """Open the Thêm nhân viên modal; returns the modal submit locator.

    Header opener and modal submit share the label; exactly two text matches
    exist with the modal (body portal) last. Text locator is deterministic
    here where role-based matching proved flaky on the disabled submit.
    """
    await goto(page, "/employees")
    await page.locator('button:has-text("Thêm nhân viên")').first.click()
    await page.get_by_placeholder("Nhập họ và tên").wait_for(state="visible")
    return page.locator('button:has-text("Thêm nhân viên")').last


async def create_testsprite_employee(page, name: str | None = None) -> str:
    """Create a TESTSPRITE-marked employee. Returns the name used."""
    suffix = unique_suffix()
    name = name or f"{TEST_MARKER} Emp {suffix}"
    submit = await open_employee_create_modal(page)
    await page.get_by_placeholder("Nhập họ và tên").fill(name)
    await page.get_by_placeholder("Nhập số điện thoại").fill(unique_phone())
    await page.get_by_placeholder("Nhập email").fill(f"ts{suffix}@example.com")
    await page.get_by_placeholder("Nhập mật khẩu").fill("Test123456!")
    await expect(submit).to_be_enabled(timeout=10000)
    await submit.click()
    await page.get_by_placeholder("Nhập họ và tên").wait_for(state="hidden", timeout=15000)
    return name


async def find_employee_row(page, name: str):
    """Search for an employee by exact name; returns the matching row locator."""
    await search_employees(page, name)
    row = page.locator("main table tbody tr").filter(has_text=name).first
    await expect(row).to_be_visible(timeout=15000)
    return row
