const { chromium } = require('playwright');
const fs = require('fs');

const baseUrl = 'https://nk.2checkin.com';

const customers = [
  { id: '6dec35e7-518a-4167-a787-b2f20024c278', ref: 'T049843', name: 'VÕ NGỌC PHƯƠNG NGÂN', expectedPayments: 1, expectedAmounts: ['1.500.000'] },
  { id: 'a0ab02db-1c4b-4b11-94d5-b30000bdb55b', ref: 'T050355', name: 'CAO THỊ TUYẾT MAI', expectedPayments: 3, expectedAmounts: ['7.100.000', '700.000', '300.000'] },
  { id: '6758fbf0-a5b6-456f-af7b-b28d00355c5d', ref: 'T045937', name: 'ĐỖ NGỌC BÍCH', expectedPayments: 4, expectedAmounts: ['5.800.000', '1.500.000', '2.000.000', '1.000.000'] },
  { id: '34364319-9ae7-45ad-8d52-b29000640d8a', ref: 'T046059', name: 'NGUYỄN THỊ DUNG', expectedPayments: 5, expectedAmounts: ['5.800.000', '300.000', '500.000', '89.000', '600.000'] },
  { id: '1b5048c4-80e9-47e3-b4f6-b2f6009db59b', ref: '11252', name: 'VÕ THỊ HỒNG HẠNH', expectedPayments: 8, expectedAmounts: ['5.900.000', '900.000', '700.000', '1.800.000', '300.000', '200.000', '300.000', '2.000.000'] },
  { id: '9bd3be59-310d-4961-b4de-b373006e3072', ref: 'T054935', name: 'TRƯƠNG NHẬT PHƯƠNG NGUYÊN', expectedPayments: 2, expectedAmounts: ['1.500.000', '2.100.000'] },
  { id: '6e7cfa13-8cfc-403d-9307-b31600e4d06f', ref: 'T051377', name: 'NGUYỄN PHẠM MỸ DUYÊN', expectedPayments: 2, expectedAmounts: ['5.800.000', '600.000'] },
  { id: '962ef59e-0218-4826-8248-b2d600893a65', ref: 'T048631', name: 'NGUYỄN THỊ KIỀU', expectedPayments: 2, expectedAmounts: ['1.200.000', '300.000'] },
  { id: '87185a41-9730-40ec-85d4-b33d0104d187', ref: 'T053016', name: 'TRẦN HẢI MY', expectedPayments: 1, expectedAmounts: ['600.000'] },
  { id: 'd1d81696-aa75-4916-8e23-b27f002de693', ref: 'T045156', name: 'PHẠM CÔNG QUANG TRƯỜNG', expectedPayments: 1, expectedAmounts: ['5.000.000'] },
];

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill('t@clinic.vn');
  await page.locator('input[type="password"]').fill('123123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  return !page.url().includes('/login');
}

async function checkCustomer(page, customer) {
  console.log(`\n=== ${customer.ref} | ${customer.name} ===`);
  await page.goto(`${baseUrl}/customers/${customer.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Click Thanh toán tab
  const allLinks = await page.locator('a, button').all();
  for (const link of allLinks) {
    const text = await link.textContent().catch(() => '');
    if (text.includes('Thanh toán')) {
      await link.click();
      await page.waitForTimeout(3000);
      break;
    }
  }
  
  const bodyText = await page.locator('body').innerText();
  const hasNoPayment = bodyText.includes('Không có dữ liệu') || bodyText.includes('Chưa có thanh toán') || bodyText.includes('no payment');
  const historyHeader = bodyText.match(/Lịch sử thanh toán\s*\((\d+)\)/);
  const paymentCount = historyHeader ? parseInt(historyHeader[1]) : 0;
  
  const foundAmounts = [];
  for (const amt of customer.expectedAmounts) {
    if (bodyText.includes(amt)) foundAmounts.push(amt);
  }
  
  console.log(`Payment count badge: ${paymentCount}`);
  console.log(`Has 'no data' text: ${hasNoPayment}`);
  console.log(`Expected amounts found: ${foundAmounts.length}/${customer.expectedAmounts.length}`);
  console.log(`Missing amounts: ${customer.expectedAmounts.filter(a => !foundAmounts.includes(a)).join(', ')}`);
  
  const screenshotPath = `/tmp/nk-verify-${customer.ref}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  return { paymentCount, hasNoPayment, foundAmounts };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const ok = await login(page);
  if (!ok) { console.log('Login failed'); await browser.close(); process.exit(1); }
  
  const results = [];
  for (const c of customers) {
    const result = await checkCustomer(page, c);
    results.push({ ...c, ...result });
  }
  
  await browser.close();
  
  console.log('\n\n=== VERIFICATION SUMMARY ===');
  for (const r of results) {
    const status = r.paymentCount === r.expectedPayments && !r.hasNoPayment ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${r.ref} | ${r.name} | Expected: ${r.expectedPayments} | Found: ${r.paymentCount}`);
  }
  
  // Save summary to file
  fs.writeFileSync('/tmp/verification_summary.json', JSON.stringify(results, null, 2));
  console.log('\nDetailed results saved to /tmp/verification_summary.json');
})();
