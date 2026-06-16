import { test, expect } from '@playwright/test';

// All scouting routes are password-protected. These tests verify that the
// password gate itself works correctly without needing real credentials.

const PROTECTED_ROUTES = ['/scouting', '/pit', '/match', '/analytics', '/drive', '/field', '/admin'];

test.describe('Protected scouting routes', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} shows the password gate`, async ({ page }) => {
      await page.goto(route);
      // Either the "Enter Password" button or the already-open modal must be present
      const passwordGate = page.getByRole('button', { name: /enter password/i })
        .or(page.locator('.modal-overlay'));
      await expect(passwordGate.first()).toBeVisible();
    });
  }

  test('password modal opens when "Enter Password" is clicked', async ({ page }) => {
    await page.goto('/scouting');
    const enterBtn = page.getByRole('button', { name: /enter password/i });
    // Only click if the modal isn't already open (it auto-opens on first visit)
    if (!await page.locator('.modal-content').isVisible()) {
      await enterBtn.click();
    }
    await expect(page.locator('.modal-content')).toBeVisible();
  });

  test('password modal shows an error for a wrong password', async ({ page }) => {
    await page.goto('/scouting');

    const enterBtn = page.getByRole('button', { name: /enter password/i });
    if (!await page.locator('.modal-content').isVisible()) {
      await enterBtn.click();
    }

    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show an error message (network may be slow, so wait up to 5 s)
    await expect(page.locator('.error')).toBeVisible({ timeout: 5_000 });
  });

  test('password modal closes when Cancel is clicked', async ({ page }) => {
    await page.goto('/scouting');

    const enterBtn = page.getByRole('button', { name: /enter password/i });
    if (!await page.locator('.modal-content').isVisible()) {
      await enterBtn.click();
    }

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('.modal-content')).not.toBeVisible();
  });

  test('header Fan View link is present on scouting pages', async ({ page }) => {
    await page.goto('/scouting');
    await expect(page.getByRole('link', { name: /fan view/i })).toBeVisible();
  });

  test('Fan View link returns to /', async ({ page }) => {
    await page.goto('/scouting');
    // Dismiss the password modal first (it auto-opens and its fixed overlay blocks header links)
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.getByRole('link', { name: /fan view/i }).click();
    await expect(page).toHaveURL('/');
  });
});
