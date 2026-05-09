import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

// Auth setup saves storageState for the `localhost` origin.
const BASE = 'http://localhost:5175';

async function getFirstCustomerSearchToken(page: any): Promise<string> {
  await page.goto(`${BASE}/customers`);
  await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

  // Wait for any row-like content to appear.
  await page.waitForTimeout(1500);

  const bodyText = await page.locator('#root').innerText();
  const codeMatch = bodyText.match(/\bT\d{3,}\b/);
  if (codeMatch?.[0]) return codeMatch[0];

  // Fallback: use first non-empty line as a search token.
  const firstLine = bodyText
    .split('\n')
    .map((l: string) => l.trim())
    .find((l: string) => l.length >= 3 && !/^(customers|khach hang)$/i.test(l));

  return firstLine ?? 'T';
}

test('Customer search works in Calendar add-appointment modal', async ({ page }) => {
  const token = await getFirstCustomerSearchToken(page);

  await page.goto(`${BASE}/calendar`);
  await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

  // Open the shared appointment form modal (create mode).
  const addBtn = page
    .getByRole('button', { name: /Add Appointment|Thêm lịch hẹn|Lịch hẹn/i })
    .first();
  await addBtn.click();

  // Open customer selector dropdown.
  const customerSelectBtn = page
    .getByRole('button', { name: /Chọn khách hàng|Select customer/i })
    .first();
  await customerSelectBtn.click();

  const searchInput = page.getByPlaceholder(/Tìm theo tên, mã KH, SĐT, email/i).first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill(token);

  // Expect at least one option to show up after remote search debounce.
  const anyOption = page.locator('button', { hasText: new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
  await expect(anyOption).toBeVisible({ timeout: 15000 });
});

