import { test, expect } from '@playwright/test';

test.describe('Web Authentication Flow', () => {
  test('should show login screen when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Check for login screen elements
    await expect(page.getByText('Welcome to syss.la')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /token/i })).toBeVisible();
  });

  test('should allow user to login with personal access token', async ({ page }) => {
    await page.goto('/');
    
    // Enter token
    await page.getByRole('textbox', { name: /token/i }).fill('ghp_test_token_123');
    
    // Click login button
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should navigate to main app
    await expect(page.getByText('Todos')).toBeVisible();
  });

  test('should persist authentication in localStorage', async ({ page, context }) => {
    await page.goto('/');
    
    // Login
    await page.getByRole('textbox', { name: /token/i }).fill('ghp_test_token_123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for navigation
    await expect(page.getByText('Todos')).toBeVisible();
    
    // Create new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/');
    
    // Should still be authenticated
    await expect(newPage.getByText('Todos')).toBeVisible();
  });

  test('should allow user to logout', async ({ page }) => {
    await page.goto('/');
    
    // Login first
    await page.getByRole('textbox', { name: /token/i }).fill('ghp_test_token_123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Todos')).toBeVisible();
    
    // Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click();
    
    // Click logout
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Should return to login screen
    await expect(page.getByText('Welcome to syss.la')).toBeVisible();
  });
});
