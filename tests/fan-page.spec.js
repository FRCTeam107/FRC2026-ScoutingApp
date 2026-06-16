import { test, expect } from '@playwright/test';

test.describe('Fan Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads and shows the Team 107 header', async ({ page }) => {
    await expect(page.getByRole('link', { name: /team 107 scouting/i })).toBeVisible();
  });

  test('renders the fan page content area', async ({ page }) => {
    // The main content container should be present
    await expect(page.locator('.fan-page')).toBeVisible();
  });

  test('shows a Scouting nav link', async ({ page }) => {
    const scoutingLink = page.locator('.scouting-nav-link');
    await expect(scoutingLink).toBeVisible();
  });

  test('navigates to scouting area when Scouting link is clicked', async ({ page }) => {
    await page.locator('.scouting-nav-link').click();
    // Should land on /scouting and show the password gate
    await expect(page).toHaveURL(/\/scouting/);
  });

  test('/fan redirects to /', async ({ page }) => {
    await page.goto('/fan');
    await expect(page).toHaveURL('/');
  });
});
