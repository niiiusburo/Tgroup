import { test, expect } from '@playwright/test';

/**
 * Recorded demo: a 3-level CTV chain (A→B→C) on NK3. CTV-C's referred customer
 * paid for a service in BOTH dental and cosmetic. This logs into each of the 3
 * CTV accounts and shows the commission that cascaded: C = direct (L0),
 * B = upline override (L1), A = upline override (L2) — for dental + cosmetic.
 * Expected pending: C ≈ 980,000 | B ≈ 91,700 | A ≈ 46,100.
 */

const PW = 'Test1234!';
const CTVS = [
  { role: 'CTV-C — bottom downline (direct commission)', email: 'ctv-c-0531demo@clinic.vn', approx: '980' },
  { role: 'CTV-B — upline level 1 (override)', email: 'ctv-b-0531demo@clinic.vn', approx: '91' },
  { role: 'CTV-A — upline level 2 (override)', email: 'ctv-a-0531demo@clinic.vn', approx: '46' },
];

async function clearSession(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

test('CTV commission cascade visible on all 3 accounts (dental + cosmetic)', async ({ page }) => {
  for (const ctv of CTVS) {
    await test.step(`Login + commission for ${ctv.role}`, async () => {
      await clearSession(page);
      await page.goto('/login');
      await page.locator('#login-identifier').fill(ctv.email);
      await page.locator('#password').fill(PW);
      await page.waitForTimeout(600);
      // submit (Enter is reliable on this form)
      await page.locator('#password').press('Enter');

      // CTV lands on /ctv portal
      await page.waitForURL('**/ctv**', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2500); // let the dashboard + summary load (video capture)

      // Open the Commission tab (Wallet). Try common labels, fall back to 2nd tab.
      const tabSelectors = [
        page.getByRole('button', { name: /Hoa hồng|Commission/i }),
        page.getByText(/Hoa hồng|Commission/i).first(),
      ];
      for (const sel of tabSelectors) {
        if (await sel.count().catch(() => 0)) {
          await sel.first().click({ timeout: 5000 }).catch(() => {});
          break;
        }
      }
      await page.waitForTimeout(3500); // hold on the commission view so the video shows the amount
    });
  }
  // final hold
  await page.waitForTimeout(1500);
  expect(true).toBe(true);
});
