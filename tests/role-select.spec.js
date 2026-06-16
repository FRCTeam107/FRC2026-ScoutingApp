import { test, expect } from '@playwright/test';

// Helper: bypass the password gate by injecting the session flag directly.
async function bypassAuth(page) {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('scouting_auth', '1'));
}

test.describe('Role Select Page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/scouting');
  });

  test('shows Team 107 heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /frc team 107/i })).toBeVisible();
  });

  test('shows the 2026 season heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /2026/i })).toBeVisible();
  });

  test('shows the Load Event button when no event is loaded', async ({ page }) => {
    // Clear any stored event
    await page.evaluate(() => localStorage.removeItem('current_event'));
    await page.reload();
    await expect(page.getByRole('button', { name: /load event/i })).toBeVisible();
  });

  test('opens the event picker modal when Load Event is clicked', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('current_event'));
    await page.reload();
    await page.getByRole('button', { name: /load event/i }).click();
    // Event picker renders with class epm-overlay (not modal-overlay)
    await expect(page.locator('.epm-overlay')).toBeVisible();
  });

  test('shows role navigation buttons', async ({ page }) => {
    // At least one role link / card should be rendered
    const roleLinks = page.getByRole('link');
    await expect(roleLinks.first()).toBeVisible();
  });

  test('Switch Role link is absent on the scouting home page', async ({ page }) => {
    // The "Switch Role" back-link only appears on sub-pages, not on /scouting itself
    await expect(page.getByRole('link', { name: /switch role/i })).not.toBeVisible();
  });
});

test.describe('Header navigation (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
  });

  test('logo links back to /', async ({ page }) => {
    await page.goto('/scouting');
    await page.getByRole('link', { name: /team 107 scouting/i }).click();
    await expect(page).toHaveURL('/');
  });
});
