import { test, expect } from '@playwright/test';

async function bypassAuth(page) {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('scouting_auth', '1'));
}

test.describe('Match Scout Page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/match');
  });

  test('renders the match scouting form', async ({ page }) => {
    await expect(page.locator('.match-scout-page')).toBeVisible();
  });

  test('shows a mode toggle (Auton / Teleop)', async ({ page }) => {
    // The form uses separate Auto and Teleop stages rather than a single toggle widget.
    // Enter a team number to enable the Start button, then advance to the Auto stage.
    await page.locator('input[type="number"]').first().fill('107');
    await page.getByRole('button', { name: /start match/i }).click();
    await expect(page.getByRole('heading', { name: /auto period/i })).toBeVisible();
  });

  test('shows the climb selector section', async ({ page }) => {
    // ClimbSelector only renders after the match is started
    await page.locator('input[type="number"]').first().fill('107');
    await page.getByRole('button', { name: /start match/i }).click();
    await expect(page.locator('.climb-selector').first()).toBeVisible();
  });

  test('accuracy slider is present', async ({ page }) => {
    // AccuracySlider only renders after the match is started
    await page.locator('input[type="number"]').first().fill('107');
    await page.getByRole('button', { name: /start match/i }).click();
    await expect(page.locator('input[type="range"]').first()).toBeVisible();
  });

  test('Switch Role header link is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /switch role/i })).toBeVisible();
  });
});

test.describe('Pit Scout Page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/pit');
  });

  test('renders the pit scouting form', async ({ page }) => {
    await expect(page.locator('.pit-scout-page')).toBeVisible();
  });

  test('Switch Role header link is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /switch role/i })).toBeVisible();
  });
});
