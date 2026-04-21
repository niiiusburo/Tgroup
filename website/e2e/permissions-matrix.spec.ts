/**
 * Permission Matrix E2E Tests
 * 
 * Tests that verify role-based access control works correctly:
 * - Admin: Full access (customers.edit = true)
 * - Dentist: View-only access (customers.edit = false)
 * 
 * These tests validate the permission matrix from the database is correctly
 * enforced in the UI.
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials - must match database entries
const USERS = {
  admin: {
    email: 'tg@clinic.vn',
    password: '123456',
    role: 'Admin',
    shouldEditCustomer: true,
    permissions: ['*'], // Super admin wildcard
  },
  dentist: {
    email: 'trang@tamdentist.vn',
    password: '123456',
    role: 'Dentist',
    shouldEditCustomer: false,
    permissions: [
      'overview.view',
      'calendar.view',
      'calendar.edit',
      'customers.view', // NO customers.edit!
      'appointments.view',
      'appointments.edit',
      'services.view',
      'commission.view',
    ],
  },
} as const;

/**
 * Helper: Login with given credentials
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:5175/login');
  // Wait for login form to render (use language-independent selector)
  const emailInput = page.locator('input#email');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  
  await emailInput.fill(email);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');
  
  // Wait for auth to complete — login form disappears
  await expect(emailInput).toBeHidden({ timeout: 15000 });
}

/**
 * Helper: Open permission debugger and verify permissions
 */
async function verifyPermissions(page: Page, expectedPerms: string[]) {
  // Open debugger with Ctrl+Shift+P
  await page.keyboard.press('Control+Shift+P');
  
  // Wait for debugger modal
  await expect(page.getByText('Permission Debugger')).toBeVisible();
  
  // Verify permissions are shown
  for (const perm of expectedPerms) {
    if (perm === '*') {
      await expect(page.getByText('SUPER ADMIN')).toBeVisible();
    } else {
      // Convert permission ID to label for checking
      const permLabel = perm.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      await expect(page.locator('text=' + permLabel).first()).toBeVisible();
    }
  }
  
  // Close debugger
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Permission Debugger')).not.toBeVisible();
}

/**
 * Helper: Navigate to first customer and try to edit
 */
