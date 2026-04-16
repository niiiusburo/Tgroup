import { test, expect } from '@playwright/test';
import { request } from '@playwright/test';

test('create service with tooth comment via UI form', async ({ page, context }) => {
  // Authenticate via API
  const apiContext = await request.newContext({ baseURL: 'http://localhost:3002' });
  const loginRes = await apiContext.post('/api/Auth/login', {
    data: { email: 'tg@clinic.vn', password: '123456' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();

  await context.addInitScript((authToken: string) => {
    localStorage.setItem('tgclinic_token', authToken);
  }, token);

  await page.goto('/services');
  await page.waitForSelector('text=Services', { timeout: 15000 });

  // Click New Service
  await page.click('text=New Service');
  await page.waitForSelector('text=Tạo hồ sơ dịch vụ điều trị mới');

  const modal = page.locator('.modal-content');

  // Service catalog
  await modal.locator('input').first().click();
  await page.waitForTimeout(300);
  await page.keyboard.type('Trám');
  await page.waitForTimeout(500);
  await page.locator('text=Trám răng').first().click({ force: true });

  // Customer
  await modal.locator('input').nth(1).click();
  await page.waitForTimeout(300);
  await page.keyboard.type('Nguyễn Thị Thanh');
  await page.waitForTimeout(500);
  await page.locator('text=Nguyễn Thị Thanh').first().click({ force: true });

  // Doctor
  await modal.locator('input').nth(2).click();
  await page.waitForTimeout(300);
  await page.keyboard.type('Nguyễn');
  await page.waitForTimeout(500);
  await page.locator('text=Nguyễn Thị Thanh').first().click({ force: true });

  // Location
  await modal.locator('select').first().selectOption({ label: 'Tấm Dentist Quận 3' });

  // Start date
  await modal.locator('input[type="date"]').first().fill('2026-04-16');

  // Pick teeth
  await page.click('button:has-text("Chọn răng")');
  await page.waitForSelector('text=Chọn răng');
  await page.click('button:has-text("11")');
  await page.click('button:has-text("21")');
  await page.click('text=Lưu');

  // Add tooth comment
  await modal.locator('textarea').first().fill('Test caries comment');

  // Save
  await page.click('button:has-text("Tạo dịch vụ")');

  // Verify
  await page.waitForSelector('text=Tooth: 11, 21');
  await page.waitForSelector('text=Test caries comment');

  await apiContext.dispose();
});

test('edit service tooth comment via UI form', async ({ page, context }) => {
  // Authenticate via API
  const apiContext = await request.newContext({ baseURL: 'http://localhost:3002' });
  const loginRes = await apiContext.post('/api/Auth/login', {
    data: { email: 'tg@clinic.vn', password: '123456' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();

  // Create a service via API
  const createRes = await apiContext.post('/api/SaleOrders', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      partnerid: 'e9fd09c2-e3be-4c59-88e0-b1030040130f',
      partnername: 'Nguyễn Thị Thanh',
      companyid: 'c6b4b453-d260-46d4-4fd9-08db24f7ae8e',
      productid: '468fa1df-5ebb-4aa6-82cf-b05b00a64ed3',
      productname: 'Trám răng',
      doctorid: 'e9fd09c2-e3be-4c59-88e0-b1030040130f',
      doctorname: 'Nguyễn Thị Thanh',
      amounttotal: 100000,
      datestart: '2026-04-16',
      dateend: '2026-04-16',
      notes: 'E2E test notes',
      tooth_numbers: '11,21',
      tooth_comment: 'Original comment',
    },
  });
  expect(createRes.ok()).toBeTruthy();

  await context.addInitScript((authToken: string) => {
    localStorage.setItem('tgclinic_token', authToken);
  }, token);

  await page.goto('/services');
  await page.waitForSelector('text=Services', { timeout: 15000 });
  await page.waitForSelector('text=Original comment');

  // Expand the card to reveal the Edit button
  await page.click('text=Original comment');
  await page.waitForSelector('text=Edit');
  await page.click('text=Edit');
  await page.waitForSelector('text=Cập nhật thông tin điều trị');

  const modal = page.locator('.modal-content');

  // Verify pre-filled tooth comment
  const toothCommentValue = await modal.locator('textarea').first().inputValue();
  expect(toothCommentValue).toBe('Original comment');

  // Change tooth comment
  await modal.locator('textarea').first().fill('Updated comment');

  // Save
  await page.click('button:has-text("Cập nhật")');

  // Verify updated comment appears
  await page.waitForSelector('text=Updated comment');

  await apiContext.dispose();
});
