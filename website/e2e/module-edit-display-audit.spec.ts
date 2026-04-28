/**
 * E2E: Module Edit/Display Audit
 *
 * Field-level audit for bugs where a save succeeds, but another read path
 * fails to return or display the saved field.
 *
 * Local prerequisites:
 * - Frontend: http://localhost:5175
 * - API: http://localhost:3002
 */

import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const BASE = (process.env.E2E_BASE_URL ?? 'http://localhost:5175').replace(/\/$/, '');
const API_BASE = (
  process.env.E2E_API_BASE_URL ??
  (BASE.includes('localhost:5175') ? 'http://localhost:3002' : BASE)
).replace(/\/$/, '');
const ADMIN_EMAIL = 'tg@clinic.vn';
const ADMIN_PASSWORD = '123456';
const IS_PRODUCTION_LIKE = /^https:\/\/nk\.2checkin\.com/i.test(BASE);
const ALLOW_MUTATION = process.env.E2E_ALLOW_MUTATION === '1';

type Paginated<T> = {
  items: T[];
  totalItems?: number;
};

type ApiCustomer = {
  id: string;
  name: string;
  phone: string | null;
  note?: string | null;
  companyid?: string | null;
};

type ApiCompany = {
  id: string;
  name: string;
};

type ApiEmployee = {
  id: string;
  name: string;
};

type ApiProduct = {
  id: string;
  name: string;
  listprice?: string | number | null;
  companyid?: string | null;
};

type ApiSaleOrder = {
  id: string;
  code: string | null;
  name: string | null;
  partnerid: string | null;
  productid: string | null;
  productname: string | null;
  doctorid: string | null;
  doctorname: string | null;
  assistantid: string | null;
  assistantname: string | null;
  dentalaideid: string | null;
  dentalaidename: string | null;
  notes: string | null;
};

type ApiSaleOrderLine = {
  orderid: string | null;
  ordercode: string | null;
  productid: string | null;
  productname: string | null;
  doctorname: string | null;
  assistantname: string | null;
  dentalaidename: string | null;
  note: string | null;
};