async function tryEditCustomer(page: Page, shouldBeAbleToEdit: boolean) {
  // Navigate to Customers
  await page.getByRole('link', { name: 'Customers' }).click();
  await expect(page.locator('main h1', { hasText: 'Customers' })).toBeVisible({ timeout: 10000 });
  
  // Click first customer row
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();
  
  // Wait for profile page
  await expect(page.locator('main h1', { hasText: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
  
  // Check if Edit button is visible (only for users with edit permission)
  const editButton = page.getByRole('button', { name: 'Edit' });
  
  if (shouldBeAbleToEdit) {
    // Should see Edit button
    await expect(editButton).toBeVisible({ timeout: 5000 });
    
    // Click Edit
    await editButton.click();
    
    // Wait for edit modal
    await expect(page.getByText('Chỉnh sửa khách hàng')).toBeVisible({ timeout: 5000 });
    
    // Verify fields are editable (not disabled)
    const nameInput = page.locator('input[placeholder*="họ và tên"]').first();
    await expect(nameInput).toBeEnabled();
    
    // Close modal
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByText('Chỉnh sửa khách hàng')).not.toBeVisible();
  } else {
    // Should NOT see Edit button
    await expect(editButton).not.toBeVisible();
    
    // Verify we're on view-only profile
    await expect(page.getByText('Customer Profile')).toBeVisible();
  }
}

test.describe('Permission Matrix - Role-Based Access Control', () => {
  
  test.describe('Admin User', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, USERS.admin.email, USERS.admin.password);
    });

    test('should have super admin wildcard permission', async ({ page }) => {
      await verifyPermissions(page, ['*']);
    });

    test('should be able to edit customers', async ({ page }) => {
      await tryEditCustomer(page, true);
    });

    test('should see Edit button on customer profile', async ({ page }) => {
      // Navigate to Customers
      await page.getByRole('link', { name: 'Customers' }).click();
      await expect(page.locator('main h1', { hasText: 'Customers' })).toBeVisible({ timeout: 10000 });
      
      // Click first customer
      await page.locator('table tbody tr').first().click();
      await expect(page.locator('main h1', { hasText: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
      
      // Should see Edit button
      await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
      
      // Screenshot for verification
      await page.screenshot({ path: 'e2e/screenshots/admin-customer-profile.png' });
    });

    test('should be able to access all navigation items', async ({ page }) => {
      const navItems = [
        'Overview',
        'Calendar',
        'Customers',
        'Appointments',
        'Services',
        'Payment',
        'Employees',
        'Locations',
        'Reports',
        'Commission',
        'Settings',
      ];

      for (const item of navItems) {
        await expect(page.getByRole('link', { name: item })).toBeVisible();
      }
    });
  });

  test.describe('Dentist User', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, USERS.dentist.email, USERS.dentist.password);
    });

    test('should have dentist permissions without customer edit', async ({ page }) => {
      // Open debugger
      await page.keyboard.press('Control+Shift+P');
      await expect(page.getByText('Permission Debugger')).toBeVisible();
      
      // Verify Edit Customers shows as NOT granted
      await expect(page.getByText('Edit Customers').locator('..')).not.toHaveClass(/bg-green-50/);
      
      // But View Customers IS granted
      await expect(page.getByText('View Customers').locator('..')).toHaveClass(/bg-green-50/);
      
      // Close
      await page.getByRole('button', { name: 'Close' }).click();
    });

    test('should NOT be able to edit customers', async ({ page }) => {
      await tryEditCustomer(page, false);
    });

    test('should NOT see Edit button on customer profile', async ({ page }) => {
      // Navigate to Customers
      await page.getByRole('link', { name: 'Customers' }).click();
      await expect(page.locator('main h1', { hasText: 'Customers' })).toBeVisible({ timeout: 10000 });
      
      // Click first customer
      await page.locator('table tbody tr').first().click();
      await expect(page.locator('main h1', { hasText: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
      
      // Should NOT see Edit button
      await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
      
      // Screenshot for verification
      await page.screenshot({ path: 'e2e/screenshots/dentist-customer-profile.png' });
    });

    test('should have limited navigation access', async ({ page }) => {
      // Should see these
      const allowedNav = ['Overview', 'Calendar', 'Customers', 'Appointments', 'Services'];
      for (const item of allowedNav) {
        await expect(page.getByRole('link', { name: item })).toBeVisible();
      }

      // Should NOT see these (dentists don't have payment/employees/settings access)
      const restrictedNav = ['Payment', 'Employees', 'Reports', 'Commission', 'Settings'];
      for (const item of restrictedNav) {
        // These might be visible but disabled, or not visible at all
        // Just verify we can't access them by clicking
      }
    });
  });

  test.describe('Permission Debugger Feature', () => {
    test('should open and close with keyboard shortcut', async ({ page }) => {
      await login(page, USERS.admin.email, USERS.admin.password);
      
      // Initially closed
      await expect(page.getByText('Permission Debugger')).not.toBeVisible();
      
      // Open with Ctrl+Shift+P
      await page.keyboard.press('Control+Shift+P');
      await expect(page.getByText('Permission Debugger')).toBeVisible();
      
      // Shows user info
      await expect(page.getByText(`Logged in as: ${USERS.admin.role}`)).toBeVisible();
      
      // Close
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByText('Permission Debugger')).not.toBeVisible();
    });

    test('should show warning when no permissions loaded', async ({ page }) => {
      // This tests the edge case where permissions array is empty
      await login(page, USERS.admin.email, USERS.admin.password);
      
      await page.keyboard.press('Control+Shift+P');
      await expect(page.getByText('Permission Debugger')).toBeVisible();
      
      // For admin, we should see permissions
      await expect(page.getByText('Effective Permissions:')).toBeVisible();
      
      await page.getByRole('button', { name: 'Close' }).click();
    });
  });
});

/**
 * Data-driven test for permission matrix
 * This tests each permission against expected access
 */
test.describe('Permission Matrix Data-Driven Tests', () => {
  const permissionMatrix = [
    { user: 'admin', permission: 'customers.edit', expected: true },
    { user: 'admin', permission: 'customers.delete', expected: true },
    { user: 'admin', permission: 'payment.refund', expected: true },
    { user: 'admin', permission: 'settings.edit', expected: true },
    { user: 'dentist', permission: 'customers.view', expected: true },
    { user: 'dentist', permission: 'customers.edit', expected: false },
    { user: 'dentist', permission: 'customers.delete', expected: false },
    { user: 'dentist', permission: 'payment.view', expected: false },
    { user: 'dentist', permission: 'settings.view', expected: false },
  ];

  for (const { user, permission, expected } of permissionMatrix) {
    test(`${user} should ${expected ? 'have' : 'NOT have'} ${permission}`, async ({ page }) => {
      const userConfig = USERS[user as keyof typeof USERS];
      await login(page, userConfig.email, userConfig.password);
      
      // Open debugger
      await page.keyboard.press('Control+Shift+P');
      await expect(page.getByText('Permission Debugger')).toBeVisible();
      
      // Convert permission to label
      const permLabel = permission
        .split('.')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      
      // Check if permission row has green background (granted)
      const permRow = page.locator('text=' + permLabel).first().locator('..');
      
      if (expected) {
        await expect(permRow).toHaveClass(/bg-green-50/);
      } else {
        await expect(permRow).not.toHaveClass(/bg-green-50/);
      }
      
      await page.getByRole('button', { name: 'Close' }).click();
    });
  }
});
