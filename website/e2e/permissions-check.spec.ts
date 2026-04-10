import { test, expect } from '@playwright/test';

test('Permissions page loads for admin', async ({ page }) => {
  await page.goto('http://localhost:5174/permissions');
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  
  const header = await page.locator('header h1').textContent();
  console.log('Header:', header);
  
  const body = await page.textContent('body');
  console.log('Body length:', body?.length);
  
  // Check for Access Denied
  const denied = await page.getByText('Access Denied').isVisible().catch(() => false);
  console.log('Access Denied:', denied);
  
  // Check for actual content
  const hasPermission = body?.toLowerCase().includes('permission');
  const hasGroup = body?.toLowerCase().includes('group');
  const hasAdmin = body?.toLowerCase().includes('admin');
  
  expect(denied).toBeFalsy();
  expect(header).toBe('Permissions');
  console.log(`Has permission: ${hasPermission}, Has group: ${hasGroup}, Has admin: ${hasAdmin}`);
});
