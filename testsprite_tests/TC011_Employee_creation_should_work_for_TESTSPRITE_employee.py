import asyncio
from playwright import async_api
from playwright.async_api import expect
from credentials import get_live_site_credentials

async def run_test():
    live_email, live_password = get_live_site_credentials()
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://127.0.0.1:5175
        await page.goto("http://127.0.0.1:5175")

        # -> Fill the email and password fields and submit the login form.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div[2]/div/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(live_email)

        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div[2]/div/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill(live_password)

        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div[2]/div/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()

        # -> Navigate to the Employees page by clicking the 'Nhân viên' menu item, then wait for the page to load.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/aside/nav/div[2]/div/div/div[2]/a').nth(0)
        await asyncio.sleep(3); await elem.click()

        # -> Click the 'Thêm nhân viên' (Add Employee) button to open the new employee form.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()

        # -> Fill the employee form fields (name, phone, email, password) and then open the 'Vị trí / Vai trò' (Role) select so options are revealed (stop after opening to let the UI update).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div[4]/div[2]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('TESTSPRITE Employee 20260504_01')

        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div[4]/div[2]/form/div[2]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('0970001234')

        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div[4]/div[2]/form/div[2]/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('testsprite+20260504_01@example.com')

        # -> Fill the password field and open the 'Vị trí / Vai trò' (Role) selector so role options are revealed. (Stop after opening to let the UI update.)
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div[4]/div[2]/form/div[3]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill(live_password)

        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div[4]/div[2]/form/div[7]/select').nth(0)
        await asyncio.sleep(3); await elem.click()

        # -> Click the 'Thêm nhân viên' (Add employee) submit button to create the TESTSPRITE employee, then observe the UI/API response for success or errors.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/main/div/div[4]/div[2]/form/div[9]/button[2]').nth(0)
        await asyncio.sleep(3); await elem.click()

        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Thêm nhân viên thành công')]").nth(0).is_visible(), "The application should show Thêm nhân viên thành công after adding the employee"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