async function createAuthedApi() {
  const api = await request.newContext({ baseURL: API_BASE });
  const login = await api.post('/api/Auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  await expect(login, await login.text()).toBeOK();
  const { token } = await login.json() as { token: string };
  return { api, token };
}

async function apiJson<T>(api: APIRequestContext, method: 'get' | 'post' | 'put' | 'patch', url: string, token: string, data?: unknown) {
  const res = await api[method](url, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  await expect(res, await res.text()).toBeOK();
  return await res.json() as T;
}

async function seedAuth(page: Page, token: string) {
  await page.addInitScript((authToken) => {
    localStorage.setItem('tgclinic_token', authToken);
  }, token);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createQaCustomer(api: APIRequestContext, token: string, companyId: string | null, runId: string) {
  return apiJson<ApiCustomer>(api, 'post', '/api/Partners', token, {
    name: `QA Field Audit ${runId}`,
    phone: `09${runId.slice(-8)}`,
    email: `qa-field-audit-${runId}@example.test`,
    companyid: companyId,
    gender: 'other',
    note: `QA initial note ${runId}`,
    customer: true,
    status: true,
  });
}

async function updateCustomerNote(api: APIRequestContext, token: string, customer: ApiCustomer, note: string) {
  return apiJson<ApiCustomer>(api, 'put', `/api/Partners/${customer.id}`, token, {
    name: customer.name,
    phone: customer.phone,
    companyid: customer.companyid ?? null,
    note,
  });
}

async function createQaSaleOrder(api: APIRequestContext, token: string, data: {
  customer: ApiCustomer;
  companyId: string | null;
  product: ApiProduct;
  doctor: ApiEmployee;
  assistant: ApiEmployee;
  dentalAide: ApiEmployee;
  note: string;
}) {
  return apiJson<ApiSaleOrder>(api, 'post', '/api/SaleOrders', token, {
    partnerid: data.customer.id,
    partnername: data.customer.name,
    companyid: data.companyId,
    productid: data.product.id,
    productname: data.product.name,
    doctorid: data.doctor.id,
    assistantid: data.assistant.id,
    dentalaideid: data.dentalAide.id,
    quantity: 1,
    unit: 'Lần',
    amounttotal: 125000,
    datestart: '2026-04-28',
    dateend: '2026-04-28',
    notes: data.note,
    tooth_numbers: '11,21',
    tooth_comment: `QA tooth ${data.note}`,
  });
}

async function getFixtureData(api: APIRequestContext, token: string) {
  const companies = await apiJson<Paginated<ApiCompany>>(api, 'get', '/api/Companies', token);
  const doctors = await apiJson<Paginated<ApiEmployee>>(api, 'get', '/api/Employees?isDoctor=true&active=true&limit=10', token);
  const assistants = await apiJson<Paginated<ApiEmployee>>(api, 'get', '/api/Employees?isAssistant=true&active=true&limit=10', token);
  const products = await apiJson<Paginated<ApiProduct>>(api, 'get', '/api/Products?active=true&limit=10', token);

  const company = companies.items[0] ?? null;
  const doctor = doctors.items[0] ?? null;
  const assistant = assistants.items[0] ?? null;
  const dentalAide = assistants.items.find((item) => item.id !== assistant?.id) ?? null;
  const product = products.items[0] ?? null;

  expect(company, 'Need at least one company for QA customer/service setup').toBeTruthy();
  expect(doctor, 'Need at least one doctor for staff field audit').toBeTruthy();
  expect(assistant, 'Need at least one assistant for staff field audit').toBeTruthy();
  expect(dentalAide, 'Need a second assistant/doctor-assistant so assistant and dental aide display checks are distinct').toBeTruthy();
  expect(product, 'Need at least one service catalog product for QA sale order setup').toBeTruthy();

  return {
    company: company!,
    doctor: doctor!,
    assistant: assistant!,
    dentalAide: dentalAide!,
    product: product!,
  };
}

async function openCustomerProfile(page: Page, phone: string) {
  await page.goto(BASE);
  const emailInput = page.locator('#email');
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(emailInput).toBeHidden({ timeout: 15000 });
  }

  await page.locator('a[href="/customers"]').first().click();
  await expect(page.locator('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 10000 });

  // TODO: Replace placeholder matching once the customer search input has a stable test id.
  // Current selector depends on translated placeholder text and can break on copy-only i18n changes.
  const search = page.getByPlaceholder(/search|tìm|Tìm/i).first();
  await expect(search).toBeVisible({ timeout: 10000 });
  await search.fill(phone);
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await page.getByRole('cell', { name: phone }).first().click();
  await expect(page.getByRole('heading', { name: /Customer Profile|Hồ sơ khách hàng/i })).toBeVisible({ timeout: 15000 });
}

async function openRecordsTab(page: Page) {
  // TODO: Replace broad Records/Phiếu khám matching once profile tabs expose test ids.
  // Current selector is intentionally bilingual because active locale is user-configurable.
  const recordsTab = page.locator('button').filter({ hasText: /Records|Phiếu khám|Lịch sử/i }).first();
  await expect(recordsTab).toBeVisible({ timeout: 10000 });
  await recordsTab.click();
  await expect(page.getByText(/Service History|Lịch sử dịch vụ/i).first()).toBeVisible({ timeout: 10000 });
}

test.describe('module edit/display audit for QA records', () => {
  test.skip(
    IS_PRODUCTION_LIKE && !ALLOW_MUTATION,
    'This audit creates QA customer/service records. Set E2E_ALLOW_MUTATION=1 to run it against live.',
  );

  test('customer note save is returned by detail UI after navigation and reload', async ({ page }) => {
    const { api, token } = await createAuthedApi();
    await seedAuth(page, token);

    try {
      const { company } = await getFixtureData(api, token);
      const runId = String(Date.now());
      const customer = await createQaCustomer(api, token, company.id, runId);
      const savedNote = `QA note persisted ${runId}`;

      await updateCustomerNote(api, token, customer, savedNote);
      await openCustomerProfile(page, customer.phone ?? '');
      await expect(page.getByText(savedNote)).toBeVisible({ timeout: 10000 });

      await page.reload();
      await openCustomerProfile(page, customer.phone ?? '');
      await expect(page.getByText(savedNote)).toBeVisible({ timeout: 10000 });

      const detail = await apiJson<ApiCustomer>(api, 'get', `/api/Partners/${customer.id}`, token);
      expect(detail.note).toBe(savedNote);

      await updateCustomerNote(api, token, customer, '');
      await openCustomerProfile(page, customer.phone ?? '');
      await expect(page.getByText(savedNote, { exact: true })).toHaveCount(0);

      const clearedDetail = await apiJson<ApiCustomer>(api, 'get', `/api/Partners/${customer.id}`, token);
      expect(clearedDetail.note ?? '').toBe('');
    } finally {
      await api.dispose();
    }
  });

  test('service staff fields are returned by list/line APIs and visible in customer records', async ({ page }) => {
    const { api, token } = await createAuthedApi();
    await seedAuth(page, token);

    try {
      const fixtures = await getFixtureData(api, token);
      const runId = String(Date.now());
      const customer = await createQaCustomer(api, token, fixtures.company.id, runId);
      const serviceNote = `QA service staff audit ${runId}`;

      const created = await createQaSaleOrder(api, token, {
        customer,
        companyId: fixtures.company.id,
        product: fixtures.product,
        doctor: fixtures.doctor,
        assistant: fixtures.assistant,
        dentalAide: fixtures.dentalAide,
        note: serviceNote,
      });

      expect(created.doctorid).toBe(fixtures.doctor.id);
      expect(created.assistantid).toBe(fixtures.assistant.id);
      expect(created.dentalaideid).toBe(fixtures.dentalAide.id);

      const orders = await apiJson<Paginated<ApiSaleOrder>>(
        api,
        'get',
        `/api/SaleOrders?partner_id=${customer.id}&limit=20`,
        token,
      );
      const order = orders.items.find((item) => item.id === created.id);
      expect(order?.doctorname).toBe(fixtures.doctor.name);
      expect(order?.assistantname).toBe(fixtures.assistant.name);
      expect(order?.dentalaidename).toBe(fixtures.dentalAide.name);
      expect(order?.notes).toBe(serviceNote);

      const lines = await apiJson<Paginated<ApiSaleOrderLine>>(
        api,
        'get',
        `/api/SaleOrders/lines?partner_id=${customer.id}&limit=20`,
        token,
      );
      const line = lines.items.find((item) => item.orderid === created.id);
      expect(line?.productname).toBe(fixtures.product.name);
      expect(line?.doctorname).toBe(fixtures.doctor.name);
      expect(line?.assistantname).toBe(fixtures.assistant.name);
      expect(line?.dentalaidename).toBe(fixtures.dentalAide.name);
      expect(line?.note).toBe(serviceNote);

      await openCustomerProfile(page, customer.phone ?? '');
      await openRecordsTab(page);
      const serviceRow = page.locator('tbody tr').filter({
        hasText: line?.ordercode ?? created.code ?? fixtures.product.name,
      }).first();
      await expect(serviceRow).toBeVisible({ timeout: 10000 });
      await expect(serviceRow).toContainText(fixtures.product.name);
      await expect(serviceRow).toContainText(fixtures.doctor.name);
      await expect(serviceRow).toContainText(new RegExp(`Phụ tá:\\s*${escapeRegExp(fixtures.assistant.name)}`));
      await expect(serviceRow).toContainText(new RegExp(`Trợ lý BS:\\s*${escapeRegExp(fixtures.dentalAide.name)}`));
    } finally {
      await api.dispose();
    }
  });
});
