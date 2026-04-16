import { test, expect } from '@playwright/test';
import { request } from '@playwright/test';

test('tooth numbers and comment persist and display on services page', async ({ page, context }) => {
  // 1. Authenticate via API to get a token
  const apiContext = await request.newContext({ baseURL: 'http://localhost:3002' });
  const loginRes = await apiContext.post('/api/Auth/login', {
    data: { email: 'tg@clinic.vn', password: '123456' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();

  // 2. Create a service record via API with tooth data
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
      tooth_comment: 'E2E caries comment',
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const created = await createRes.json();
  expect(created.tooth_numbers).toBe('11,21');
  expect(created.tooth_comment).toBe('E2E caries comment');

  // 3. Seed localStorage token so the SPA is authenticated
  await context.addInitScript((authToken) => {
    localStorage.setItem('tgclinic_token', authToken);
  }, token);

  // 4. Navigate to Services page and verify tooth data is visible without expanding
  await page.goto('/services');
  await page.waitForSelector('text=Services');
  await page.waitForSelector('text=Nguyễn Thị Thanh');
  await page.waitForSelector('text=Tooth: 11, 21');
  await page.waitForSelector('text=E2E caries comment');

  // 5. Reload and verify persistence
  await page.reload();
  await page.waitForSelector('text=Services');
  await page.waitForSelector('text=Tooth: 11, 21');
  await page.waitForSelector('text=E2E caries comment');

  // Cleanup
  await apiContext.dispose();
});
