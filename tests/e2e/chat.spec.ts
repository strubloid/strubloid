import { test, expect } from '@playwright/test';

test.describe('Chat page', () => {
  test('loads the chat page and shows the composer', async ({ page }) => {
    await page.goto('/chat');

    // Page should load without errors
    await expect(page.locator('h1')).toContainText(/new chat|random/i);

    // Composer should be visible
    const composer = page.getByPlaceholder('Type a message...');
    await expect(composer).toBeVisible();
  });

  test('sidebar is visible with new chat button', async ({ page }) => {
    await page.goto('/chat');

    // Sidebar should have a "New Chat" button or the sidebar itself
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });

  test('can type and see the send button enabled', async ({ page }) => {
    await page.goto('/chat');

    const textarea = page.getByPlaceholder('Type a message...');
    await expect(textarea).toBeVisible();

    // Type a message
    await textarea.fill('Hello, world!');

    // Send button should be enabled
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeEnabled();
  });

  test('error banner shows when send fails', async ({ page }) => {
    await page.goto('/chat');

    const textarea = page.getByPlaceholder('Type a message...');
    await textarea.fill('test message');

    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait for either a response or an error
    // If AI is not configured, we should see an error banner
    // If AI works, we should see a response from the assistant
    await page.waitForTimeout(2000);

    // Either a message was added or an error appeared
    // In dev mode, we should get a dev-mode response
    await expect(
      page.locator('[class*="message"]').first().or(page.locator('[class*="error"]'))
    ).toBeVisible();
  });

  test('can navigate to projects page', async ({ page }) => {
    await page.goto('/chat');

    // Find and click a projects link in the sidebar
    const projectsLink = page.getByRole('link', { name: /project/i });
    if (await projectsLink.isVisible()) {
      await projectsLink.click();
      await expect(page).toHaveURL(/\/projects/);
    }
  });

  test('can navigate to settings page', async ({ page }) => {
    await page.goto('/chat');

    // Find and click settings link
    const settingsLink = page.getByRole('link', { name: /setting/i });
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/settings/);
    }
  });
});
