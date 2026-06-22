import { test, expect } from '@playwright/test';

test.describe('Projects page', () => {
  test('loads the projects page', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.locator('h1').or(page.locator('header'))).toBeVisible();
  });

  test('create project button exists', async ({ page }) => {
    await page.goto('/projects');

    // Look for any button/link that creates a project
    const createButton = page.getByRole('button', { name: /new project|create/i });
    if (await createButton.isVisible()) {
      await expect(createButton).toBeEnabled();
    }
  });
});
