const { chromium } = require('playwright');

const baseUrl = 'https://nk.2checkin.com';

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill('t@clinic.vn');
  await page.locator('input[type="password"]').fill('123123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  return !page.url().includes('/login');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const ok = await login(page);
  if (!ok) { console.log('Login failed'); await browser.close(); process.exit(1); }
  
  // Get token from localStorage/sessionStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('tgclinic_token') || sessionStorage.getItem('tgclinic_token') || '';
  });
  console.log('Token found:', token ? 'YES (' + token.slice(0, 30) + '...)' : 'NO');
  
  // Call API with token
  const apiResponse = await page.evaluate(async (token) => {
    const res = await fetch('/api/Payments?customerId=6dec35e7-518a-4167-a787-b2f20024c278&type=payments&limit=100&offset=0', {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    return await res.json();
  }, token);
  
  console.log('API Response items count:', apiResponse.items ? apiResponse.items.length : 'N/A');
  console.log('API Response totalItems:', apiResponse.totalItems);
  console.log('API Response items:', JSON.stringify(apiResponse.items, null, 2));
  
  await browser.close();
})();
