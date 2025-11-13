import { test, expect } from '@playwright/test';

test.describe('Web Todo Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('textbox', { name: /token/i }).fill('ghp_test_token_123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Todos')).toBeVisible();
  });

  test('should display todo list', async ({ page }) => {
    await expect(page.getByRole('list', { name: /todos/i })).toBeVisible();
  });

  test('should create a new todo', async ({ page }) => {
    // Click add todo button
    await page.getByRole('button', { name: /add todo/i }).click();
    
    // Fill in todo details
    await page.getByRole('textbox', { name: /title/i }).fill('Test Web Todo');
    await page.getByRole('textbox', { name: /description/i }).fill('Testing from Playwright');
    
    // Save todo
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify todo appears
    await expect(page.getByText('Test Web Todo')).toBeVisible();
  });

  test('should mark todo as complete', async ({ page }) => {
    // Find first todo checkbox
    const checkbox = page.getByRole('checkbox').first();
    await checkbox.check();
    
    // Verify checkbox is checked
    await expect(checkbox).toBeChecked();
  });

  test('should edit a todo', async ({ page }) => {
    // Click on first todo
    await page.getByRole('listitem').first().click();
    
    // Click edit button
    await page.getByRole('button', { name: /edit/i }).click();
    
    // Modify title
    const titleInput = page.getByRole('textbox', { name: /title/i });
    await titleInput.clear();
    await titleInput.fill('Updated Web Todo');
    
    // Save changes
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify changes
    await expect(page.getByText('Updated Web Todo')).toBeVisible();
  });

  test('should delete a todo', async ({ page }) => {
    // Click on first todo
    await page.getByRole('listitem').first().click();
    
    // Click delete button
    await page.getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion if modal appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Verify todo is removed
    // This is a basic check - adjust based on your actual implementation
    await expect(page.getByText('Todo deleted')).toBeVisible();
  });

  test('should filter todos by status', async ({ page }) => {
    // Click on "Active" filter
    await page.getByRole('button', { name: /active/i }).click();
    
    // Verify only active todos are shown
    const completedTodos = page.getByRole('listitem').filter({ has: page.getByRole('checkbox', { checked: true }) });
    await expect(completedTodos).toHaveCount(0);
  });

  test('should search todos', async ({ page }) => {
    // Enter search term
    await page.getByRole('searchbox', { name: /search/i }).fill('test');
    
    // Verify filtered results
    await expect(page.getByRole('listitem')).toContainText('test');
  });
});
